const router = require('express').Router();
const db = require('../db');
const { HttpError, obrigatorio, idValido, wrap } = require('../validacao');

const CNPJ_REGEX = /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/;

function validar(body) {
  obrigatorio(body.nome, 'nome');
  obrigatorio(body.cnpj, 'cnpj');
  if (!CNPJ_REGEX.test(body.cnpj.trim())) {
    throw new HttpError(400, 'CNPJ em formato inválido (ex.: 12.345.678/0001-90).');
  }
  if (body.email && !/^\S+@\S+\.\S+$/.test(body.email)) {
    throw new HttpError(400, 'E-mail em formato inválido.');
  }
}

router.get('/', wrap(async (req, res) => {
  const busca = req.query.busca ? `%${req.query.busca}%` : '%';
  const { rows } = await db.query(
    'SELECT * FROM fornecedor WHERE nome ILIKE $1 OR cnpj ILIKE $1 ORDER BY nome',
    [busca]
  );
  res.json(rows);
}));

router.get('/:id', wrap(async (req, res) => {
  const id = idValido(req.params.id);
  const { rows } = await db.query('SELECT * FROM fornecedor WHERE id = $1', [id]);
  if (!rows.length) throw new HttpError(404, 'Fornecedor não encontrado.');
  res.json(rows[0]);
}));

router.post('/', wrap(async (req, res) => {
  validar(req.body);
  const { nome, cnpj, email, telefone } = req.body;
  const { rows } = await db.query(
    'INSERT INTO fornecedor (nome, cnpj, email, telefone) VALUES ($1, $2, $3, $4) RETURNING *',
    [nome.trim(), cnpj.trim(), email || null, telefone || null]
  );
  res.status(201).json(rows[0]);
}));

router.put('/:id', wrap(async (req, res) => {
  const id = idValido(req.params.id);
  validar(req.body);
  const { nome, cnpj, email, telefone } = req.body;
  const { rows } = await db.query(
    'UPDATE fornecedor SET nome = $1, cnpj = $2, email = $3, telefone = $4 WHERE id = $5 RETURNING *',
    [nome.trim(), cnpj.trim(), email || null, telefone || null, id]
  );
  if (!rows.length) throw new HttpError(404, 'Fornecedor não encontrado.');
  res.json(rows[0]);
}));

router.delete('/:id', wrap(async (req, res) => {
  const id = idValido(req.params.id);
  const { rowCount } = await db.query('DELETE FROM fornecedor WHERE id = $1', [id]);
  if (!rowCount) throw new HttpError(404, 'Fornecedor não encontrado.');
  res.status(204).end();
}));

module.exports = router;
