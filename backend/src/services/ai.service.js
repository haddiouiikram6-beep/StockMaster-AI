import aiAgent from '../ai/agent.js';
import { Conversation, Message } from '../models/index.js';
import { AppError } from '../utils/AppError.js';

class AIService {
  /**
   * Process chat interaction via AIAgent
   */
  async chat({ userId, userRole, conversationId, message, stream = false, onChunk = null }) {
    return await aiAgent.chat({
      userId,
      userRole,
      conversationId,
      message,
      stream,
      onChunk
    });
  }

  /**
   * Get conversations for user
   */
  async getConversations(userId) {
    return await Conversation.findAll({
      where: { userId },
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
  }

  /**
   * Get single conversation with complete message thread
   */
  async getConversationById(id, userId) {
    const conversation = await Conversation.findOne({
      where: { id, userId },
      include: [
        {
          model: Message,
          as: 'messages',
          order: [['createdAt', 'ASC']]
        }
      ]
    });

    if (!conversation) {
      throw new AppError('Conversation not found.', 404);
    }

    return conversation;
  }
}

export const aiService = new AIService();
export default aiService;
