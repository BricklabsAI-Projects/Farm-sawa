const axios = require('axios');
const fs = require('fs');
const path = require('path');
const tmp = require('tmp-promise');
const FormData = require('form-data');

const DEEPLEAF_API_KEY = process.env.DEEPLEAF_API_KEY;
const DEEPLEAF_API_URL = process.env.DEEPLEAF_API_URL || 'https://api.deepleaf.io/analyze';

async function analyzeCropDisease(imageUrl) {
    let tempFilePath;
    console.log('Starting crop disease analysis...');
    try {
        // Step 1: Download the image to a temporary file
        console.log('Step 1: Downloading the image...');
        const tempFile = await tmp.file({ postfix: '.jpg' });
        tempFilePath = tempFile.path;

        console.log(`Temporary file created at: ${tempFilePath}`);

        const response = await axios({
            url: imageUrl,
            method: 'GET',
            responseType: 'stream',
        });

        console.log('Image download initiated...');

        const writer = fs.createWriteStream(tempFilePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        console.log('Image downloaded successfully to:', tempFilePath);

        // Step 2: Prepare the image for upload
        console.log('Step 2: Preparing the image for upload...');
        const formData = new FormData();
        formData.append('image', fs.createReadStream(tempFilePath), path.basename(tempFilePath));

        console.log('Image prepared for upload.');

        // Step 3: Construct the DeepLeaf API URL
        const deepleafUrl = `${DEEPLEAF_API_URL}?api_key=${DEEPLEAF_API_KEY}&language=en`;
        console.log('DeepLeaf API URL:', deepleafUrl);

        // Step 4: Send the image to the DeepLeaf API
        console.log('Step 3: Sending the image to the DeepLeaf API...');
        const deepleafResponse = await axios.post(deepleafUrl, formData, {
            headers: formData.getHeaders(),
        });

        console.log('Image successfully sent to the DeepLeaf API.');

        // Step 5: Parse and return the response
        console.log('Step 4: Parsing the response from the DeepLeaf API...');
        return deepleafResponse.data;

    } catch (error) {
        console.error('DeepLeaf API error:', error.response?.data || error.message);
        throw new Error('Unable to analyze the image for disease.');
    } finally {
        // Clean up the temporary file
        console.log('Cleaning up temporary files...');
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
            console.log('Temporary file deleted:', tempFilePath);
        } else {
            console.log('No temporary file to clean up.');
        }
    }
}

module.exports = {
    analyzeCropDisease,
};