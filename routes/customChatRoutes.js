const express = require('express');
const customChatController = require('../controllers/customChatController');
const router = express.Router();

router.post('/register', customChatController.register);
router.post('/login', customChatController.login);
router.post('/handleMessage', customChatController.handleMessage);
router.get('/messages', customChatController.getUserMessages);

module.exports = router;

const db = require('../db');
const nlpService = require('../services/nlpService');
const weatherAPI = require('../integrations/weatherAPI');
const deepLeafAPI = require('../integrations/deepLeafAPI');

exports.handleMessage = async (req, res) => {
    try {
        const { userId, content } = req.body;

        if (!userId || !content) {
            return res.status(400).json({ error: 'User ID and message content are required' });
        }

        // Log user input
        console.log(`User Input: ${content}`);

        // Save the user's message
        const userMessageQuery = `
            INSERT INTO messages (user_id, content, sender)
            VALUES ($1, $2, 'user')
            RETURNING id, content, sender, created_at;
        `;
        const userMessageValues = [userId, content];
        const userMessageResult = await db.query(userMessageQuery, userMessageValues);

        // Ensure the result is valid
        if (!userMessageResult.rows || userMessageResult.rows.length === 0) {
            throw new Error('Failed to save user message.');
        }

        // Process the message using NLP
        const nlpResponse = await nlpService.getNlpResponse(content);
        const { intent, parameters } = nlpResponse;

        // Log NLP output
        console.log(`NLP Output: Intent - ${intent}, Parameters - ${JSON.stringify(parameters)}`);

        let systemResponse;

        // Handle intents
        if (intent === 'greeting') {
            systemResponse = `Hello! Welcome to Farmsawa. Here are the services we offer:
            - Weather updates
            - Market prices
            - Disease detection
            - Product supplier services
            How can I assist you today?`;
        } else if (intent === 'weather') {
            const { location, time } = parameters;
            if (!location || !time) {
                systemResponse = 'Please provide both the location and time for the weather update.';
            } else {
                systemResponse = await weatherAPI.getWeather(location, time);
            }
        } else {
            // Fallback for unknown intents
            systemResponse = `I can only assist with the following services:
            - Weather updates
            - Market prices
            - Disease detection
            - Product supplier services`;
        }

        // Log system response
        console.log(`System Response: ${systemResponse}`);

        // Save the system's response
        const systemMessageQuery = `
            INSERT INTO messages (user_id, content, sender)
            VALUES ($1, $2, 'system')
            RETURNING id, content, sender, created_at;
        `;
        const systemMessageValues = [userId, systemResponse];
        const systemMessageResult = await db.query(systemMessageQuery, systemMessageValues);

        res.status(201).json({
            userMessage: userMessageResult.rows[0],
            systemMessage: systemMessageResult.rows[0],
        });
    } catch (error) {
        console.error('Error handling message:', error);
        res.status(500).json({ error: 'Failed to handle message', details: error.message });
    }
};

// New controller method to fetch user messages
exports.getUserMessages = async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Fetch user messages from the database
        const query = `
            SELECT id, content, sender, created_at
            FROM messages
            WHERE user_id = $1
            ORDER BY created_at DESC;
        `;
        const values = [userId];
        const result = await db.query(query, values);

        // Ensure the result is valid
        if (!result.rows) {
            throw new Error('Failed to fetch user messages.');
        }

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching user messages:', error);
        res.status(500).json({ error: 'Failed to fetch user messages', details: error.message });
    }
};