import aiService from '../services/ai.service.js';
import { successResponse } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * AI Controller
 * Handles HTTP requests and delegates AI chat / conversation queries to AIService
 */

export const chat = async (req, res, next) => {
  const { conversationId, message, stream: requestedStream } = req.body;
  const isSSE = requestedStream === true || req.headers.accept === 'text/event-stream';

  if (isSSE) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    try {
      const result = await aiService.chat({
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

  try {
    const result = await aiService.chat({
      userId: req.user.id,
      userRole: req.user.role,
      conversationId,
      message,
      stream: false
    });

    return successResponse(res, {
      ...result,
      answer: result.reply
    });
  } catch (error) {
    next(error);
  }
};

export const getConversations = asyncHandler(async (req, res) => {
  const conversations = await aiService.getConversations(req.user.id);
  return successResponse(res, conversations);
});

export const getConversationById = asyncHandler(async (req, res) => {
  const conversation = await aiService.getConversationById(req.params.id, req.user.id);
  return successResponse(res, conversation);
});

export default {
  chat,
  getConversations,
  getConversationById
};
