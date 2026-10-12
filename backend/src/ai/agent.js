import OpenAI from 'openai';
import env from '../config/env.js';
import { SYSTEM_PROMPT } from './systemPrompt.js';
import ToolExecutor from './toolExecutor.js';
import { sanitizeOutput } from './guardrails.js';
import { Conversation, Message } from '../models/index.js';
import { aiAuditLogger, logger } from '../utils/logger.js';
import { heuristicIntentAnalysis, analyzeIntent } from './agent/intentHandler.js';
import { formatDH, generateLocalGroundedResponse } from './agent/responseGenerator.js';

class AIAgent {
  constructor() {
    this.apiKey = env.DEEPSEEK_API_KEY || env.OPENAI_API_KEY || '';
    this.baseURL = env.DEEPSEEK_BASE_URL || env.OPENAI_BASE_URL || 'https://api.deepseek.com';
    this.model = env.DEEPSEEK_MODEL || env.OPENAI_MODEL || 'deepseek-chat';
    this.client = null;
    this.initClient();
  }

  initClient() {
    const isMock = !this.apiKey || this.apiKey.startsWith('your_') ||
      this.apiKey === 'mock-or-valid-openai-key' || this.apiKey === 'mock-or-valid-deepseek-key';

    if (env.NODE_ENV !== 'test' && !isMock) {
      try {
        this.client = new OpenAI({ apiKey: this.apiKey, baseURL: this.baseURL });
      } catch (err) {
        logger.warn('Failed to initialize OpenAI client:', err.message);
        this.client = null;
      }
    } else {
      this.client = null;
    }
    return this.client;
  }

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

  analyzeIntent(opts) {
    return analyzeIntent({ ...opts, model: this.model });
  }

  heuristicIntentAnalysis(userMessage) {
    return heuristicIntentAnalysis(userMessage);
  }

  generateLocalGroundedResponse(opts) {
    return generateLocalGroundedResponse(opts);
  }

  async chat({ userId, userRole, conversationId, message, stream = false, onChunk = null }) {
    const startTime = Date.now();
    const toolsRequested = [];
    const toolsExecuted = [];
    let products = [];
    let createdProduct = null;
    let recommendations = [];

    let conv;
    const convTitle = message.substring(0, 40) + (message.length > 40 ? '...' : '');
    if (conversationId) {
      conv = await Conversation.findOne({ where: { id: conversationId, userId } });
    }
    if (!conv) {
      conv = await Conversation.create({ userId, title: convTitle });
    }

    await Message.create({ conversationId: conv.id, role: 'user', textContent: message });

    const history = await Message.findAll({
      where: { conversationId: conv.id },
      order: [['createdAt', 'ASC']],
      limit: 20
    });

    let finalReply = '';

    try {
      const activeClient = this.getClient();
      const intentResult = await this.analyzeIntent({ userMessage: message, history, client: activeClient });

      const toolExecutionResults = [];

      if (intentResult.toolsRequired && intentResult.toolsRequired.length > 0) {
        for (const planned of intentResult.toolsRequired) {
          const { name: toolName, args: toolArgs = {} } = planned;
          toolsRequested.push(toolName);

          try {
            const execResult = await ToolExecutor.execute(toolName, toolArgs, { role: userRole, userId });
            toolsExecuted.push(toolName);
            toolExecutionResults.push({ toolName, args: toolArgs, result: execResult });

            if (toolName === 'createProduct' && execResult.product) {
              createdProduct = execResult.product;
              products.push(execResult.product);
            }
            if (['vectorSearchProducts', 'searchProducts', 'getLowStockProducts'].includes(toolName) && Array.isArray(execResult.products)) {
              products.push(...execResult.products);
            }
            if (toolName === 'getProductStock' && execResult.found) {
              products.push({
                id: execResult.productId, name: execResult.name, reference: execResult.reference,
                quantity: execResult.quantity, minStock: execResult.minStock, price: execResult.price || 0, status: execResult.status
              });
            }
            if (toolName === 'getProductInfo' && execResult.found) {
              products.push(execResult.product || {
                id: execResult.id || execResult.productId, name: execResult.name, reference: execResult.reference,
                quantity: execResult.quantity, minStock: execResult.minStock, price: execResult.price,
                category: execResult.category?.name || execResult.category, supplier: execResult.supplier?.name || execResult.supplier
              });
            }
            if (toolName === 'recommendReorder' && Array.isArray(execResult.recommendations)) {
              recommendations.push(...execResult.recommendations);
              execResult.recommendations.forEach(r => products.push({
                id: r.productId, name: r.name, reference: r.reference, quantity: r.currentQuantity,
                minStock: r.minStock, price: r.unitPrice, category: r.category, supplier: r.supplier?.name
              }));
            }
          } catch (tErr) {
            logger.error(`Error executing planned tool ${toolName}:`, tErr);
            toolExecutionResults.push({ toolName, args: toolArgs, error: tErr.message });
          }
        }
      }

      // Deduplicate products by id, reference, or name
      const seen = new Set();
      products = products.filter(p => {
        const k = p.id || p.reference || p.name;
        if (!k || seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      if (activeClient) {
        try {
          const synthesisPrompt = `${SYSTEM_PROMPT}

You have performed intent analysis and executed the required tools for warehouse operations.
Generate a clear, polite, structured final response to the user in French:
1. Explain what the user asked for in clean natural French.
2. Clearly explain actions performed and outcomes.
3. Ground your answer strictly in the tool execution results below.
4. Format all prices in Moroccan Dirham using 'DH' (e.g., 250,00 DH). NEVER use USD, $ or EUR.
5. Do NOT use raw markdown header tags like '###' or '##'. Keep formatting clean and readable for mobile.

Executed Tool Data:
${JSON.stringify(toolExecutionResults, null, 2)}`;

          const messagesPayload = [
            { role: 'system', content: synthesisPrompt },
            ...history.map(m => ({ role: m.role === 'tool' ? 'system' : m.role, content: m.textContent })),
            { role: 'system', content: `User Intent: ${intentResult.userIntent}\nTool Execution Results: ${JSON.stringify(toolExecutionResults)}` }
          ];

          if (stream && typeof onChunk === 'function') {
            const streamRes = await activeClient.chat.completions.create({
              model: this.model, messages: messagesPayload, stream: true
            });
            for await (const chunk of streamRes) {
              const delta = chunk.choices[0]?.delta?.content || '';
              if (delta) { finalReply += delta; onChunk(delta); }
            }
          } else {
            const completion = await activeClient.chat.completions.create({
              model: this.model, messages: messagesPayload
            });
            finalReply = completion.choices[0].message.content || '';
          }
        } catch (llmErr) {
          logger.warn('LLM Completion failed, using local grounded generator:', llmErr.message);
          finalReply = this.generateLocalGroundedResponse({ userMessage: message, intentResult, toolExecutionResults });
          if (stream && typeof onChunk === 'function') onChunk(finalReply);
        }
      } else {
        finalReply = this.generateLocalGroundedResponse({ userMessage: message, intentResult, toolExecutionResults });
        if (stream && typeof onChunk === 'function') onChunk(finalReply);
      }

      finalReply = sanitizeOutput(finalReply);

      await Message.create({ conversationId: conv.id, role: 'assistant', textContent: finalReply });

      aiAuditLogger.info('AI Chat Interaction Completed', {
        userId, conversationId: conv.id, userMessage: message, assistantResponse: finalReply,
        toolsRequested, toolsExecuted, productsCount: products.length,
        createdProduct: Boolean(createdProduct), durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(), success: true
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
        userId, conversationId: conv ? conv.id : null, userMessage: message,
        error: err.message, toolsRequested, toolsExecuted,
        durationMs: Date.now() - startTime, timestamp: new Date().toISOString(), success: false
      });

      throw err;
    }
  }
}

const agentInstance = new AIAgent();

export { agentInstance, AIAgent, formatDH };
export default agentInstance;
