const express = require('express');
const router = express.Router();
const registerCustomChatController = require('../controllers/registerCustomChatController');

router.post('/register', registerCustomChatController.registerUser);

module.exports = router;