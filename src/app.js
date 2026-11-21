const express = require('express');
const path = require('path');

const categoriasRouter = require('./routes/categorias');
const fornecedoresRouter = require('./routes/fornecedores');
const produtosRouter = require('./routes/produtos');
const movimentacoesRouter = require('./routes/movimentacoes');
const estoqueRouter = require('./routes/estoque');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/categorias', categoriasRouter);
app.use('/api/fornecedores', fornecedoresRouter);
app.use('/api/produtos', produtosRouter);
app.use('/api/movimentacoes', movimentacoesRouter);
app.use('/api/estoque', estoqueRouter);

app.use('/api', (req, res) => res.status(404).json({ erro: 'Rota não encontrada' }));

app.use((err, req, res, next) => {
  if (err.code === '23505') {
    return res.status(409).json({ erro: 'Registro duplicado: ' + (err.detail || 'valor já cadastrado') });
  }
  if (err.code === '23503') {
    return res.status(409).json({ erro: 'Operação viola um relacionamento existente (registro em uso ou inexistente).' });
  }
  if (err.code === '23514' || err.code === '22P02') {
    return res.status(400).json({ erro: 'Dados inválidos.' });
  }
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ erro: err.status ? err.message : 'Erro interno do servidor' });
});

module.exports = app;
