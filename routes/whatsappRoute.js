const express = require('express');
const whatsappController = require('../controllers/whatsappController');
const router = express.Router();

router.post('/message', whatsappController.receiveMessage);

module.exports = router;