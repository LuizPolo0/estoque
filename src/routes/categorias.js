const router = require('express').Router();
const db = require('../db');
const { HttpError, obrigatorio, idValido, wrap } = require('../validacao');

router.get('/', wrap(async (req, res) => {
  const busca = req.query.busca ? `%${req.query.busca}%` : '%';
  const { rows } = await db.query(
    `SELECT c.*, (SELECT COUNT(*) FROM produto p WHERE p.categoria_id = c.id)::int AS total_produtos
       FROM categoria c WHERE c.nome ILIKE $1 ORDER BY c.nome`,
    [busca]
  );
  res.json(rows);
}));

router.get('/:id', wrap(async (req, res) => {
  const id = idValido(req.params.id);
  const { rows } = await db.query('SELECT * FROM categoria WHERE id = $1', [id]);
  if (!rows.length) throw new HttpError(404, 'Categoria não encontrada.');
  res.json(rows[0]);
}));

router.post('/', wrap(async (req, res) => {
  const { nome, descricao } = req.body;
  obrigatorio(nome, 'nome');
  const { rows } = await db.query(
    'INSERT INTO categoria (nome, descricao) VALUES ($1, $2) RETURNING *',
    [nome.trim(), descricao || null]
  );
  res.status(201).json(rows[0]);
}));

router.put('/:id', wrap(async (req, res) => {
  const id = idValido(req.params.id);
  const { nome, descricao } = req.body;
  obrigatorio(nome, 'nome');
  const { rows } = await db.query(
    'UPDATE categoria SET nome = $1, descricao = $2 WHERE id = $3 RETURNING *',
    [nome.trim(), descricao || null, id]
  );
  if (!rows.length) throw new HttpError(404, 'Categoria não encontrada.');
  res.json(rows[0]);
}));

router.delete('/:id', wrap(async (req, res) => {
  const id = idValido(req.params.id);
  const vinculados = await db.query('SELECT COUNT(*)::int AS n FROM produto WHERE categoria_id = $1', [id]);
  if (vinculados.rows[0].n > 0) {
    throw new HttpError(409, 'Não é possível excluir: existem produtos vinculados a esta categoria.');
  }
  const { rowCount } = await db.query('DELETE FROM categoria WHERE id = $1', [id]);
  if (!rowCount) throw new HttpError(404, 'Categoria não encontrada.');
  res.status(204).end();
}));

module.exports = router;
