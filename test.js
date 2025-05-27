require('dotenv').config();
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

const DEEPLEAF_API_KEY = process.env.DEEPLEAF_API_KEY;
const DEEPLEAF_API_URL = process.env.DEEPLEAF_API_URL || 'https://api.deepleaf.io/analyze';

(async () => {
    try {
        // Use the local file path for the image
        const localImagePath = './image.png'; // Ensure this path points to the correct location of the image on the server

        // Check if the file exists
        if (!fs.existsSync(localImagePath)) {
            throw new Error(`File not found: ${localImagePath}`);
        }

        // Log file details
        const stats = fs.statSync(localImagePath);
        console.log(`File details - Path: ${localImagePath}, Size: ${stats.size} bytes`);

        // Prepare the image for upload
        const formData = new FormData();
        formData.append('image', fs.createReadStream(localImagePath));

        // Log the request details
        console.log('Sending request to DeepLeaf API...');
        console.log(`API Key: ${DEEPLEAF_API_KEY}`);
        console.log(`API URL: ${DEEPLEAF_API_URL}`);

        // Send the request to the DeepLeaf API
        const response = await axios.post(DEEPLEAF_API_URL, formData, {
            params: {
                api_key: DEEPLEAF_API_KEY,
                language: 'en',
            },
            headers: formData.getHeaders(),
        });

        // Log and display the response
        console.log('DeepLeaf API response:', response.data);
    } catch (error) {
        // Log the error response for debugging
        if (error.response) {
            console.error('Error response from DeepLeaf API:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
})();