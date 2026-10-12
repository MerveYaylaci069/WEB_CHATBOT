const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.post('/', chatController.handleChat);
router.post('/preview', chatController.handlePreviewChat);

module.exports = router;
