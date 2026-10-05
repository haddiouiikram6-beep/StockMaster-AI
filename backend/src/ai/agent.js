const OpenAI = require('openai');
const env = require('../config/env');
const { SYSTEM_PROMPT } = require('./systemPrompt');
const { openAiTools } = require('./tools');
const ToolExecutor = require('./toolExecutor');
const { sanitizeOutput } = require('./guardrails');
const { Conversation, Message } = require('../models');
const { aiAuditLogger, logger } = require('../utils/logger');


class AIAgent {
  constructor() {
    this.apiKey = env.OPENAI_API_KEY;
    this.baseURL = env.OPENAI_BASE_URL || undefined;
    this.hasValidApiKey = env.NODE_ENV !== 'test' && Boolean(this.apiKey && this.apiKey !== 'your_openai_api_key_here' && this.apiKey !== 'mock-or-valid-openai-key');
    if (this.hasValidApiKey) {
      const clientConfig = { apiKey: this.apiKey };
      if (this.baseURL) {
        clientConfig.baseURL = this.baseURL;
      }
      this.client = new OpenAI(clientConfig);
    } else {
      this.client = null;
    }
    this.model = env.OPENAI_MODEL || 'openai/gpt-oss-20b';
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
        // We rely entirely on the LLM's semantic understanding of the prompt and tools.
        const toolChoice = 'auto';

        console.log("AI MODEL:", this.model);
        console.log("AI REQUEST MESSAGE LENGTH:", message?.length);

        let response;
        try {
          response = await this.client.chat.completions.create({
            model: this.model,
            messages: messagesPayload,
            tools: openAiTools,
            tool_choice: toolChoice
          });
        } catch (e) {
          console.log("AI RESPONSE ERROR STATUS:", e.status);
          throw e;
        }

        console.log("AI RESPONSE OBJECT STRUCTURE KEYS:", Object.keys(response));
        
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

    const isReorder = lower.includes('reorder') || lower.includes('replenish') || lower.includes('réapprovisionnement') || lower.includes('نكوموندي') || (lower.includes('order') && lower.includes('what'));

    if (isReorder) {
      toolsExecuted.push('recommendReorder');
      const data = await ToolExecutor.execute('recommendReorder', { limit: 10 }, { role: userRole });
      reply = `📋 **Reorder Recommendations & Replenishment Plan**`;
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
      reply = `⚠️ **Low Stock Alert**: Found **${data.count}** product(s) below minimum stock levels`;
    } else if (lower.includes('movement') || lower.includes('history') || lower.includes('recent')) {
      toolsExecuted.push('getStockMovements');
      const data = await ToolExecutor.execute('getStockMovements', { limit: 5 }, { role: userRole });
      reply = `📦 **Recent Stock Movements**`;
    } else if (lower.includes('supplier') || lower.includes('vendor')) {
      toolsExecuted.push('getSupplierInfo');
      const data = await ToolExecutor.execute('getSupplierInfo', { supplierId: 1 }, { role: userRole });
      reply = `🏢 **Supplier Details**`;
    } else if (lower.includes('keyboard') || lower.includes('mouse') || lower.includes('product') || lower.includes('stock')) {
      toolsExecuted.push('searchProducts');
      const data = await ToolExecutor.execute('searchProducts', { query: 'keyboard' }, { role: userRole });
      reply = `🔍 **Found products**`;
    } else {
      reply = `Hello! I am StockMaster AI.`;
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

module.exports = agentInstance;
