const pool = require('../db');

const getSuppliersByProductAndLocation = async (product, location) => {
    const result = await pool.query(
        `
        SELECT * FROM suppliers 
        WHERE $1 = ANY(products) 
        AND address ILIKE $2
        `, [product, `%${location}%`]
    );

    return result.rows;
};

module.exports = {
    getSuppliersByProductAndLocation
};