const express = require('express');
const router = express.Router();
const marketPriceController = require('../controllers/marketPriceController');

router.get('/', marketPriceController.getMarketPrice);

module.exports = router;