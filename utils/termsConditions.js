const twilioClient = require('./twilioClient');

const termsAndConditionsText = `
FarmSawa Terms and Conditions:

1. We collect and use your data to provide farming advice and services.
2. Your location data is necessary for weather-based tips.
3. By using our service, you consent to our privacy policy.

Detailed Privacy Policy: [link]

If you have any questions, reply to this message.
`;

const sendTerms = async (phoneNumber) => {
    await twilioClient.messages.create({
        body: termsAndConditionsText,
        from: `whatsapp:${TWILIO_PHONE_NUMBER}`,
        to: `whatsapp:${phoneNumber}`
    });
};

module.exports = {
    sendTerms
};