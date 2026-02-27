const mysql = require('mysql2/promise');

async function main() {
    const connection = await mysql.createConnection({
        user: 'AppSheet',
        password: 'U@7qV)F(k]15qQ%4H(ie',
        host: '143.198.60.56',
        database: 'TallerR1',
        ssl: { rejectUnauthorized: false }
    });

    console.log('Connected!');
    const [result] = await connection.execute(
        'DELETE FROM evaluaciones_checklist WHERE id_detalle NOT IN (SELECT id_detalles FROM entrada_detalle)'
    );
    console.log('Deleted rows:', result.affectedRows);
    await connection.end();
}

main().catch(console.error);
