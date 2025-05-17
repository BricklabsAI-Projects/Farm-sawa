const axios = require('axios');
const { TOMORROW_API_KEY } = require('../config');

const getWeather = async (latitude, longitude) => {
    try {
        console.log('Fetching weather data for coordinates:', { latitude, longitude });
        const response = await axios.get('https://api.tomorrow.io/v4/weather/forecast', {
            params: {
                location: `${latitude},${longitude}`,
                apikey: TOMORROW_API_KEY
            }
        });
        console.log('Weather data response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error fetching weather data:', error);
        throw error;
    }
};

module.exports = {
    getWeather
};