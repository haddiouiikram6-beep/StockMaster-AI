import OpenAI from 'openai';
import env from '../config/env.js';
import { SYSTEM_PROMPT } from './systemPrompt.js';
import { tools } from './tools.js';
import ToolExecutor from './toolExecutor.js';
import { sanitizeOutput } from './guardrails.js';
import { Conversation, Message } from '../models/index.js';
import { aiAuditLogger, logger } from '../utils/logger.js';

class AIAgent {
  constructor() {
    this.apiKey = env.DEEPSEEK_API_KEY || env.OPENAI_API_KEY;
    this.baseURL = env.DEEPSEEK_BASE_URL || env.OPENAI_BASE_URL || 'https://api.deepseek.com';
    this.model = env.DEEPSEEK_MODEL || env.OPENAI_MODEL || 'deepseek-chat';
    this.hasValidApiKey = env.NODE_ENV !== 'test' && Boolean(
      this.apiKey &&
      !this.apiKey.startsWith('your_') &&
      this.apiKey !== 'mock-or-valid-openai-key' &&
      this.apiKey !== 'mock-or-valid-deepseek-key'
    );
    if (this.hasValidApiKey) {
      this.client = new OpenAI({
        apiKey: this.apiKey,
        baseURL: this.baseURL
      });
    } else {
      this.client = null;
    }
  }

  /**
   * Retrieves active LLM client or dynamically updates if credentials change
   */
  getClient() {
    const currentApiKey = env.DEEPSEEK_API_KEY || env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
    const currentBaseURL = env.DEEPSEEK_BASE_URL || env.OPENAI_BASE_URL || process.env.DEEPSEEK_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.deepseek.com';
    const currentModel = env.DEEPSEEK_MODEL || env.OPENAI_MODEL || process.env.DEEPSEEK_MODEL || process.env.OPENAI_MODEL || 'deepseek-chat';

    const isValid = env.NODE_ENV !== 'test' && Boolean(
      currentApiKey &&
      !currentApiKey.startsWith('your_') &&
      currentApiKey !== 'mock-or-valid-openai-key' &&
      currentApiKey !== 'mock-or-valid-deepseek-key'
    );

    if (!isValid) {
      this.client = null;
      return null;
    }

    if (!this.client || this.apiKey !== currentApiKey || this.baseURL !== currentBaseURL) {
      this.apiKey = currentApiKey;
      this.baseURL = currentBaseURL;
      this.model = currentModel;
      this.client = new OpenAI({
        apiKey: currentApiKey,
        baseURL: currentBaseURL
      });
    }

    return this.client;
  }

  /**
   * Phase 1: Intent Pre-prompt Analysis
   * Sends a structured intent-recognition pre-prompt to analyze user intention and plan tool execution.
   */
  async analyzeIntent({ userMessage, history = [], client }) {
    const availableToolsSummary = tools.map(t => `- ${t.function.name}: ${t.function.description}`).join('\n');

    const intentPrompt = `You are the intent recognition and tool planning engine for StockMaster AI warehouse management.
Analyze the user's latest query along with conversation context to identify their exact intent and determine which tool(s) must be executed.

Available Tools:
${availableToolsSummary}

Rules:
1. If the user wants to add, create, or insert a new product, plan 'createProduct'.
2. If the user searches for items semantically, describes use cases, or looks for products (e.g., cables, chairs, mouse, screens), plan 'vectorSearchProducts'.
3. For stock deficits or low inventory alerts, plan 'getLowStockProducts'.
4. For reorder advice, purchase quantities, or replenishment costs, plan 'recommendReorder'.
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
   * Local heuristic intent recognition fallback
   */
  heuristicIntentAnalysis(userMessage) {
    const lower = userMessage.toLowerCase();
    const toolsRequired = [];
    let userIntent = 'General inquiry';

    // 1. Create product intent
    if (
      (lower.includes('créer') || lower.includes('crée') || lower.includes('create') || lower.includes('ajoute')) &&
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
      lower.includes('نكوموندي') ||
      (lower.includes('order') && lower.includes('what'))
    ) {
      userIntent = 'Inventory replenishment recommendation';
      toolsRequired.push({ name: 'recommendReorder', args: { limit: 10 } });
    }
    // 3. Low stock intent
    else if (
      (lower.includes('low') && (lower.includes('stock') || lower.includes('inventory'))) ||
      lower.includes('alert') ||
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
      lower.includes('keyboard') ||
      lower.includes('écran')
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

    return { userIntent, toolsRequired, reasoning: 'Heuristic pattern match' };
  }

  /**
   * Process a chat interaction, manage history, handle tool calls, and return or stream response
   * @param {object} params 
   * @param {number} params.userId 
   * @param {string} params.userRole 
   * @param {number} [params.conversationId] 
   * @param {string} params.message 
   * @param {boolean} [params.stream] 
   * @param {function} [params.onChunk] Callback for SSE streaming tokens
   * @returns {Promise<{ conversationId: number, reply: string, toolsExecuted: Array<string>, products: Array<object>, createdProduct: object|null, recommendations: Array<object> }>}
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
          title: message.substring(0, 40) + '...'
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

      if (!activeClient) {
        throw new Error('DeepSeek API client is not configured. Please define DEEPSEEK_API_KEY in your environment.');
      }

      // -------------------------------------------------------------
      // Phase 1: Intent Understanding via Pre-prompt
      // -------------------------------------------------------------
      console.log("Analyzing user intent with pre-prompt for query:", message);
      const intentResult = await this.analyzeIntent({
        userMessage: message,
        history,
        client: activeClient
      });

      console.log("Intent recognized:", intentResult.userIntent, "Tools planned:", intentResult.toolsRequired);

      // -------------------------------------------------------------
      // Phase 2: Tool Execution
      // -------------------------------------------------------------
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

            // Extract structured data for frontend UI
            if (toolName === 'createProduct' && execResult.product) {
              createdProduct = execResult.product;
            }
            if ((toolName === 'vectorSearchProducts' || toolName === 'searchProducts') && Array.isArray(execResult.products)) {
              products.push(...execResult.products);
            }
            if (toolName === 'getLowStockProducts' && Array.isArray(execResult.products)) {
              products.push(...execResult.products);
            }
            if (toolName === 'recommendReorder' && Array.isArray(execResult.recommendations)) {
              recommendations.push(...execResult.recommendations);
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

      // -------------------------------------------------------------
      // Phase 3: Final Response Generation with Full Context & Grounding
      // -------------------------------------------------------------
      const synthesisSystemPrompt = `${SYSTEM_PROMPT}

You have performed intent analysis and executed the required tools for warehouse operations.
Now, generate a clear, polite, structured final response to the user in French:
1. Explain what the user asked for.
2. Clearly explain what actions have been performed (e.g. products created and indexed in Pinecone, items found via semantic vector search, low stock alerts, or replenishment plans).
3. Ground your answer strictly in the tool execution results provided below.
4. Always format prices in Moroccan Dirham using 'DH' (e.g., 250,00 DH). NEVER use USD, $ or EUR.

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

      // Sanitize final text
      finalReply = sanitizeOutput(finalReply);
      console.log("AI REPLY LENGTH:", finalReply?.length);

      // Persist assistant message in PostgreSQL
      await Message.create({
        conversationId: conv.id,
        role: 'assistant',
        textContent: finalReply
      });

      // AI Audit Logging
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
        conversationId: conv.id,
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
