const userService = require('../services/userService');
const db = require('../db');
const nlpService = require('../services/nlpService');
const weatherAPI = require('../integrations/weatherAPI');
const marketPriceAPI = require('../integrations/marketPriceAPI');
const cropManagementAPI = require('../integrations/cropManagementAPI');
const fileProcessingService = require('../services/fileProcessingService');
const deepLeafAPI = require('../integrations/deepLeafAPI');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

exports.register = async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;
        console.log('Registering user via custom chat with phone number:', phoneNumber);
        const userExists = await userService.getUser(phoneNumber);

        if (userExists) {
            console.log('User with phone number already exists:', phoneNumber);
            return res.status(400).send({ error: 'User with this phone number already exists' });
        }

        // const verificationCode = Math.floor(100000 + Math.random() * 900000).toString(); // Generate 6-digit code
        // await userService.registerUser(phoneNumber, password, verificationCode);

        console.log('Verification code generated and stored:', verificationCode);
        res.status(200).send({ message: 'User registered successfully. Use the verification code sent to your phone to complete registration.' });
    } catch (error) {
        console.error('Error in registerUser:', error.message);
        res.status(500).send({ error: 'An internal server error occurred' });
    }
};

exports.login = async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;
        console.log('Logging in user via custom chat with phone number:', phoneNumber);

        const user = await userService.verifyUser(phoneNumber, password);

        if (!user) {
            return res.status(401).send({ error: 'Invalid phone number or password' });
        }
        
        // Return user details on login
        res.status(200).send({ message: 'Login successful', user });
    } catch (error) {
        console.error('Error in login:', error.message);
        res.status(500).send({ error: 'An internal server error occurred' });
    }
};

exports.handleMessage = async (req, res) => {
    try {
        const { userId, content } = req.body;

        if (!userId || !content) {
            return res.status(400).json({ error: 'User ID and message content are required.' });
        }

        // Log user input
        console.log(`User Input: ${content}`);

        // Save the user's message
        const userMessageQuery = `
            INSERT INTO messages (user_id, content, sender)
            VALUES ($1, $2, 'user')
            RETURNING id, content, sender, created_at;
        `;
        const userMessageValues = [userId, content];
        const userMessageResult = await db.query(userMessageQuery, userMessageValues);

        if (!userMessageResult.rows || userMessageResult.rows.length === 0) {
            throw new Error('Failed to save user message.');
        }

        // Process the message using NLP
        const nlpResponse = await nlpService.getNlpResponse(content);
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
        }else if (intent === 'disease_detection') {
            try {
                // Step 1: Download the image if it's a URL
                const imageFilePath = path.join(__dirname, '../temp', 'uploaded-image.jpg');
                if (parameters.imageFile.startsWith('http')) {
                    const response = await axios({
                        url: parameters.imageFile,
                        method: 'GET',
                        responseType: 'stream',
                    });
                    const writer = fs.createWriteStream(imageFilePath);
                    response.data.pipe(writer);
                    await new Promise((resolve, reject) => {
                        writer.on('finish', resolve);
                        writer.on('error', reject);
                    });
                } else {
                    // Assume it's a local file path
                    if (!fs.existsSync(parameters.imageFile)) {
                        throw new Error(`Image file not found: ${parameters.imageFile}`);
                    }
                }

                // Step 2: Detect the disease using deepLeafAPI
                const detectionResult = await deepLeafAPI.analyzeCropDisease(imageFilePath);

                if (detectionResult && detectionResult.disease) {
                    const detectedDisease = detectionResult.disease;

                    // Step 3: Query the database for treatment methods
                    const treatmentQuery = `
                        SELECT category_name, scientific_name, variety, chemical_product, company, active_ingredient, rate, information
                        FROM treatments
                        WHERE category_name = $1;
                    `;
                    const treatmentValues = [detectedDisease];
                    const treatmentResult = await db.query(treatmentQuery, treatmentValues);

                    if (treatmentResult.rows && treatmentResult.rows.length > 0) {
                        const treatment = treatmentResult.rows[0];

                        // Step 4: Query the database for suppliers of the active ingredient
                        const supplierQuery = `
                            SELECT supplier_name, product_name, price
                            FROM suppliers
                            WHERE active_ingredient = $1;
                        `;
                        const supplierValues = [treatment.active_ingredient];
                        const supplierResult = await db.query(supplierQuery, supplierValues);

                        if (supplierResult.rows && supplierResult.rows.length > 0) {
                            const suppliers = supplierResult.rows;

                            // Step 5: Construct the response with disease, treatment, and supplier data
                            systemResponse = `
                                Disease Detected: ${detectedDisease}
                                Scientific Name: ${treatment.scientific_name}
                                Treatment: ${treatment.chemical_product} by ${treatment.company}
                                Active Ingredient: ${treatment.active_ingredient}
                                Application Rate: ${treatment.rate}
                                Mode of Action: ${treatment.information}

                                Suppliers:
                                ${suppliers.map(supplier => `
                                    - ${supplier.supplier_name}: ${supplier.product_name} at ${supplier.price}
                                `).join('\n')}
                            `;
                        } else {
                            // No suppliers found, return only disease and treatment data
                            systemResponse = `
                                Disease Detected: ${detectedDisease}
                                Scientific Name: ${treatment.scientific_name}
                                Treatment: ${treatment.chemical_product} by ${treatment.company}
                                Active Ingredient: ${treatment.active_ingredient}
                                Application Rate: ${treatment.rate}
                                Mode of Action: ${treatment.information}

                                No suppliers found for the active ingredient.
                            `;
                        }
                    } else {
                        // No treatment data found, return only the detected disease
                        systemResponse = `Disease Detected: ${detectedDisease}. No treatment information available in the database.`;
                    }
                } else {
                    // No disease detected
                    systemResponse = 'No disease was detected in the uploaded image. Please ensure the image is clear and try again.';
                }
            } catch (error) {
                console.error('Error in disease detection:', error.message);
                systemResponse = 'Failed to analyze the crop image for diseases. Please try again later.';
            } finally {
                // Clean up the temporary file
                if (fs.existsSync(imageFilePath)) {
                    fs.unlinkSync(imageFilePath);
                }
            }
        }else if (intent === 'salutations') {
            systemResponse = 'Hello! I am FarmSawa, your virtual assistant for all farming-related queries. How can I assist you today?Do you want to know the weather, detect a disease or know market prices?';
        }else if (intent === 'crop_management') {
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
            
        } else {
            // Handle unknown intents
            systemResponse = `I couldn't understand your request. Here are the services I can assist with:
            - Weather updates
            - Market prices
            - Disease detection
            - Crop management advice

            Please try rephrasing your question or specifying the service you need.`;
        }

        // Log system response
        console.log(`System Response: ${systemResponse}`);

        // Save the system's response
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

        res.status(201).json({
            userMessage: userMessageResult.rows[0],
            systemMessage: systemMessageResult.rows[0],
        });
    } catch (error) {
        console.error('Error handling message:', error);
        res.status(500).json({ error: 'Failed to handle message', details: error.message });
    }
};

exports.getUserMessages = async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required.' });
        }

        console.log(`Fetching messages for user ID: ${userId}`);

        // Query to fetch user and system messages for the given user ID
        const query = `
            SELECT id, content, sender, created_at
            FROM messages
            WHERE user_id = $1
            ORDER BY created_at ASC;
        `;
        const values = [userId];
        const result = await db.query(query, values);

        if (!result.rows || result.rows.length === 0) {
            return res.status(404).json({ error: 'No messages found for this user.' });
        }

        // Return the messages
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching user messages:', error.message);
        res.status(500).json({ error: 'Failed to fetch user messages', details: error.message });
    }
};