const axios = require('axios');

const AZURE_OPENAI_URL = process.env.AZURE_OPENAI_URL;
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;

module.exports = {
    getNlpResponse: async (content) => {
        try {
            const response = await axios.post(
                AZURE_OPENAI_URL,
                {
                    messages: [
                        {
                            role: 'system',
                            content: `You are Farmsawa, a farm data assistant. You only handle the following intents:
                            - salutations: Greet the user and provide a brief overview of the services offered.
                            - weather: Provide weather updates (requires location and time).
                            - market_prices: Provide market prices for crops (requires product and location).
                            - disease_detection: Detect crop diseases (requires an image).
                            - product_suppliers: Provide supplier information for products (requires product and location).
                            - crop_management: Provide crop management advice (requires crop name)Includes the best practices and location as well as wether and place to plant a particular crop.
                            If the user input is unrelated to these intents, respond with "Intent: unknown". Extract the intent and parameters from the user input in the format:
                            Intent: <intent>
                            Parameters: { "parameter1": "value1", "parameter2": "value2" }`,
                        },
                        { role: 'user', content },
                    ],
                    max_tokens: 150,
                    temperature: 0.7,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'api-key': AZURE_OPENAI_API_KEY,
                    },
                }
            );

            const reply = response.data.choices[0].message.content;

            // Extract intent and parameters from the reply
            const intentMatch = reply.match(/Intent:\s*(\w+)/i);
            const parametersMatch = reply.match(/Parameters:\s*({.*})/i);

            const intent = intentMatch ? intentMatch[1].toLowerCase() : 'unknown';
            const parameters = parametersMatch ? JSON.parse(parametersMatch[1]) : {};

            return { intent, parameters, reply };
        } catch (error) {
            console.error('Error calling Azure OpenAI:', error.message);
            return { intent: 'unknown', parameters: {}, reply: "I'm sorry, I couldn't process your request." };
        }
    },

    processText: async (text) => {
        try {
            const response = await axios.post(
                AZURE_OPENAI_URL,
                {
                    messages: [
                        {
                            role: 'system',
                            content: `You are Farmsawa, a farm data assistant. Analyze the following text and provide a concise and user-friendly summary.`,
                        },
                        { role: 'user', content: text },
                    ],
                    max_tokens: 500,
                    temperature: 0.7,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'api-key': AZURE_OPENAI_API_KEY,
                    },
                }
            );

            return response.data.choices[0].message.content.trim();
        } catch (error) {
            console.error('Error processing text with Azure OpenAI:', error.message);
            throw new Error('Failed to process text with NLP.');
        }
    },
};