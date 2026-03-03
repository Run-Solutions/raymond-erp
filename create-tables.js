const mysql = require('/home/gabo/raymond-erp/apps/api/node_modules/mysql2');
const connection = mysql.createConnection({
  host: '143.198.60.56',
  port: 3306,
  user: 'AppSheet',
  password: 'U@7qV)F(k]15qQ%4H(ie',
  database: 'TallerR1',
  ssl: { rejectUnauthorized: false }
});

const queries = [
  'CREATE TABLE IF NOT EXISTS `evaluaciones_checklist` (`id_evaluacion` varchar(50) NOT NULL, `id_detalle` varchar(50) NOT NULL, `puntajes` json DEFAULT NULL, `fotos` json DEFAULT NULL, `porcentaje_total` double DEFAULT NULL, `semanas_renovacion` int DEFAULT NULL, `estado_montacargas` varchar(50) DEFAULT NULL, `fecha_creacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (`id_evaluacion`), KEY `idx_eval_detalle` (`id_detalle`), CONSTRAINT `evaluaciones_checklist_id_detalle_fkey` FOREIGN KEY (`id_detalle`) REFERENCES `entrada_detalle` (`id_detalles`) ON DELETE RESTRICT ON UPDATE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci',
  'CREATE TABLE IF NOT EXISTS `evaluaciones_accesorios` (`id_evaluacion_acc` varchar(50) NOT NULL, `id_accesorio` varchar(20) NOT NULL, `voltaje` double DEFAULT NULL, `condiciones` text, `parametros` json DEFAULT NULL, `clasificacion` varchar(50) DEFAULT NULL, `fecha_evaluacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (`id_evaluacion_acc`), KEY `idx_eval_acc` (`id_accesorio`), CONSTRAINT `evaluaciones_accesorios_id_accesorio_fkey` FOREIGN KEY (`id_accesorio`) REFERENCES `entrada_accesorios` (`id_accesorio`) ON DELETE RESTRICT ON UPDATE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci',
  'CREATE TABLE IF NOT EXISTS `historial_cargas` (`id_carga` varchar(50) NOT NULL, `id_accesorio` varchar(20) NOT NULL, `fecha_carga` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, `proxima_carga` datetime NOT NULL, `comentarios` text, PRIMARY KEY (`id_carga`), KEY `idx_carga_acc` (`id_accesorio`), CONSTRAINT `historial_cargas_id_accesorio_fkey` FOREIGN KEY (`id_accesorio`) REFERENCES `entrada_accesorios` (`id_accesorio`) ON DELETE RESTRICT ON UPDATE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci'
];

async function run() {
  connection.connect();
  for (const q of queries) {
    await new Promise((res, rej) => {
      connection.query(q, (err) => {
        if (err) {
          console.error('Query failed:', q);
          return rej(err);
        }
        console.log('Query success');
        res();
      });
    });
  }
  connection.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
