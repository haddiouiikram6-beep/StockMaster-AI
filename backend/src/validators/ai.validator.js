const { z } = require('zod');

const chatSchema = z.object({
  conversationId: z.coerce.number().int().positive().optional().nullable(),
  message: z.string().trim().min(1, 'Message is required').max(4000, 'Message cannot exceed 4000 characters'),
  stream: z.boolean().optional().default(false)
});

module.exports = {
  chatSchema
};
