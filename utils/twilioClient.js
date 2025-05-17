const twilio = require('twilio');
const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = require('../config');

const client = new twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

module.exports = client;