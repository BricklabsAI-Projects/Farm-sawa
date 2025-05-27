const pool = require('../db');

const registerUser = async (phoneNumber, password) => {
    try {
        const result = await pool.query(
            'INSERT INTO users (phone_number, password) VALUES ($1, $2) ON CONFLICT (phone_number) DO NOTHING RETURNING id',
            [phoneNumber, password]
        );
        console.log('User registration result:', result);
        return result.rowCount > 0;
    } catch (error) {
        console.error('Error in registerUserWithPhone:', error);
        throw error;
    }
};

// const verifyUser = async (phoneNumber, password) => {
//     try {
//         const result = await pool.query('SELECT * FROM users WHERE phone_number = $1 AND password = $2', [phoneNumber, password]);
//         if (result.rowCount === 0) throw new Error('Verification failed');
//         console.log('User verified:', result.rows[0]);
//         return result.rows[0];
//     } catch (error) {
//         console.error('Error in verifyUser:', error);
//         throw error;
//     }
// };

// const verifyUserByCode = async (phoneNumber, code) => {
//     try {
//         const result = await pool.query('SELECT * FROM users WHERE phone_number = $1 AND verification_code = $2', [phoneNumber, code]);
//         if (result.rowCount === 0) throw new Error('Verification failed');
//         await pool.query('UPDATE users SET whatsapp_verified = TRUE WHERE phone_number = $1', [phoneNumber]);
//         console.log('User verified by code:', result.rows[0]);
//         return result.rows[0];
//     } catch (error) {
//         console.error('Error in verifyUserByCode:', error);
//         throw error;
//     }
// };

const getUser = async (phoneNumber) => {
    try {
        const result = await pool.query('SELECT * FROM users WHERE phone_number = $1', [phoneNumber]);
      //  console.log('Get user result:', result);
        return result.rows[0];
    } catch (error) {
        console.error('Error in getUser:', error);
        throw error;
    }
};

module.exports = {
    registerUser,
    // verifyUser,
    // verifyUserByCode,
    getUser
};