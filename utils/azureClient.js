const axios = require('axios');
const { AZURE_OPENAI_API_KEY, AZURE_OPENAI_URL } = require('../config');

const azureClient = axios.create({
    baseURL: AZURE_OPENAI_URL,
    headers: {
        'Authorization': `Bearer ${AZURE_OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
    }
});

const getNLPResponse = async (message) => {
    try {
        console.log('Making OpenAI API request with prompt:', message);
        const response = await azureClient.post('', {
            messages: [{ role: 'user', content: message }]
        });
        console.log('OpenAI API response data:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error in OpenAI API request:', error);
        throw error;
    }
};

module.exports = {
    getNLPResponse
};