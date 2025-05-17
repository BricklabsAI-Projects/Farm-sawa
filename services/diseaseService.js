const axios = require('axios');
const FormData = require('form-data');
const { DEEPLEAF_API_KEY, DEEPLEAF_API_URL } = require('../config');

const detectDisease = async (imageUrl) => {
    try {
        const formData = new FormData();
        formData.append('image', imageUrl, 'crop-image.jpg');

        console.log('Sending image to DeepLeaf API:', imageUrl);

        const response = await axios.post(`${DEEPLEAF_API_URL}/analyze?api_key=${DEEPLEAF_API_KEY}&language=en`, formData, {
            headers: formData.getHeaders()
        });

        console.log('DeepLeaf API response data:', response.data);

        return response.data;
    } catch (error) {
        console.error('Error in DeepLeaf API request:', error);
        throw error;
    }
};

module.exports = {
    detectDisease
};