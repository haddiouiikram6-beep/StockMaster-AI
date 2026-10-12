import aiAgent from '../ai/agent.js';
import { Conversation, Message } from '../models/index.js';

/**
 * AI Chat endpoint supporting standard JSON and SSE Streaming
 * POST /api/ai/chat
 */
const chat = async (req, res, next) => {
  const { conversationId, message, stream: requestedStream } = req.body;
  const isSSE = requestedStream === true || req.headers.accept === 'text/event-stream';

  if (isSSE) {
    // Setup SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    try {
      const result = await aiAgent.chat({
        userId: req.user.id,
        userRole: req.user.role,
        conversationId,
        message,
        stream: true,
        onChunk: (chunk) => {
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        }
      });

      res.write(`data: ${JSON.stringify({
        conversationId: result.conversationId,
        toolsExecuted: result.toolsExecuted,
        products: result.products || [],
        createdProduct: result.createdProduct || null,
        recommendations: result.recommendations || [],
        done: true
      })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    } catch (err) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      return res.end();
    }
  }

  // Standard JSON response
  try {
    const result = await aiAgent.chat({
      userId: req.user.id,
      userRole: req.user.role,
      conversationId,
      message,
      stream: false
    });

    res.status(200).json({
      success: true,
      data: {
        ...result,
        answer: result.reply
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all conversations for the authenticated user
 * GET /api/ai/conversations
 */
const getConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.findAll({
      where: { userId: req.user.id },
      order: [['updatedAt', 'DESC']],
      include: [
        {
          model: Message,
          as: 'messages',
          limit: 1,
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    res.status(200).json({
      success: true,
      data: conversations
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific conversation with all message history
 * GET /api/ai/conversations/:id
 */
const getConversationById = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [
        {
          model: Message,
          as: 'messages',
          order: [['createdAt', 'ASC']]
        }
      ]
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found.'
      });
    }

    res.status(200).json({
      success: true,
      data: conversation
    });
  } catch (error) {
    next(error);
  }
};

export {
  chat,
  getConversations,
  getConversationById
};

export default {
  chat,
  getConversations,
  getConversationById
};
