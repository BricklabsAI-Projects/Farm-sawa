const db = require('../db');
const axios = require('axios');

// Azure OpenAI Configuration
const AZURE_OPENAI_URL = process.env.AZURE_OPENAI_URL || 'https://ai-ctoai762503402280.openai.azure.com/openai/deployments/gpt-4/chat/completions?api-version=2025-01-01-preview';
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY || 'your-azure-api-key';

module.exports = {
    getMarketPrices: async (commodity, location) => {
        try {
            // Fetch data from the database
            const query = `
                SELECT market, commodity, classification, grade, sex, wholesale, retail, supply_volume, county, date
                FROM market_prices
                WHERE commodity ILIKE $1 AND county ILIKE $2
            `;
            const values = [`%${commodity}%`, `%${location}%`];
            const result = await db.query(query, values);

            if (result.rows.length === 0) {
                throw new Error(`No market price data found for ${commodity} in ${location}.`);
            }

            // Prepare data for NLP
            const marketData = result.rows;

            // Send data to Azure OpenAI for explanation
            const explanationResponse = await axios.post(
                AZURE_OPENAI_URL,
                {
                    messages: [
                        {
                            role: 'system',
                            content: `You are a market data assistant. Your job is to explain market price data in a simple and user-friendly way. Use Markdown-like formatting for structure and readability. Include key highlights and a summary.`,
                        },
                        { role: 'user', content: `Market Data: ${JSON.stringify(marketData)}` },
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

            // Extract the explanation from the Azure OpenAI response
            const marketSummary = explanationResponse.data.choices[0].message.content;

            return marketSummary.trim();
        } catch (error) {
            console.error('Error fetching or processing market prices:', error.message);
            throw new Error('Failed to fetch or process market price data.');
        }
    },
};