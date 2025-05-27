const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const tmp = require('tmp-promise');

const DEEPLEAF_API_KEY = process.env.DEEPLEAF_API_KEY;
const DEEPLEAF_API_URL = process.env.DEEPLEAF_API_URL || 'https://api.deepleaf.io/analyze';
const AZURE_OPENAI_URL = process.env.AZURE_OPENAI_URL || 'https://ai-ctoai762503402280.openai.azure.com/openai/deployments/gpt-4/chat/completions?api-version=2025-01-01-preview';
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;
const MAX_WHATSAPP_MESSAGE_LENGTH = 1600;

exports.detectDisease = async (mediaUrl) => {
    let tempFilePath;
    try {
        console.log('Downloading image from Twilio...');
        const tempFile = await tmp.file({ postfix: '.jpg' });
        tempFilePath = tempFile.path;

        const response = await axios({
            url: mediaUrl,
            method: 'GET',
            responseType: 'stream',
            auth: {
                username: process.env.TWILIO_ACCOUNT_SID,
                password: process.env.TWILIO_AUTH_TOKEN,
            },
        });

        const writer = fs.createWriteStream(tempFilePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        console.log(`Image downloaded successfully to: ${tempFilePath}`);

        console.log('Preparing image for upload...');
        const formData = new FormData();
        formData.append('image', fs.createReadStream(tempFilePath));

        console.log('Sending request to DeepLeaf API...');
        const deepleafResponse = await axios.post(DEEPLEAF_API_URL, formData, {
            params: {
                api_key: DEEPLEAF_API_KEY,
                language: 'en',
            },
            headers: formData.getHeaders(),
        });

        console.log('DeepLeaf API response:', deepleafResponse.data);

        // Extract the predicted diagnoses
        const predictedDiagnoses = deepleafResponse.data.data.predicted_diagnoses;

        if (!predictedDiagnoses || predictedDiagnoses.length === 0) {
            throw new Error('No diagnoses detected in the image.');
        }

        // Prepare data for Azure OpenAI
        const diseaseData = {
            diagnoses: predictedDiagnoses,
        };

        console.log('Sending disease data to Azure OpenAI for summarization...');
        const explanationResponse = await axios.post(
            AZURE_OPENAI_URL,
            {
                messages: [
                    {
                        role: 'system',
                        content: `You are a crop disease assistant. Your job is to summarize crop disease data in a simple and user-friendly way. Ensure the response is concise and does not exceed 1600 characters.`,
                    },
                    { role: 'user', content: `Disease Data: ${JSON.stringify(diseaseData)}` },
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

        const diseaseSummary = explanationResponse.data.choices[0].message.content;

        // Split the summary into chunks if it exceeds the character limit
        const messageChunks = [];
        let currentChunk = '';

        diseaseSummary.split('\n').forEach((line) => {
            if ((currentChunk + line).length > MAX_WHATSAPP_MESSAGE_LENGTH) {
                messageChunks.push(currentChunk.trim());
                currentChunk = '';
            }
            currentChunk += `${line}\n`;
        });

        if (currentChunk.trim()) {
            messageChunks.push(currentChunk.trim());
        }

        return messageChunks; // Return an array of message chunks
    } catch (error) {
        console.error('Error in disease detection or Azure OpenAI:', error.response?.data || error.message);
        throw new Error('Failed to analyze the image for disease.');
    } finally {
        // Delete the temporary file
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
            console.log(`Temporary file deleted: ${tempFilePath}`);
        }
    }
};