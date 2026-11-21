// Cria as tabelas e insere os dados de exemplo (db/schema.sql)
const fs = require('fs');
const path = require('path');
const db = require('./db');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  try {
    await db.query(sql);
    console.log('Banco de dados inicializado com sucesso.');
  } catch (err) {
    console.error('Erro ao inicializar o banco:', err.message);
    process.exitCode = 1;
  } finally {
    await db.pool.end();
  }
})();
