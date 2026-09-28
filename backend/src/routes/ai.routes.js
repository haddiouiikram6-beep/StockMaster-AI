const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const validate = require('../middlewares/validate.middleware');
const { chatSchema } = require('../validators/ai.validator');
const { authenticate } = require('../middlewares/auth.middleware');
const aiGuard = require('../middlewares/aiGuard.middleware');
const { aiLimiter } = require('../middlewares/rateLimit.middleware');

router.post('/chat', authenticate, aiGuard, aiLimiter, validate(chatSchema), aiController.chat);
router.get('/conversations', authenticate, aiController.getConversations);
router.get('/conversations/:id', authenticate, aiController.getConversationById);

module.exports = router;
