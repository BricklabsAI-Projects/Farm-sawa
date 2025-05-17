const userService = require('../services/userService');
const weatherService = require('../services/weatherService');

exports.getWeather = async (req, res) => {
    try {
        const { phoneNumber } = req.query;
        const user = await userService.getUser(phoneNumber);

        if (!user) {
            return res.status(404).send({ error: 'User not found' });
        }

        if (!user.latitude || !user.longitude) {
            return res.status(400).send({ error: 'User location is not set' });
        }

        const weatherData = await weatherService.getWeather(user.latitude, user.longitude);
        res.status(200).send(weatherData);
    } catch (error) {
        res.status(500).send({ error: 'An error occurred while fetching the weather data' });
    }
};