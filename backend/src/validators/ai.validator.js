import { z } from 'zod';

const chatSchema = z.object({
  conversationId: z.any().optional(),
  message: z.string().trim().min(1, 'Message is required').max(4000, 'Message cannot exceed 4000 characters'),
  stream: z.boolean().optional().default(false)
});

export {
  chatSchema
};

export default {
  chatSchema
};
