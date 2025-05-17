const { Pool } = require('pg');
const { DATABASE_URL } = require('./config');

console.log('Connecting to PostgreSQL:', DATABASE_URL);

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

pool.on('connect', () => {
    console.log('Connected to the database');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

module.exports = pool;