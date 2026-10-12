import OpenAI from 'openai';
import env from '../config/env.js';
import { SYSTEM_PROMPT } from './systemPrompt.js';
import { tools } from './tools.js';
import ToolExecutor from './toolExecutor.js';
import { sanitizeOutput } from './guardrails.js';
import { Conversation, Message } from '../models/index.js';
import { aiAuditLogger, logger } from '../utils/logger.js';

const formatDH = (val) => {
  const num = typeof val === 'number' ? val : parseFloat(val) || 0;
  return `${num.toFixed(2).replace('.', ',')} DH`;
};

class AIAgent {
  constructor() {
    this.apiKey = env.DEEPSEEK_API_KEY || env.OPENAI_API_KEY || '';
    this.baseURL = env.DEEPSEEK_BASE_URL || env.OPENAI_BASE_URL || 'https://api.deepseek.com';
    this.model = env.DEEPSEEK_MODEL || env.OPENAI_MODEL || 'deepseek-chat';
    this.client = null;
    this.initClient();
  }

  /**
   * Initialize or refresh the OpenAI/DeepSeek SDK client
   */
  initClient() {
    const isMockOrEmpty = !this.apiKey ||
      this.apiKey.startsWith('your_') ||
      this.apiKey === 'mock-or-valid-openai-key' ||
      this.apiKey === 'mock-or-valid-deepseek-key';

    if (env.NODE_ENV !== 'test' && !isMockOrEmpty) {
      try {
        this.client = new OpenAI({
          apiKey: this.apiKey,
          baseURL: this.baseURL
        });
      } catch (err) {
        logger.warn('Failed to initialize OpenAI client:', err.message);
        this.client = null;
      }
    } else {
      this.client = null;
    }
    return this.client;
  }

  /**
   * Retrieves active LLM client or dynamically updates if credentials change
   */
  getClient() {
    const currentApiKey = env.DEEPSEEK_API_KEY || env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || '';
    const currentBaseURL = env.DEEPSEEK_BASE_URL || env.OPENAI_BASE_URL || process.env.DEEPSEEK_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.deepseek.com';
    const currentModel = env.DEEPSEEK_MODEL || env.OPENAI_MODEL || process.env.DEEPSEEK_MODEL || process.env.OPENAI_MODEL || 'deepseek-chat';

    if (currentApiKey !== this.apiKey || currentBaseURL !== this.baseURL || currentModel !== this.model) {
      this.apiKey = currentApiKey;
      this.baseURL = currentBaseURL;
      this.model = currentModel;
      this.initClient();
    }

    return this.client;
  }

  /**
   * Phase 1: Intent Analysis
   */
  async analyzeIntent({ userMessage, history = [], client }) {
    if (!client) {
      return this.heuristicIntentAnalysis(userMessage);
    }

    const availableToolsSummary = tools.map(t => `- ${t.function.name}: ${t.function.description}`).join('\n');
    const intentPrompt = `You are the intent recognition and tool planning engine for StockMaster AI warehouse management.
Analyze the user's latest query along with conversation context to identify their exact intent and determine which tool(s) must be executed.

Available Tools:
${availableToolsSummary}

Rules:
1. For reorder advice, purchase quantities, or replenishment costs (e.g., 'reorder', 'replenish', 'réapprovisionnement', 'what should I order'), plan 'recommendReorder'. (Priority over low stock).
2. For stock deficits or low inventory alerts, plan 'getLowStockProducts'.
3. If the user wants to add, create, or insert a new product, plan 'createProduct'.
4. If the user searches for items semantically, describes use cases, or looks for products (e.g., cables, chairs, mouse, screens), plan 'vectorSearchProducts'.
5. For specific product details or SKU inquiries, plan 'getProductStock' or 'getProductInfo'.
6. If it's a general greeting or does not require database interaction, provide an empty toolsRequired list.

Respond ONLY with a valid JSON object matching this schema:
{
  "userIntent": "Short description of user goal",
  "toolsRequired": [
    {
      "name": "toolName",
      "args": { ... }
    }
  ],
  "reasoning": "Brief explanation"
}`;

    const messages = [
      { role: 'system', content: intentPrompt },
      ...history.slice(-6).map(m => ({
        role: m.role === 'tool' ? 'system' : m.role,
        content: m.textContent
      })),
      { role: 'user', content: userMessage }
    ];

    try {
      const response = await client.chat.completions.create({
        model: this.model,
        messages,
        response_format: { type: 'json_object' }
      });

      const parsed = JSON.parse(response.choices[0].message.content || '{}');
      return {
        userIntent: parsed.userIntent || 'General query',
        toolsRequired: Array.isArray(parsed.toolsRequired) ? parsed.toolsRequired : [],
        reasoning: parsed.reasoning || ''
      };
    } catch (err) {
      logger.warn('LLM Intent pre-prompt parsing failed, using fallback heuristic:', err.message);
      return this.heuristicIntentAnalysis(userMessage);
    }
  }

  /**
   * Resilient local heuristic intent recognition
   */
  heuristicIntentAnalysis(userMessage) {
    const lower = userMessage.toLowerCase();
    const toolsRequired = [];
    let userIntent = 'General inquiry';

    // 1. Create product intent
    if (
      (lower.includes('créer') || lower.includes('crée') || lower.includes('create') || lower.includes('ajoute') || lower.includes('ajouter')) &&
      (lower.includes('produit') || lower.includes('product') || lower.includes('article') || lower.includes('item'))
    ) {
      userIntent = 'Create new product';
      const priceMatch = userMessage.match(/(?:prix|price|à|at)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
      const nameMatch = userMessage.match(/(?:produit|product|nom|name)\s*[:=]?\s*["']?([^"',\n]+)["']?/i);
      toolsRequired.push({
        name: 'createProduct',
        args: {
          name: nameMatch ? nameMatch[1].trim() : 'Nouveau Produit',
          price: priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : 100,
          quantity: 10,
          minStock: 5,
          categoryName: 'Général',
          description: userMessage
        }
      });
    }
    // 2. Reorder intent
    else if (
      lower.includes('reorder') ||
      lower.includes('replenish') ||
      lower.includes('réapprovisionnement') ||
      lower.includes('reapprovisionnement') ||
      lower.includes('نكوموندي') ||
      (lower.includes('order') && (lower.includes('what') || lower.includes('should'))) ||
      (lower.includes('commander') && lower.includes('stock'))
    ) {
      userIntent = 'Inventory replenishment recommendation';
      toolsRequired.push({ name: 'recommendReorder', args: { limit: 10 } });
    }
    // 3. Low stock intent
    else if (
      (lower.includes('low') && (lower.includes('stock') || lower.includes('inventory'))) ||
      lower.includes('stock bas') ||
      lower.includes('bas stock') ||
      lower.includes('alert') ||
      lower.includes('alerte') ||
      lower.includes('deficit') ||
      lower.includes('rupture') ||
      lower.includes('ناقص') ||
      lower.includes('خصاص')
    ) {
      userIntent = 'Check low stock and stockouts';
      toolsRequired.push({ name: 'getLowStockProducts', args: { limit: 10 } });
    }
    // 4. Vector / Semantic search intent
    else if (
      lower.includes('cherche') ||
      lower.includes('trouve') ||
      lower.includes('search') ||
      lower.includes('find') ||
      lower.includes('vector') ||
      lower.includes('pinecone') ||
      lower.includes('câble') ||
      lower.includes('cable') ||
      lower.includes('souris') ||
      lower.includes('mouse') ||
      lower.includes('keyboard') ||
      lower.includes('clavier') ||
      lower.includes('écran') ||
      lower.includes('screen')
    ) {
      userIntent = 'Semantic vector search for products';
      toolsRequired.push({
        name: 'vectorSearchProducts',
        args: { query: userMessage, limit: 10 }
      });
    }
    // 5. Stock movements
    else if (lower.includes('mouvement') || lower.includes('movement') || lower.includes('historique')) {
      userIntent = 'View recent stock movements';
      toolsRequired.push({ name: 'getStockMovements', args: { limit: 5 } });
    }
    // 6. Specific product info or price
    else if (lower.includes('prix') || lower.includes('price') || lower.includes('combien')) {
      userIntent = 'Product price and stock query';
      toolsRequired.push({
        name: 'vectorSearchProducts',
        args: { query: userMessage, limit: 5 }
      });
    }

    return { userIntent, toolsRequired, reasoning: 'Heuristic pattern match' };
  }

  /**
   * Generate a clean, readable response in French without raw markdown symbols,
   * formatted in Moroccan Dirham (DH).
   */
  generateLocalGroundedResponse({ userMessage, intentResult, toolExecutionResults }) {
    const executedNames = toolExecutionResults.map(t => t.toolName);

    // 1. Reorder recommendations response
    if (executedNames.includes('recommendReorder')) {
      const toolData = toolExecutionResults.find(t => t.toolName === 'recommendReorder')?.result;
      const recs = toolData?.recommendations || [];
      const totalCost = toolData?.totalEstimatedCost || 0;

      let reply = `📋 Reorder Recommendations & Replenishment Plan\n\n`;
      reply += `Voici l'analyse des réapprovisionnements recommandés pour votre entrepôt basée sur les niveaux de stock actuels et les seuils minimaux :\n\n`;

      if (recs.length === 0) {
        reply += `Tous les stocks sont optimaux. Aucun article n'a besoin de réapprovisionnement immédiat.\n`;
      } else {
        reply += `• Nombre d'articles à réapprovisionner : ${recs.length}\n`;
        reply += `• Coût total estimé du réassort : ${formatDH(totalCost)}\n\n`;
        reply += `Détail des commandes suggérées :\n`;

        recs.forEach((item, idx) => {
          const supplierName = item.supplier?.name ? `Fournisseur : ${item.supplier.name}` : 'Fournisseur non assigné';
          reply += `${idx + 1}. ${item.name} (Réf : ${item.reference})\n`;
          reply += `   • Quantité à commander : ${item.suggestedQuantity} unités\n`;
          reply += `   • Stock actuel : ${item.currentQuantity} / Seuil : ${item.minStock}\n`;
          reply += `   • Prix unitaire : ${formatDH(item.unitPrice)} | Coût : ${formatDH(item.estimatedCost)}\n`;
          reply += `   • Priorité : ${item.priority} (${item.urgencyReason})\n`;
          reply += `   • ${supplierName}\n\n`;
        });

        reply += `Les cartes interactives de ces produits sont affichées ci-dessous pour consultation rapide.`;
      }

      return reply;
    }

    // 2. Low stock alert response
    if (executedNames.includes('getLowStockProducts')) {
      const toolData = toolExecutionResults.find(t => t.toolName === 'getLowStockProducts')?.result;
      const products = toolData?.products || [];

      let reply = `⚠️ Alertes de Stock Bas\n\n`;
      if (products.length === 0) {
        reply += `Excellente nouvelle ! Aucun produit n'est actuellement en situation de stock critique ou bas.\n`;
      } else {
        reply += `Actuellement, ${products.length} produit(s) requièrent votre attention car leur stock est sous le seuil de sécurité :\n\n`;
        products.forEach((p, idx) => {
          const status = p.quantity === 0 ? 'Rupture de stock' : 'Stock bas';
          reply += `${idx + 1}. ${p.name} (Réf : ${p.reference})\n`;
          reply += `   • Quantité disponible : ${p.quantity} unités (Seuil : ${p.minStock})\n`;
          reply += `   • Statut : ${status} | Prix : ${formatDH(p.price)}\n\n`;
        });
        reply += `Les produits concernés sont affichés dans la carte ci-dessous.`;
      }

      return reply;
    }

    // 3. Create product response
    if (executedNames.includes('createProduct')) {
      const toolData = toolExecutionResults.find(t => t.toolName === 'createProduct')?.result;
      const prod = toolData?.product;

      let reply = `✅ Produit Créé avec Succès\n\n`;
      if (prod) {
        reply += `Le nouveau produit a été enregistré dans le catalogue StockMaster :\n\n`;
        reply += `• Nom : ${prod.name}\n`;
        reply += `• Référence : ${prod.reference}\n`;
        reply += `• Prix unitaire : ${formatDH(prod.price)}\n`;
        reply += `• Stock initial : ${prod.quantity} unités (Seuil : ${prod.minStock})\n`;
        reply += `• Catégorie : ${prod.category || 'Général'}\n\n`;
        reply += `La fiche produit correspondante est affichée ci-dessous.`;
      } else {
        reply += `L'article a été ajouté avec succès à votre inventaire.`;
      }
      return reply;
    }

    // 4. Product search response (vector or keywords)
    if (executedNames.includes('vectorSearchProducts') || executedNames.includes('searchProducts') || executedNames.includes('getProductInfo') || executedNames.includes('getProductStock')) {
      const toolRes = toolExecutionResults.find(t => t.toolName === 'vectorSearchProducts' || t.toolName === 'searchProducts')?.result;
      const products = toolRes?.products || [];

      let reply = `🔍 Résultats de Recherche de Produits\n\n`;
      if (products.length === 0) {
        reply += `Aucun produit correspondant n'a été trouvé pour votre requête. Vérifiez le mot-clé ou la référence et réessayez.`;
      } else {
        reply += `Voici les produits trouvés dans l'inventaire :\n\n`;
        products.forEach((p, idx) => {
          reply += `${idx + 1}. ${p.name} (Réf : ${p.reference})\n`;
          reply += `   • Prix : ${formatDH(p.price)} | Stock : ${p.quantity} unités (Seuil : ${p.minStock})\n`;
          if (p.description) reply += `   • Description : ${p.description}\n`;
          reply += `\n`;
        });
        reply += `Vous pouvez consulter les détails de chaque produit directement ci-dessous.`;
      }
      return reply;
    }

    // 5. Stock movements response
    if (executedNames.includes('getStockMovements')) {
      const toolData = toolExecutionResults.find(t => t.toolName === 'getStockMovements')?.result;
      const movements = toolData?.movements || [];

      let reply = `📦 Historique des Mouvements de Stock\n\n`;
      if (movements.length === 0) {
        reply += `Aucun mouvement de stock récent n'a été enregistré.`;
      } else {
        movements.forEach((m, idx) => {
          reply += `${idx + 1}. [${m.type}] ${m.quantity} unités de ${m.product} - ${m.reason || 'Mouvement standard'} (${new Date(m.date).toLocaleDateString()})\n`;
        });
      }
      return reply;
    }

    return `Bonjour ! Je suis votre assistant StockMaster AI pour la gestion de l'inventaire. Comment puis-je vous aider aujourd'hui ? Vous pouvez me demander les produits en stock bas, des recommandations de réapprovisionnement, ou rechercher un article.`;
  }

  /**
   * Main chat entry point
   */
  async chat({ userId, userRole, conversationId, message, stream = false, onChunk = null }) {
    const startTime = Date.now();
    const toolsRequested = [];
    const toolsExecuted = [];
    let products = [];
    let createdProduct = null;
    let recommendations = [];

    // 1. Find or create conversation
    let conv;
    if (conversationId) {
      conv = await Conversation.findOne({ where: { id: conversationId, userId } });
      if (!conv) {
        conv = await Conversation.create({
          userId,
          title: message.substring(0, 40) + (message.length > 40 ? '...' : '')
        });
      }
    } else {
      conv = await Conversation.create({
        userId,
        title: message.substring(0, 40) + (message.length > 40 ? '...' : '')
      });
    }

    // 2. Persist user message
    await Message.create({
      conversationId: conv.id,
      role: 'user',
      textContent: message
    });

    // 3. Load conversation history
    const history = await Message.findAll({
      where: { conversationId: conv.id },
      order: [['createdAt', 'ASC']],
      limit: 20
    });

    let finalReply = '';

    try {
      const activeClient = this.getClient();

      // Phase 1: Intent Understanding
      const intentResult = await this.analyzeIntent({
        userMessage: message,
        history,
        client: activeClient
      });

      // Phase 2: Tool Execution
      const toolExecutionResults = [];

      if (intentResult.toolsRequired && intentResult.toolsRequired.length > 0) {
        for (const plannedTool of intentResult.toolsRequired) {
          const toolName = plannedTool.name;
          const toolArgs = plannedTool.args || {};
          toolsRequested.push(toolName);

          try {
            const execResult = await ToolExecutor.execute(toolName, toolArgs, { role: userRole, userId });
            toolsExecuted.push(toolName);

            toolExecutionResults.push({
              toolName,
              args: toolArgs,
              result: execResult
            });

            // Extract structured product data for frontend UI
            if (toolName === 'createProduct' && execResult.product) {
              createdProduct = execResult.product;
              products.push(execResult.product);
            }
            if ((toolName === 'vectorSearchProducts' || toolName === 'searchProducts' || toolName === 'getLowStockProducts') && Array.isArray(execResult.products)) {
              products.push(...execResult.products);
            }
            if (toolName === 'getProductStock' && execResult.found) {
              products.push({
                id: execResult.productId,
                name: execResult.name,
                reference: execResult.reference,
                quantity: execResult.quantity,
                minStock: execResult.minStock,
                price: execResult.price || 0,
                status: execResult.status
              });
            }
            if (toolName === 'getProductInfo' && execResult.found) {
              products.push(execResult.product || {
                id: execResult.id || execResult.productId,
                name: execResult.name,
                reference: execResult.reference,
                quantity: execResult.quantity,
                minStock: execResult.minStock,
                price: execResult.price,
                category: execResult.category?.name || execResult.category,
                supplier: execResult.supplier?.name || execResult.supplier
              });
            }
            if (toolName === 'recommendReorder' && Array.isArray(execResult.recommendations)) {
              recommendations.push(...execResult.recommendations);
              execResult.recommendations.forEach(r => {
                products.push({
                  id: r.productId,
                  name: r.name,
                  reference: r.reference,
                  quantity: r.currentQuantity,
                  minStock: r.minStock,
                  price: r.unitPrice,
                  category: r.category,
                  supplier: r.supplier?.name
                });
              });
            }
          } catch (tErr) {
            logger.error(`Error executing planned tool ${toolName}:`, tErr);
            toolExecutionResults.push({
              toolName,
              args: toolArgs,
              error: tErr.message
            });
          }
        }
      }

      // Deduplicate products by id or reference
      const seenProductKeys = new Set();
      products = products.filter(p => {
        const key = p.id || p.reference || p.name;
        if (!key || seenProductKeys.has(key)) return false;
        seenProductKeys.add(key);
        return true;
      });

      // Phase 3: Response Synthesis
      if (activeClient) {
        try {
          const synthesisSystemPrompt = `${SYSTEM_PROMPT}

You have performed intent analysis and executed the required tools for warehouse operations.
Generate a clear, polite, structured final response to the user in French:
1. Explain what the user asked for in clean natural French.
2. Clearly explain actions performed and outcomes.
3. Ground your answer strictly in the tool execution results below.
4. Format all prices in Moroccan Dirham using 'DH' (e.g., 250,00 DH). NEVER use USD, $ or EUR.
5. Do NOT use raw markdown header tags like '###' or '##'. Keep formatting clean and readable for mobile.

Executed Tool Data:
${JSON.stringify(toolExecutionResults, null, 2)}`;

          const finalMessagesPayload = [
            { role: 'system', content: synthesisSystemPrompt },
            ...history.map(m => ({
              role: m.role === 'tool' ? 'system' : m.role,
              content: m.textContent
            })),
            {
              role: 'system',
              content: `User Intent: ${intentResult.userIntent}\nTool Execution Results: ${JSON.stringify(toolExecutionResults)}`
            }
          ];

          if (stream && typeof onChunk === 'function') {
            const streamResponse = await activeClient.chat.completions.create({
              model: this.model,
              messages: finalMessagesPayload,
              stream: true
            });

            for await (const chunk of streamResponse) {
              const delta = chunk.choices[0]?.delta?.content || '';
              if (delta) {
                finalReply += delta;
                onChunk(delta);
              }
            }
          } else {
            const finalCompletion = await activeClient.chat.completions.create({
              model: this.model,
              messages: finalMessagesPayload
            });
            finalReply = finalCompletion.choices[0].message.content || '';
          }
        } catch (llmErr) {
          logger.warn('LLM Completion failed, using local grounded generator:', llmErr.message);
          finalReply = this.generateLocalGroundedResponse({
            userMessage: message,
            intentResult,
            toolExecutionResults
          });
          if (stream && typeof onChunk === 'function') {
            onChunk(finalReply);
          }
        }
      } else {
        finalReply = this.generateLocalGroundedResponse({
          userMessage: message,
          intentResult,
          toolExecutionResults
        });
        if (stream && typeof onChunk === 'function') {
          onChunk(finalReply);
        }
      }

      // Sanitize final text
      finalReply = sanitizeOutput(finalReply);

      // Persist assistant message
      await Message.create({
        conversationId: conv.id,
        role: 'assistant',
        textContent: finalReply
      });

      // Audit Logging
      aiAuditLogger.info('AI Chat Interaction Completed', {
        userId,
        conversationId: conv.id,
        userMessage: message,
        assistantResponse: finalReply,
        toolsRequested,
        toolsExecuted,
        productsCount: products.length,
        createdProduct: Boolean(createdProduct),
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        success: true
      });

      return {
        conversationId: conv.id,
        reply: finalReply,
        toolsExecuted,
        products,
        createdProduct,
        recommendations
      };
    } catch (err) {
      logger.error('Error during AI chat completion:', err);

      aiAuditLogger.error('AI Chat Interaction Failed', {
        userId,
        conversationId: conv ? conv.id : null,
        userMessage: message,
        error: err.message,
        toolsRequested,
        toolsExecuted,
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        success: false
      });

      throw err;
    }
  }
}

const agentInstance = new AIAgent();

export { agentInstance, AIAgent };
export default agentInstance;
