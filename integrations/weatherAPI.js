const axios = require('axios');

// Configuration for the Weather API
const WEATHER_API_URL = 'https://api.weatherapi.com/v1/forecast.json';
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

// Configuration for Azure OpenAI
const AZURE_OPENAI_URL = process.env.AZURE_OPENAI_URL || 'https://ai-ctoai762503402280.openai.azure.com/openai/deployments/gpt-4/chat/completions?api-version=2025-01-01-preview';
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;

const MAX_WHATSAPP_MESSAGE_LENGTH = 1600;

module.exports = {
    getWeather: async (city, date) => {
        try {
            // Validate input
            if (!city) {
                throw new Error("City name is required for the weather query.");
            }

            // Format the date if provided, otherwise default to today
            const formattedDate = date || new Date().toISOString().split('T')[0];

            // Make the API request
            const response = await axios.get(WEATHER_API_URL, {
                params: {
                    key: WEATHER_API_KEY,
                    q: city,
                    dt: formattedDate,
                    alerts: 'yes',
                    aqi: 'no',
                },
            });

            // Extract relevant data from the response
            const location = response.data.location;
            const forecast = response.data.forecast.forecastday[0];
            const condition = forecast.day.condition.text;
            const maxTemp = forecast.day.maxtemp_c;
            const minTemp = forecast.day.mintemp_c;
            const avgTemp = forecast.day.avgtemp_c;
            const maxWind = forecast.day.maxwind_kph;
            const totalPrecip = forecast.day.totalprecip_mm;
            const avgHumidity = forecast.day.avghumidity;
            const uvIndex = forecast.day.uv;
            const sunrise = forecast.astro.sunrise;
            const sunset = forecast.astro.sunset;

            // Identify significant weather events
            const significantHours = forecast.hour.filter(
                (hour) => hour.chance_of_rain > 50 || hour.chance_of_snow > 50
            );

            // Format significant weather events
            const significantEvents = significantHours.map(
                (hour) => ({
                    time: hour.time,
                    temp: hour.temp_c,
                    condition: hour.condition.text,
                    chance_of_rain: hour.chance_of_rain,
                    chance_of_snow: hour.chance_of_snow,
                })
            );

            // Prepare weather data for Azure OpenAI
            const weatherData = {
                location: {
                    name: location.name,
                    region: location.region,
                    country: location.country,
                },
                date: formattedDate,
                condition,
                maxTemp,
                minTemp,
                avgTemp,
                maxWind,
                totalPrecip,
                avgHumidity,
                uvIndex,
                sunrise,
                sunset,
                significantEvents,
            };

            // Send weather data to Azure OpenAI for explanation
            const explanationResponse = await axios.post(
                AZURE_OPENAI_URL,
                {
                    messages: [
                        {
                            role: 'system',
                            content: `You are a weather assistant. Your job is to explain weather data in a simple and user-friendly way. Use Markdown-like formatting for structure and readability. Include key highlights and an hourly breakdown. Do not display the hourly breakdown as a markdown table. Well styled. Ensure the response is concise and does not exceed 1600 characters.`,
                        },
                        { role: 'user', content: `Weather Data: ${JSON.stringify(weatherData)}` },
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

            // Extract the explanation from the Azure OpenAI response
            const weatherSummary = explanationResponse.data.choices[0].message.content;

            // Split the summary into chunks if it exceeds the character limit
            const messageChunks = [];
            let currentChunk = '';

            weatherSummary.split('\n').forEach((line) => {
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
            console.error('Error calling Weather API or Azure OpenAI:', error.message);

            // Handle specific API errors
            if (error.response) {
                const { code, message } = error.response.data;
                if (code === 1006) {
                    throw new Error("No location found matching the provided city name.");
                } else if (code === 1002 || code === 2006) {
                    throw new Error("Invalid or missing API key for the Weather API.");
                } else if (code === 2007) {
                    throw new Error("API key has exceeded the monthly quota.");
                }
            }

            throw new Error("Failed to fetch or process weather data.");
        }
    },
};