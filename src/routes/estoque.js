const router = require('express').Router();
const db = require('../db');
const { wrap } = require('../validacao');

router.get('/resumo', wrap(async (req, res) => {
  const resumo = await db.query(`
    SELECT COUNT(*)::int                                              AS total_produtos,
           COALESCE(SUM(quantidade_estoque), 0)::int                  AS total_itens,
           COALESCE(SUM(quantidade_estoque * preco_unitario), 0)::float AS valor_total,
           COUNT(*) FILTER (WHERE quantidade_estoque <= estoque_minimo)::int AS abaixo_minimo
      FROM produto`);
  const porCategoria = await db.query(`
    SELECT c.nome AS categoria,
           COUNT(p.id)::int AS produtos,
           COALESCE(SUM(p.quantidade_estoque), 0)::int AS itens,
           COALESCE(SUM(p.quantidade_estoque * p.preco_unitario), 0)::float AS valor
      FROM categoria c LEFT JOIN produto p ON p.categoria_id = c.id
     GROUP BY c.nome ORDER BY c.nome`);
  res.json({ ...resumo.rows[0], por_categoria: porCategoria.rows });
}));

router.get('/alertas', wrap(async (req, res) => {
  const { rows } = await db.query(`
    SELECT p.id, p.codigo, p.nome, p.quantidade_estoque, p.estoque_minimo,
           c.nome AS categoria_nome, f.nome AS fornecedor_nome, f.email AS fornecedor_email
      FROM produto p
      JOIN categoria c ON c.id = p.categoria_id
      LEFT JOIN fornecedor f ON f.id = p.fornecedor_id
     WHERE p.quantidade_estoque <= p.estoque_minimo
     ORDER BY (p.quantidade_estoque - p.estoque_minimo), p.nome`);
  res.json(rows);
}));

module.exports = router;
