const bcrypt = require('bcrypt');
const db = require('../db');
const userService = require('../services/userService');

exports.register = async (req, res) => {
    const { phone_number, profile_name, password } = req.body;

    if (!phone_number || !password) {
        return res.status(400).json({ error: 'Phone number and password are required' });
    }

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        const query = `
            INSERT INTO users (phone_number, profile_name, password, created_at)
            VALUES ($1, $2, $3, NOW())
            RETURNING id;
        `;
        const values = [phone_number, profile_name || null, hashedPassword];
        const result = await db.query(query, values);

        res.status(201).json({ userId: result.rows[0].id });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
};

exports.login = async (req, res) => {
    const { phone_number, password } = req.body;

    if (!phone_number || !password) {
        return res.status(400).json({ error: 'Phone number and password are required' });
    }

    try {
        const query = `
            SELECT id, password FROM users WHERE phone_number = $1;
        `;
        const values = [phone_number];
        const result = await db.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];

        // Compare the provided password with the hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        res.status(200).json({ userId: user.id });
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ error: 'Failed to log in user' });
    }
};

exports.updateProfileName = async (req, res) => {
    const { userId, profile_name } = req.body;

    if (!userId || !profile_name) {
        return res.status(400).json({ error: 'User ID and profile name are required' });
    }

    try {
        const query = `
            UPDATE users
            SET profile_name = $1
            WHERE id = $2
            RETURNING profile_name;
        `;
        const values = [profile_name, userId];
        const result = await db.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({ profile_name: result.rows[0].profile_name });
    } catch (error) {
        console.error('Error updating profile name:', error);
        res.status(500).json({ error: 'Failed to update profile name' });
    }
};

exports.saveMessage = async (req, res) => {
    const { userId, content } = req.body;

    if (!userId || !content) {
        return res.status(400).json({ error: 'User ID and message content are required' });
    }

    try {
        router.get('/messages', userController.getMessages);        // Save the user's message
        const userMessageQuery = `
            INSERT INTO messages (user_id, content, sender)
            VALUES ($1, $2, 'user')
            RETURNING id, content, sender, created_at;
        `;
        const userMessageValues = [userId, content];
        const userMessageResult = await db.query(userMessageQuery, userMessageValues);

        // Generate a system response (placeholder logic)
        const systemResponse = `You said: "${content}"`;

        const systemMessageQuery = `
            INSERT INTO messages (user_id, content, sender)
            VALUES ($1, $2, 'system')
            RETURNING id, content, sender, created_at;
        `;
        const systemMessageValues = [userId, systemResponse];
        const systemMessageResult = await db.query(systemMessageQuery, systemMessageValues);

        res.status(201).json({
            userMessage: userMessageResult.rows[0],
            systemMessage: systemMessageResult.rows[0],
        });
    } catch (error) {
        console.error('Error saving message:', error);
        res.status(500).json({ error: 'Failed to save message' });
    }
};

exports.getMessages = async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        const query = `
            SELECT id, content, sender, created_at
            FROM messages
            WHERE user_id = $1
            ORDER BY created_at ASC;
        `;
        const values = [userId];
        const result = await db.query(query, values);

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error retrieving messages:', error);
        res.status(500).json({ error: 'Failed to retrieve messages' });
    }
};