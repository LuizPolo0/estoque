const router = require('express').Router();
const db = require('../db');
const { HttpError, obrigatorio, inteiroNaoNegativo, idValido, wrap } = require('../validacao');

const SELECT_PRODUTO = `
  SELECT p.*, c.nome AS categoria_nome, f.nome AS fornecedor_nome,
         (p.quantidade_estoque <= p.estoque_minimo) AS abaixo_minimo
    FROM produto p
    JOIN categoria c ON c.id = p.categoria_id
    LEFT JOIN fornecedor f ON f.id = p.fornecedor_id`;

function validar(body) {
  obrigatorio(body.codigo, 'codigo');
  obrigatorio(body.nome, 'nome');
  obrigatorio(body.preco_unitario, 'preco_unitario');
  obrigatorio(body.categoria_id, 'categoria_id');
  const preco = Number(body.preco_unitario);
  if (Number.isNaN(preco) || preco < 0) throw new HttpError(400, 'Preço unitário inválido.');
  return {
    codigo: body.codigo.trim(),
    nome: body.nome.trim(),
    descricao: body.descricao || null,
    preco_unitario: preco,
    estoque_minimo: inteiroNaoNegativo(body.estoque_minimo ?? 0, 'estoque_minimo'),
    categoria_id: idValido(body.categoria_id),
    fornecedor_id: body.fornecedor_id ? idValido(body.fornecedor_id) : null,
  };
}

router.get('/', wrap(async (req, res) => {
  const busca = req.query.busca ? `%${req.query.busca}%` : '%';
  const { rows } = await db.query(
    `${SELECT_PRODUTO} WHERE p.nome ILIKE $1 OR p.codigo ILIKE $1 ORDER BY p.nome`,
    [busca]
  );
  res.json(rows);
}));

router.get('/:id', wrap(async (req, res) => {
  const id = idValido(req.params.id);
  const { rows } = await db.query(`${SELECT_PRODUTO} WHERE p.id = $1`, [id]);
  if (!rows.length) throw new HttpError(404, 'Produto não encontrado.');
  res.json(rows[0]);
}));

router.post('/', wrap(async (req, res) => {
  const p = validar(req.body);
  const qtdInicial = inteiroNaoNegativo(req.body.quantidade_estoque ?? 0, 'quantidade_estoque');
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO produto (codigo, nome, descricao, preco_unitario, quantidade_estoque, estoque_minimo, categoria_id, fornecedor_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [p.codigo, p.nome, p.descricao, p.preco_unitario, qtdInicial, p.estoque_minimo, p.categoria_id, p.fornecedor_id]
    );
    if (qtdInicial > 0) {
      await client.query(
        `INSERT INTO movimentacao (produto_id, tipo, quantidade, observacao) VALUES ($1, 'ENTRADA', $2, 'Estoque inicial')`,
        [rows[0].id, qtdInicial]
      );
    }
    await client.query('COMMIT');
    const criado = await db.query(`${SELECT_PRODUTO} WHERE p.id = $1`, [rows[0].id]);
    res.status(201).json(criado.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

router.put('/:id', wrap(async (req, res) => {
  const id = idValido(req.params.id);
  const p = validar(req.body);
  const { rowCount } = await db.query(
    `UPDATE produto SET codigo = $1, nome = $2, descricao = $3, preco_unitario = $4,
            estoque_minimo = $5, categoria_id = $6, fornecedor_id = $7, atualizado_em = NOW()
      WHERE id = $8`,
    [p.codigo, p.nome, p.descricao, p.preco_unitario, p.estoque_minimo, p.categoria_id, p.fornecedor_id, id]
  );
  if (!rowCount) throw new HttpError(404, 'Produto não encontrado.');
  const { rows } = await db.query(`${SELECT_PRODUTO} WHERE p.id = $1`, [id]);
  res.json(rows[0]);
}));

router.delete('/:id', wrap(async (req, res) => {
  const id = idValido(req.params.id);
  const { rowCount } = await db.query('DELETE FROM produto WHERE id = $1', [id]);
  if (!rowCount) throw new HttpError(404, 'Produto não encontrado.');
  res.status(204).end();
}));

module.exports = router;
