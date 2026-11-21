const router = require('express').Router();
const db = require('../db');
const { HttpError, obrigatorio, idValido, wrap } = require('../validacao');

const SELECT_MOV = `
  SELECT m.*, p.codigo AS produto_codigo, p.nome AS produto_nome
    FROM movimentacao m
    JOIN produto p ON p.id = m.produto_id`;

router.get('/', wrap(async (req, res) => {
  const filtros = [];
  const params = [];
  if (req.query.produto_id) {
    params.push(idValido(req.query.produto_id));
    filtros.push(`m.produto_id = $${params.length}`);
  }
  if (req.query.tipo) {
    params.push(String(req.query.tipo).toUpperCase());
    filtros.push(`m.tipo = $${params.length}`);
  }
  const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';
  const { rows } = await db.query(`${SELECT_MOV} ${where} ORDER BY m.data_movimento DESC, m.id DESC`, params);
  res.json(rows);
}));

router.get('/:id', wrap(async (req, res) => {
  const id = idValido(req.params.id);
  const { rows } = await db.query(`${SELECT_MOV} WHERE m.id = $1`, [id]);
  if (!rows.length) throw new HttpError(404, 'Movimentação não encontrada.');
  res.json(rows[0]);
}));

router.post('/', wrap(async (req, res) => {
  const { produto_id, tipo, quantidade, observacao } = req.body;
  obrigatorio(produto_id, 'produto_id');
  obrigatorio(tipo, 'tipo');
  obrigatorio(quantidade, 'quantidade');
  const tipoNorm = String(tipo).toUpperCase();
  if (!['ENTRADA', 'SAIDA'].includes(tipoNorm)) throw new HttpError(400, 'Tipo deve ser ENTRADA ou SAIDA.');
  const qtd = Number(quantidade);
  if (!Number.isInteger(qtd) || qtd <= 0) throw new HttpError(400, 'Quantidade deve ser um inteiro maior que zero.');
  const pid = idValido(produto_id);

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const prod = await client.query('SELECT quantidade_estoque FROM produto WHERE id = $1 FOR UPDATE', [pid]);
    if (!prod.rows.length) throw new HttpError(404, 'Produto não encontrado.');
    const saldo = prod.rows[0].quantidade_estoque;
    if (tipoNorm === 'SAIDA' && qtd > saldo) {
      throw new HttpError(422, `Estoque insuficiente. Saldo atual: ${saldo}.`);
    }
    const delta = tipoNorm === 'ENTRADA' ? qtd : -qtd;
    await client.query(
      'UPDATE produto SET quantidade_estoque = quantidade_estoque + $1, atualizado_em = NOW() WHERE id = $2',
      [delta, pid]
    );
    const { rows } = await client.query(
      'INSERT INTO movimentacao (produto_id, tipo, quantidade, observacao) VALUES ($1, $2, $3, $4) RETURNING id',
      [pid, tipoNorm, qtd, observacao || null]
    );
    await client.query('COMMIT');
    const criada = await db.query(`${SELECT_MOV} WHERE m.id = $1`, [rows[0].id]);
    res.status(201).json(criada.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

router.put('/:id', wrap(async (req, res) => {
  const id = idValido(req.params.id);
  const { rowCount } = await db.query('UPDATE movimentacao SET observacao = $1 WHERE id = $2', [req.body.observacao || null, id]);
  if (!rowCount) throw new HttpError(404, 'Movimentação não encontrada.');
  const { rows } = await db.query(`${SELECT_MOV} WHERE m.id = $1`, [id]);
  res.json(rows[0]);
}));

router.delete('/:id', wrap(async (req, res) => {
  const id = idValido(req.params.id);
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const mov = await client.query('SELECT * FROM movimentacao WHERE id = $1', [id]);
    if (!mov.rows.length) throw new HttpError(404, 'Movimentação não encontrada.');
    const m = mov.rows[0];
    const prod = await client.query('SELECT quantidade_estoque FROM produto WHERE id = $1 FOR UPDATE', [m.produto_id]);
    const delta = m.tipo === 'ENTRADA' ? -m.quantidade : m.quantidade;
    if (prod.rows[0].quantidade_estoque + delta < 0) {
      throw new HttpError(422, 'Estorno deixaria o estoque negativo.');
    }
    await client.query(
      'UPDATE produto SET quantidade_estoque = quantidade_estoque + $1, atualizado_em = NOW() WHERE id = $2',
      [delta, m.produto_id]
    );
    await client.query('DELETE FROM movimentacao WHERE id = $1', [id]);
    await client.query('COMMIT');
    res.status(204).end();
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

module.exports = router;
