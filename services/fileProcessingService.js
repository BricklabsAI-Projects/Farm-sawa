const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

module.exports = {
    extractTextFromFile: async (fileBuffer, fileType) => {
        try {
            if (fileType === 'application/pdf') {
                const data = await pdfParse(fileBuffer);
                return data.text;
            } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                const { value } = await mammoth.extractRawText({ buffer: fileBuffer });
                return value;
            } else {
                throw new Error('Unsupported file type.');
            }
        } catch (error) {
            console.error('Error extracting text from file:', error.message);
            throw new Error('Failed to extract text from file.');
        }
    },
};