const userService = require('../services/userService');
const twilioClient = require('../utils/twilioClient');

exports.registerUser = async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        console.log('Received registration request for phone number:', phoneNumber);

        const userExists = await userService.getUser(phoneNumber);

        if (userExists) {
            console.log('User with phone number already exists:', phoneNumber);
            return res.status(400).send({ error: 'User with this phone number already exists' });
        }

        const verificationWord = Math.random().toString(36).substring(2, 15);
        await userService.registerUserWithPhone(phoneNumber, verificationWord);

        // Send the verification word via WhatsApp
        await twilioClient.messages.create({
            body: `Your verification word is: ${verificationWord}`,
            from: `${process.env.TWILIO_PHONE_NUMBER}`,
            to: `whatsapp:${phoneNumber}`
        });

        console.log('Verification word generated and sent:', verificationWord);
        res.status(200).send({ message: 'User registered successfully. Please check your WhatsApp for the verification word.' });
    } catch (error) {
        console.error('Error in registerUser:', error.message);
        res.status(500).send({ error: 'An internal server error occurred' });
    }
};