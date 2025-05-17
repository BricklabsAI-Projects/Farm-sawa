const pool = require('../db');

const getMarketPrice = async (crop, location) => {
    const result = await pool.query(
        'SELECT * FROM market_prices WHERE crop = $1 AND location = $2',
        [crop, location]
    );

    return result.rows;
};

module.exports = {
    getMarketPrice
};