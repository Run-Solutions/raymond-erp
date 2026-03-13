
const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
    const url = process.env.TALLER_R1_DATABASE_URL;
    if (!url) {
        console.error('TALLER_R1_DATABASE_URL not found in .env');
        process.exit(1);
    }

    // Parse mysql URL
    const connection = await mysql.createConnection(url);

    try {
        console.log('Connected to MySQL!');
        
        console.log('--- Table: renovado_solicitud ---');
        const [rows] = await connection.execute('SELECT * FROM renovado_solicitud LIMIT 10');
        console.log(`Found ${rows.length} rows.`);
        console.log(JSON.stringify(rows, null, 2));

        console.log('\nChecking for NULLs in required fields...');
        const [nullChecks] = await connection.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(id_solicitud IS NULL) as null_id,
                SUM(serial_equipo IS NULL) as null_serial,
                SUM(fecha_target IS NULL) as null_fecha
            FROM renovado_solicitud
        `);
        console.log(nullChecks[0]);

        console.log('\nChecking table structure...');
        const [structure] = await connection.execute('DESCRIBE renovado_solicitud');
        console.table(structure);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

main();
