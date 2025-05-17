const express = require('express');
const router = express.Router();
const nlpService = require('../services/nlpService');

// POST /nlp - Process user input and route to appropriate API
router.post('/', async (req, res) => {
    const { text } = req.body;

    if (!text) {
        return res.status(400).json({ error: 'Text input is required' });
    }

    try {
        // Extract intent and route to the appropriate service
        const response = await nlpService.processInput(text);
        res.status(200).json(response);
    } catch (error) {
        console.error('Error processing NLP request:', error);
        res.status(500).json({ error: 'Failed to process input' });
    }
});

module.exports = router;