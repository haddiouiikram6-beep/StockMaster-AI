const OpenAI = require('openai');
const env = require('../config/env');
const { SYSTEM_PROMPT } = require('./systemPrompt');
const { openAiTools } = require('./tools');
const ToolExecutor = require('./toolExecutor');
const { sanitizeOutput } = require('./guardrails');
const { Conversation, Message } = require('../models');
const { aiAuditLogger, logger } = require('../utils/logger');

/**
 * Detects whether a user message expresses an intention to reorder, replenish, purchase,
 * or obtain replenishment recommendations, as opposed to a simple low-stock detection alert.
 * Supports English, French, and Arabic/Darija phrasing.
 *
 * @param {string} message
 * @returns {boolean}
 */
function isReorderIntent(message) {
  if (!message || typeof message !== 'string') return false;
  const lower = message.toLowerCase().trim();

  // 1. Direct keywords for reordering / restocking / replenishment
  const explicitReorderKeywords = [
    'reorder',
    're-order',
    'replenish',
    'replenishing',
    'replenishment',
    'restock',
    'restocking',
    'restocks',
    'procurement'
  ];
  if (explicitReorderKeywords.some(kw => lower.includes(kw))) {
    return true;
  }

  // 2. French direct keywords for replenishment and ordering
  const frenchKeywords = [
    'réapprovision',
    'reapprovision',
    'ravitaillement',
    'recommander',
    'recommande',
    'commander',
    'commande',
    'achats',
    'acheter',
    'restocker'
  ];
  if (frenchKeywords.some(kw => lower.includes(kw))) {
    return true;
  }

  // 3. Recommendation or suggestion combined with order, buy, purchase, stock, or supply
  const hasRecommendOrSuggest =
    lower.includes('recommend') ||
    lower.includes('recommand') ||
    lower.includes('suggest') ||
    lower.includes('suggestion') ||
    lower.includes('advice') ||
    lower.includes('advise') ||
    lower.includes('conseil') ||
    lower.includes('plan') ||
    lower.includes('action');

  const hasProcurementAction =
    lower.includes('order') ||
    lower.includes('buy') ||
    lower.includes('purchase') ||
    lower.includes('procure') ||
    lower.includes('command') ||
    lower.includes('achat') ||
    lower.includes('stock') ||
    lower.includes('inventory');

  if (hasRecommendOrSuggest && hasProcurementAction) {
    return true;
  }

  // 4. Action-oriented inquiries: "what should I order/buy", "how much to order", "how many to purchase"
  const hasQuestionPattern =
    lower.includes('what should') ||
    lower.includes('what do we need') ||
    lower.includes('what to order') ||
    lower.includes('what to buy') ||
    lower.includes('which to order') ||
    lower.includes('which should i order') ||
    lower.includes('how much should') ||
    lower.includes('how many should') ||
    lower.includes('how much to') ||
    lower.includes('how many to') ||
    lower.includes('que dois-je') ||
    lower.includes('quoi commander') ||
    lower.includes('combien commander') ||
    lower.includes('faut-il commander') ||
    lower.includes('que faut-il');

  if (hasQuestionPattern && (lower.includes('order') || lower.includes('buy') || lower.includes('purchase') || lower.includes('command') || lower.includes('stock'))) {
    return true;
  }

  // 5. Arabic / Moroccan Darija intent detection:
  // "شنو نكوموندي", "شنو نشري", "سلعة ناقصة واش نكوموندي", "توصية إعادة طلب", etc.
  const arabicRegex = /(إعادة\s*طلب|اعادة\s*طلب|تجديد\s*المخزون|توصية|اقتراح\s*طلب|اقتراح\s*شراء|نكوموندي|كوموند|نشري|شراء|طلب\s*سلعة|شحال\s*نشري|شحال\s*نكوموندي|شنو\s*نشري|شنو\s*نكوموندي|واش\s*نكوموندي|سلعة\s*ناقصة\s*شنو)/i;
  if (arabicRegex.test(message)) {
    return true;
  }

  return false;
}

class AIAgent {
  constructor() {
    this.apiKey = env.OPENAI_API_KEY;
    this.hasValidApiKey = Boolean(this.apiKey && this.apiKey !== 'your_openai_api_key_here' && this.apiKey !== 'mock-or-valid-openai-key');
    if (this.hasValidApiKey) {
      this.client = new OpenAI({ apiKey: this.apiKey });
    } else {
      this.client = null;
    }
    this.model = 'gpt-4o-mini';
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
   * @returns {Promise<{ conversationId: number, reply: string, toolsExecuted: Array<string> }>}
   */
  async chat({ userId, userRole, conversationId, message, stream = false, onChunk = null }) {
    const startTime = Date.now();
    const toolsRequested = [];
    const toolsExecuted = [];

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

    // 4. Construct messages payload
    const messagesPayload = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map(m => ({
        role: m.role === 'tool' ? 'system' : m.role,
        content: m.textContent
      }))
    ];

    let finalReply = '';

    try {
      // If no valid OpenAI API Key is configured, use controlled intelligent local tool executor fallback
      if (!this.hasValidApiKey || !this.client) {
        const fallbackResult = await this.handleLocalSimulation({
          userMessage: message,
          userRole,
          onChunk,
          stream
        });
        finalReply = fallbackResult.reply;
        toolsExecuted.push(...fallbackResult.toolsExecuted);
      } else {
        // OpenAI Function Calling Execution:
        // If user is explicitly seeking reorder recommendations or replenishment advice,
        // target recommendReorder so the model does not settle for simple low-stock detection.
        const isReorder = isReorderIntent(message);
        const toolChoice = isReorder
          ? { type: 'function', function: { name: 'recommendReorder' } }
          : 'auto';

        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: messagesPayload,
          tools: openAiTools,
          tool_choice: toolChoice
        });

        const responseMessage = response.choices[0].message;

        // Check if OpenAI requested tool calls
        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
          messagesPayload.push(responseMessage);

          for (const toolCall of responseMessage.tool_calls) {
            const toolName = toolCall.function.name;
            toolsRequested.push(toolName);

            let args = {};
            try {
              args = JSON.parse(toolCall.function.arguments);
            } catch (pErr) {
              args = {};
            }

            // Execute the tool safely via Sequelize
            const toolResult = await ToolExecutor.execute(toolName, args, { role: userRole, userId });
            toolsExecuted.push(toolName);

            messagesPayload.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              name: toolName,
              content: JSON.stringify(toolResult)
            });
          }

          // Second pass: Send tool results back to OpenAI to generate final answer
          if (stream && typeof onChunk === 'function') {
            const streamResponse = await this.client.chat.completions.create({
              model: this.model,
              messages: messagesPayload,
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
            const finalCompletion = await this.client.chat.completions.create({
              model: this.model,
              messages: messagesPayload
            });
            finalReply = finalCompletion.choices[0].message.content || '';
          }
        } else {
          finalReply = responseMessage.content || '';
          if (stream && typeof onChunk === 'function') {
            onChunk(finalReply);
          }
        }
      }

      // Sanitize final text
      finalReply = sanitizeOutput(finalReply);

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
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        success: true
      });

      return {
        conversationId: conv.id,
        reply: finalReply,
        toolsExecuted
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

  /**
   * Local intelligent handler when OPENAI_API_KEY is not configured or in offline test mode
   */
  async handleLocalSimulation({ userMessage, userRole, onChunk, stream }) {
    const lower = userMessage.toLowerCase();
    const toolsExecuted = [];
    let reply = '';

    if (isReorderIntent(userMessage)) {
      toolsExecuted.push('recommendReorder');
      const data = await ToolExecutor.execute('recommendReorder', { limit: 10 }, { role: userRole });
      if (data.totalItemsToReorder === 0) {
        reply = '✅ **Inventory Status Optimal**: All product quantities are currently healthy above minimum safety levels. No reorders are needed at this time.';
      } else {
        reply = `📋 **Reorder Recommendations & Replenishment Plan**:\n\n` +
          `Identified **${data.totalItemsToReorder}** item(s) requiring restock (${data.criticalCount} CRITICAL, ${data.highCount} HIGH priority).\n` +
          `**Total Units to Reorder**: ${data.totalUnitsToOrder} units | **Estimated Cost**: $${data.totalEstimatedCost.toFixed(2)}\n\n` +
          data.recommendations.map(r => {
            const badge = r.priority === 'CRITICAL' ? '🔴 CRITICAL' : (r.priority === 'HIGH' ? '🟠 HIGH' : '🟡 MEDIUM');
            const supplierStr = r.supplier ? `Supplier: **${r.supplier.name}** (${r.supplier.email || r.supplier.phone || 'Contact on file'})` : 'Supplier: *Unassigned*';
            return `### [${badge}] **${r.name}** (\`${r.reference}\`)\n` +
              `- **Current Stock**: ${r.currentQuantity} / Min: ${r.minStock} (Deficit: ${r.deficit} units)\n` +
              `- **Recommended Order**: **${r.suggestedQuantity} units** (Target stock: ${r.targetStock})\n` +
              `- **Estimated Cost**: $${r.estimatedCost.toFixed(2)} ($${r.unitPrice.toFixed(2)}/unit)\n` +
              `- **${supplierStr}**\n` +
              `- *Action*: ${r.urgencyReason}`;
          }).join('\n\n') +
          `\n\n💡 *Tip: Contact the designated suppliers above to issue purchase orders for the recommended quantities.*`;
      }
    } else if (
      (lower.includes('low') && (lower.includes('stock') || lower.includes('inventory'))) ||
      lower.includes('alert') ||
      lower.includes('deficit') ||
      lower.includes('rupture') ||
      lower.includes('ناقص') ||
      lower.includes('خصاص')
    ) {
      toolsExecuted.push('getLowStockProducts');
      const data = await ToolExecutor.execute('getLowStockProducts', { limit: 10 }, { role: userRole });
      if (data.count === 0) {
        reply = 'Good news! There are currently no products under their minimum stock threshold.';
      } else {
        reply = `⚠️ **Low Stock Alert**: Found **${data.count}** product(s) below minimum stock levels:\n\n` +
          data.products.map(p => `- **${p.name}** (${p.reference}): Current: **${p.quantity}**, Minimum: **${p.minStock}** (Deficit: **${p.deficit}** units)`).join('\n');
      }
    } else if (lower.includes('movement') || lower.includes('history') || lower.includes('recent')) {
      toolsExecuted.push('getStockMovements');
      const data = await ToolExecutor.execute('getStockMovements', { limit: 5 }, { role: userRole });
      reply = `📦 **Recent Stock Movements**:\n\n` +
        data.movements.map(m => `- [${m.type}] **${m.quantity}** units of **${m.product}** on ${new Date(m.date).toLocaleDateString()} by ${m.performedBy} (Reason: ${m.reason || 'N/A'})`).join('\n');
    } else if (lower.includes('supplier') || lower.includes('vendor')) {
      toolsExecuted.push('getSupplierInfo');
      const data = await ToolExecutor.execute('getSupplierInfo', { supplierId: 1 }, { role: userRole });
      if (data.found) {
        reply = `🏢 **Supplier Details**:\n\n- **Name**: ${data.name}\n- **Email**: ${data.email || 'N/A'}\n- **Phone**: ${data.phone || 'N/A'}\n- **Products Supplied**: ${data.productCount}`;
      } else {
        reply = 'No supplier information could be retrieved for this query.';
      }
    } else if (lower.includes('keyboard') || lower.includes('mouse') || lower.includes('product') || lower.includes('stock')) {
      toolsExecuted.push('searchProducts');
      const queryTerm = lower.includes('keyboard') ? 'keyboard' : (lower.includes('mouse') ? 'mouse' : 'hub');
      const data = await ToolExecutor.execute('searchProducts', { query: queryTerm }, { role: userRole });
      if (data.count > 0) {
        reply = `🔍 **Found ${data.count} matching product(s)** for "${queryTerm}":\n\n` +
          data.products.map(p => `- **${p.name}** (SKU: \`${p.reference}\`) - Stock: **${p.quantity}** units | Price: $${p.price.toFixed(2)}`).join('\n');
      } else {
        reply = `No products found matching your search.`;
      }
    } else {
      reply = `Hello! I am StockMaster AI. You can ask me about stock quantities, low inventory alerts, recent stock movements, or supplier information.`;
    }

    if (stream && typeof onChunk === 'function') {
      const words = reply.split(' ');
      for (const word of words) {
        onChunk(word + ' ');
      }
    }

    return { reply, toolsExecuted };
  }
}

const agentInstance = new AIAgent();
agentInstance.isReorderIntent = isReorderIntent;

module.exports = agentInstance;
