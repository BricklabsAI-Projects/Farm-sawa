const express = require('express');
const router = express.Router();
const diseaseController = require('../controllers/diseaseController');

router.post('/', diseaseController.detectDisease);

module.exports = router;