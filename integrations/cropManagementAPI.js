const axios = require('axios');
const db = require('../db');
const fileProcessingService = require('../services/fileProcessingService');
const nlpService = require('../services/nlpService');

module.exports = {
    getCropManagementTips: async (crop) => {
        try {
            // Fetch crop document metadata from the database
            const cropDocumentQuery = `
                SELECT file_url, file_type
                FROM crop_documents
                WHERE crop_name ILIKE $1
                LIMIT 1;
            `;
            const cropDocumentValues = [crop];
            const cropDocumentResult = await db.query(cropDocumentQuery, cropDocumentValues);

            if (cropDocumentResult.rows.length === 0) {
                throw new Error(`No crop management document found for ${crop}.`);
            }

            const { file_url: fileUrl, file_type: fileType } = cropDocumentResult.rows[0];

            // Download and extract text from the document
            const fileBuffer = await module.exports.downloadFile(fileUrl); // Explicitly reference the function
            const extractedText = await fileProcessingService.extractTextFromFile(fileBuffer, fileType);

            // Send the extracted text to the NLP service
            const nlpResponse = await nlpService.processText(extractedText);

            return nlpResponse;
        } catch (error) {
            console.error('Error handling crop management query:', error.message);
            throw new Error('Failed to process your crop management query.');
        }
    },

    downloadFile: async (fileUrl) => {
        try {
            const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
            return Buffer.from(response.data);
        } catch (error) {
            console.error('Error downloading file:', error.message);
            throw new Error('Failed to download crop document.');
        }
    },
};