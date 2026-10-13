import express from 'express';
import * as aiController from '../controllers/ai.controller.js';
import validate from '../middlewares/validate.middleware.js';
import { chatSchema } from '../validators/ai.validator.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import aiGuard from '../middlewares/aiGuard.middleware.js';
import { aiLimiter } from '../middlewares/rateLimit.middleware.js';

const router = express.Router();

router.post('/chat', authenticate, aiGuard, aiLimiter, validate(chatSchema), aiController.chat);
router.get('/conversations', authenticate, aiController.getConversations);
router.get('/conversations/:id', authenticate, aiController.getConversationById);
router.delete('/conversations/:id', authenticate, aiController.deleteConversation);

export default router;
