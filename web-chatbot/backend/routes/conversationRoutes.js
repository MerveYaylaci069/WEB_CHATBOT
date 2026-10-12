const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');

router.get('/:siteKey', conversationController.listConversations);
router.get('/:siteKey/:visitorId', conversationController.getConversation);
router.delete('/:siteKey/:visitorId', conversationController.deleteConversation);
router.delete('/:siteKey', conversationController.deleteAllForSite);

module.exports = router;
