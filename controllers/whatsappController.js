const twilioClient = require('../utils/twilioClient');
const userService = require('../services/userService');
const termsAndConditions = require('../utils/termsConditions');
const db = require('../db');
const nlpService = require('../services/nlpService');
const weatherAPI = require('../integrations/weatherAPI');
const marketPriceAPI = require('../integrations/marketPriceAPI');
const cropManagementAPI = require('../integrations/cropManagementAPI');
const fileProcessingService = require('../services/fileProcessingService');
const deepLeafAPI = require('../integrations/deepLeafAPI');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const diseaseService = require('../services/diseaseService'); // Import the diseaseService

exports.receiveMessage = async (req, res) => {
    try {
        const message = req.body;
        console.log("Received message:", message); // Log the entire message object

        const phoneNumber = message.WaId;
        const body = message.Body.toLowerCase();

        // console.log('WaId:', phoneNumber);

        if (!phoneNumber || !body) {
            return res.status(400).send({ error: 'Invalid message structure' });
        }

        // Check if the user already exists
        let user = await userService.getUser(phoneNumber);

        if (!user) {
            // New user onboarding
            console.log('New user detected. Onboarding user:', phoneNumber);

            // Save the new user to the database
            await userService.registerUser(phoneNumber);

            // Send onboarding message
            const onboardingMessage = `
                Welcome to FarmSawa! 🌱

                We are your virtual assistant for all farming-related queries. Here’s what we can help you with:
                - Weather updates
                - Market prices
                - Disease detection
                - Crop management advice

                By continuing to use our services, you agree to our terms and conditions. For more details, visit: ${termsAndConditions.url}

                How can we assist you today? 😊
            `;

            await twilioClient.messages.create({
                from: process.env.TWILIO_PHONE_NUMBER,
                to: `whatsapp:${phoneNumber}`,
                body: onboardingMessage,
            });

            return res.status(200).send({ message: 'User onboarded successfully.' });
        }

        // Extract userId from the user object
        const userId = user.id;
        // Save the user's message in the database
        const userMessageQuery = `
            INSERT INTO messages (user_id, content, sender)
            VALUES ($1, $2, 'user')
            RETURNING id, content, sender, created_at;
        `;
        const userMessageValues = [userId, body];
        const userMessageResult = await db.query(userMessageQuery, userMessageValues);

        if (!userMessageResult.rows || userMessageResult.rows.length === 0) {
            throw new Error('Failed to save user message.');
        }

        // Process the message using NLP
        const nlpResponse = await nlpService.getNlpResponse(body); // Use 'body' instead of 'content'
        const { intent, parameters } = nlpResponse;

        // Log NLP output
        console.log(`NLP Output: Intent - ${intent}, Parameters - ${JSON.stringify(parameters)}`);

        let systemResponse;

        if (intent === 'weather') {
            const { location, time } = parameters;
            if (!location || !time) {
                systemResponse = 'Please provide both the location and time for the weather update.';
            } else {
                systemResponse = await weatherAPI.getWeather(location, time);
            }
        } else if (intent === 'market_prices') {
            const { product, location } = parameters;
            if (!product || !location) {
                systemResponse = 'Please provide both the product and location for the market price query.';
            } else {
                try {
                    systemResponse = await marketPriceAPI.getMarketPrices(product, location);
                } catch (error) {
                    systemResponse = error.message;
                }
            }
        } else if (intent === 'disease_detection') {
            try {
                const mediaUrl = message.MediaUrl0;

                if (!mediaUrl) {
                    systemResponse = 'No image was found. Please send a clear photo of the affected crop.';
                } else {
                    // Call diseaseService to detect disease and get summarized chunks
                    const messageChunks = await diseaseService.detectDisease(mediaUrl);

                    if (messageChunks && messageChunks.length > 0) {
                        // Combine all chunks into a single response for now
                        systemResponse = messageChunks.join('\n\n');
                    } else {
                        systemResponse = 'No response received from the DeepLeaf API. Please try again later.';
                    }
                }
            } catch (error) {
                console.error('Error in disease detection:', error.message);
                systemResponse = 'Failed to analyze the crop image for diseases. Please try again later.';
            }
        } else if (intent === 'salutations') {
            systemResponse = 'Hello! I am FarmSawa, your virtual assistant for all farming-related queries. How can I assist you today?Do you want to know the weather, detect a disease or know market prices?';
        } else if (intent === 'crop_management') {
            const { crop_name: cropName } = parameters;
            if (!cropName) {
                systemResponse = 'Please specify the crop you want advice on.';
            } else {
                try {
                    // Fetch crop management tips from cropManagementAPI
                    systemResponse = await cropManagementAPI.getCropManagementTips(cropName);
                } catch (error) {
                    console.error('Error handling crop management query:', error.message);
                    systemResponse = 'Failed to process your crop management query.';
                }
            }

        } else if (intent === 'disease_treatment') {
            const { disease_name: diseaseName } = parameters;
            if (!diseaseName) {
                systemResponse = 'Please specify the disease you want treatment information for.';
            } else {
                try {
                    const treatmentQuery = `
                        SELECT category_name, scientific_name, variety, chemical_product, company, active_ingredient, rate, information
                        FROM treatments
                        WHERE LOWER(category_name) LIKE LOWER($1) OR LOWER(scientific_name) LIKE LOWER($1);
                    `;
                    const treatmentValues = [`%${diseaseName}%`];
                    const treatmentResult = await db.query(treatmentQuery, treatmentValues);

                    if (treatmentResult.rows && treatmentResult.rows.length > 0) {
                        const treatment = treatmentResult.rows[0];

                        // Construct the treatment information
                        let treatmentInfo = `
                            Disease: ${treatment.category_name}
                            Scientific Name: ${treatment.scientific_name}
                            Variety: ${treatment.variety}
                            Treatment: ${treatment.chemical_product} by ${treatment.company}
                            Active Ingredient: ${treatment.active_ingredient}
                            Application Rate: ${treatment.rate}
                            Mode of Action: ${treatment.information}
                        `;

                        // Pass the treatment information through NLP for summarization
                        const nlpResponse = await nlpService.processText(treatmentInfo);
                        systemResponse = `Here is the treatment information for "${diseaseName}":\n\n${nlpResponse}`;
                    } else {
                        systemResponse = `No treatment information found for the disease: ${diseaseName}.`;
                    }
                } catch (error) {
                    console.error('Error fetching treatment information:', error.message);
                    systemResponse = 'Failed to retrieve treatment information. Please try again later.';
                }
            }
        } else if (intent === 'product_suppliers') {
            const { product_name: productName, location } = parameters;
            if (!productName || !location) {
                systemResponse = 'Please provide both the product name and location to find suppliers.';
            } else {
                try {
                    const supplierQuery = `
                        SELECT supplier_name, product_name, price
                        FROM suppliers
                        WHERE product_name = $1 AND location = $2;
                    `;
                    const supplierValues = [productName, location];
                    const supplierResult = await db.query(supplierQuery, supplierValues);

                    if (supplierResult.rows && supplierResult.rows.length > 0) {
                        const suppliers = supplierResult.rows;
                        systemResponse = `
                            Suppliers for ${productName} in ${location} (Paid Ads):
                            ${suppliers.map(supplier => `
                                - ${supplier.supplier_name}: ${supplier.product_name} at ${supplier.price}
                            `).join('\n')}
                        `;
                    } else {
                        systemResponse = `No suppliers found for ${productName} in ${location}.`;
                    }
                } catch (error) {
                    console.error('Error fetching supplier information:', error.message);
                    systemResponse = 'Failed to retrieve supplier information. Please try again later.';
                }
            }
        } else {
            // Handle unknown intents
            systemResponse = `I couldn't understand your request. Here are the services I can assist with:
            - Weather updates
            - Market prices
            - Disease detection
            - Crop management advice

            Please try rephrasing your question or specifying the service you need.`;
        }

        console.log(`System Response: ${systemResponse}`);

        // Save the system's response in the database
        const systemMessageQuery = `
            INSERT INTO messages (user_id, content, sender)
            VALUES ($1, $2, 'system')
            RETURNING id, content, sender, created_at;
        `;
        const systemMessageValues = [userId, systemResponse];
        const systemMessageResult = await db.query(systemMessageQuery, systemMessageValues);

        if (!systemMessageResult.rows || systemMessageResult.rows.length === 0) {
            throw new Error('Failed to save system message.');
        }

        // Send the system response back to the user via WhatsApp
        await twilioClient.messages.create({
            from: process.env.TWILIO_PHONE_NUMBER,
            to: `whatsapp:${phoneNumber}`,
            body: systemResponse,
        });

        res.status(200).json({
            userMessage: userMessageResult.rows[0],
            systemMessage: systemMessageResult.rows[0],
        });
    } catch (error) {
        console.error('Error handling message:', error.message);
        res.status(500).json({ error: 'Failed to handle message', details: error.message });
    }
};