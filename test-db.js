const { Client } = require('pg');

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'vybe_financas_dev',
    password: 'admin',
    port: 5432,
});

async function testConnection() {
    try {
        await client.connect();
        console.log('Connected successfully!');
        await client.end();
    } catch (err) {
        console.error('Connection error:', err.message);
        if (err.code === '3D000') {
            console.log('HINT: The database "vybe_financas_dev" does not exist.');
        } else if (err.code === '28P01') {
            console.log('HINT: Password authentication failed.');
        }
        process.exit(1);
    }
}

testConnection();
