require('dotenv').config();

module.exports = {
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_URL: process.env.AZURE_OPENAI_URL,
    DEEPLEAF_API_KEY: process.env.DEEPLeAF_API_KEY,
    DEEPLEAF_API_URL: process.env.DEEPLeAF_API_URL,
    PORT: process.env.PORT || 3000,
    DATABASE_URL: process.env.DATABASE_URL
};