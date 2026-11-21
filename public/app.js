const $ = (sel) => document.querySelector(sel);
const moeda = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (d) => new Date(d).toLocaleString('pt-BR');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function api(url, opcoes = {}) {
  const resp = await fetch('/api' + url, {
    headers: { 'Content-Type': 'application/json' },
    ...opcoes,
    body: opcoes.body ? JSON.stringify(opcoes.body) : undefined,
  });
  if (resp.status === 204) return null;
  const dados = await resp.json();
  if (!resp.ok) throw new Error(dados.erro || 'Erro na requisição');
  return dados;
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('visivel');
  setTimeout(() => t.classList.remove('visivel'), 2500);
}

function linhaVazia(tbody, colunas, msg = 'Nenhum registro encontrado.') {
  tbody.innerHTML = `<tr><td colspan="${colunas}" class="vazio">${msg}</td></tr>`;
}

document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((b) => b.classList.remove('ativo'));
    document.querySelectorAll('.aba').forEach((s) => s.classList.remove('ativa'));
    btn.classList.add('ativo');
    $('#' + btn.dataset.aba).classList.add('ativa');
    carregar[btn.dataset.aba]();
  });
});

const carregar = {
  async painel() {
    const [r, alertas] = await Promise.all([api('/estoque/resumo'), api('/estoque/alertas')]);
    $('#cards-resumo').innerHTML = `
      <div class="card"><div class="rotulo">Produtos cadastrados</div><div class="valor">${r.total_produtos}</div></div>
      <div class="card"><div class="rotulo">Itens em estoque</div><div class="valor">${r.total_itens}</div></div>
      <div class="card"><div class="rotulo">Valor do estoque</div><div class="valor">${moeda(r.valor_total)}</div></div>
      <div class="card"><div class="rotulo">Abaixo do mínimo</div><div class="valor">${r.abaixo_minimo}</div></div>`;
    const tbA = $('#tb-alertas');
    if (!alertas.length) linhaVazia(tbA, 5, 'Nenhum produto abaixo do mínimo.');
    else tbA.innerHTML = alertas.map((p) => `
      <tr class="alerta"><td>${esc(p.codigo)}</td><td>${esc(p.nome)}</td>
      <td class="num">${p.quantidade_estoque}</td><td class="num">${p.estoque_minimo}</td>
      <td>${esc(p.fornecedor_nome || '—')}</td></tr>`).join('');
    $('#tb-por-categoria').innerHTML = r.por_categoria.map((c) => `
      <tr><td>${esc(c.categoria)}</td><td class="num">${c.produtos}</td>
      <td class="num">${c.itens}</td><td class="num">${moeda(c.valor)}</td></tr>`).join('');
  },

  async produtos() {
    const busca = encodeURIComponent($('#busca-produtos').value);
    const lista = await api('/produtos?busca=' + busca);
    const tb = $('#tb-produtos');
    if (!lista.length) return linhaVazia(tb, 8);
    tb.innerHTML = lista.map((p) => `
      <tr class="${p.abaixo_minimo ? 'alerta' : ''}">
        <td>${esc(p.codigo)}</td><td>${esc(p.nome)}</td><td>${esc(p.categoria_nome)}</td>
        <td>${esc(p.fornecedor_nome || '—')}</td><td class="num">${moeda(p.preco_unitario)}</td>
        <td class="num">${p.quantidade_estoque}</td><td class="num">${p.estoque_minimo}</td>
        <td class="acoes-linha">
          <button class="mini" onclick="abrirForm('produtos', ${p.id})">Editar</button>
          <button class="mini perigo" onclick="excluir('produtos', ${p.id})">Excluir</button>
        </td></tr>`).join('');
  },

  async categorias() {
    const busca = encodeURIComponent($('#busca-categorias').value);
    const lista = await api('/categorias?busca=' + busca);
    const tb = $('#tb-categorias');
    if (!lista.length) return linhaVazia(tb, 4);
    tb.innerHTML = lista.map((c) => `
      <tr><td>${esc(c.nome)}</td><td>${esc(c.descricao || '—')}</td><td class="num">${c.total_produtos}</td>
        <td class="acoes-linha">
          <button class="mini" onclick="abrirForm('categorias', ${c.id})">Editar</button>
          <button class="mini perigo" onclick="excluir('categorias', ${c.id})">Excluir</button>
        </td></tr>`).join('');
  },

  async fornecedores() {
    const busca = encodeURIComponent($('#busca-fornecedores').value);
    const lista = await api('/fornecedores?busca=' + busca);
    const tb = $('#tb-fornecedores');
    if (!lista.length) return linhaVazia(tb, 5);
    tb.innerHTML = lista.map((f) => `
      <tr><td>${esc(f.nome)}</td><td>${esc(f.cnpj)}</td><td>${esc(f.email || '—')}</td><td>${esc(f.telefone || '—')}</td>
        <td class="acoes-linha">
          <button class="mini" onclick="abrirForm('fornecedores', ${f.id})">Editar</button>
          <button class="mini perigo" onclick="excluir('fornecedores', ${f.id})">Excluir</button>
        </td></tr>`).join('');
  },

  async movimentacoes() {
    const tipo = $('#filtro-tipo').value;
    const lista = await api('/movimentacoes' + (tipo ? '?tipo=' + tipo : ''));
    const tb = $('#tb-movimentacoes');
    if (!lista.length) return linhaVazia(tb, 6);
    tb.innerHTML = lista.map((m) => `
      <tr><td>${dataBR(m.data_movimento)}</td><td>${esc(m.produto_codigo)} — ${esc(m.produto_nome)}</td>
        <td><span class="badge ${m.tipo}">${m.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}</span></td>
        <td class="num">${m.quantidade}</td><td>${esc(m.observacao || '—')}</td>
        <td class="acoes-linha">
          <button class="mini" onclick="abrirForm('movimentacoes', ${m.id})">Editar obs.</button>
          <button class="mini perigo" onclick="excluir('movimentacoes', ${m.id})">Estornar</button>
        </td></tr>`).join('');
  },
};

const formularios = {
  categorias: {
    titulo: 'Categoria', novo: 'Nova categoria',
    campos: async () => [
      { nome: 'nome', rotulo: 'Nome *', obrigatorio: true },
      { nome: 'descricao', rotulo: 'Descrição' },
    ],
  },
  fornecedores: {
    titulo: 'Fornecedor', novo: 'Novo fornecedor',
    campos: async () => [
      { nome: 'nome', rotulo: 'Razão social *', obrigatorio: true },
      { nome: 'cnpj', rotulo: 'CNPJ *', obrigatorio: true, placeholder: '00.000.000/0000-00' },
      { nome: 'email', rotulo: 'E-mail', tipo: 'email' },
      { nome: 'telefone', rotulo: 'Telefone' },
    ],
  },
  produtos: {
    titulo: 'Produto', novo: 'Novo produto',
    campos: async (registro) => {
      const [cats, forns] = await Promise.all([api('/categorias'), api('/fornecedores')]);
      const campos = [
        { nome: 'codigo', rotulo: 'Código *', obrigatorio: true },
        { nome: 'nome', rotulo: 'Nome *', obrigatorio: true },
        { nome: 'descricao', rotulo: 'Descrição' },
        { nome: 'preco_unitario', rotulo: 'Preço unitário (R$) *', tipo: 'number', step: '0.01', min: 0, obrigatorio: true },
        { nome: 'estoque_minimo', rotulo: 'Estoque mínimo', tipo: 'number', min: 0 },
        { nome: 'categoria_id', rotulo: 'Categoria *', tipo: 'select', obrigatorio: true,
          opcoes: cats.map((c) => [c.id, c.nome]) },
        { nome: 'fornecedor_id', rotulo: 'Fornecedor', tipo: 'select',
          opcoes: [['', '— nenhum —'], ...forns.map((f) => [f.id, f.nome])] },
      ];
      if (!registro) campos.splice(4, 0, { nome: 'quantidade_estoque', rotulo: 'Quantidade inicial', tipo: 'number', min: 0 });
      return campos;
    },
  },
  movimentacoes: {
    titulo: 'Movimentação', novo: 'Registrar movimentação',
    campos: async (registro) => {
      if (registro) return [{ nome: 'observacao', rotulo: 'Observação' }];
      const prods = await api('/produtos');
      return [
        { nome: 'produto_id', rotulo: 'Produto *', tipo: 'select', obrigatorio: true,
          opcoes: prods.map((p) => [p.id, `${p.codigo} — ${p.nome} (saldo: ${p.quantidade_estoque})`]) },
        { nome: 'tipo', rotulo: 'Tipo *', tipo: 'select', obrigatorio: true,
          opcoes: [['ENTRADA', 'Entrada'], ['SAIDA', 'Saída']] },
        { nome: 'quantidade', rotulo: 'Quantidade *', tipo: 'number', min: 1, obrigatorio: true },
        { nome: 'observacao', rotulo: 'Observação' },
      ];
    },
  },
};

let contexto = null;

function htmlCampo(c, valor) {
  const req = c.obrigatorio ? 'required' : '';
  const v = valor ?? '';
  if (c.tipo === 'select') {
    const ops = c.opcoes.map(([val, txt]) =>
      `<option value="${val}" ${String(val) === String(v) ? 'selected' : ''}>${esc(txt)}</option>`).join('');
    return `<label>${c.rotulo}</label><select name="${c.nome}" ${req}>${ops}</select>`;
  }
  const extras = [c.step && `step="${c.step}"`, c.min !== undefined && `min="${c.min}"`,
    c.placeholder && `placeholder="${c.placeholder}"`].filter(Boolean).join(' ');
  return `<label>${c.rotulo}</label><input name="${c.nome}" type="${c.tipo || 'text'}" value="${esc(v)}" ${extras} ${req} />`;
}

async function abrirForm(entidade, id = null) {
  const def = formularios[entidade];
  const registro = id ? await api(`/${entidade}/${id}`) : null;
  const campos = await def.campos(registro);
  contexto = { entidade, id };
  $('#form-titulo').textContent = id ? 'Editar ' + def.titulo.toLowerCase() : def.novo;
  $('#form-campos').innerHTML = campos.map((c) => htmlCampo(c, registro?.[c.nome])).join('');
  $('#form-erro').textContent = '';
  $('#modal').showModal();
}

function fecharModal() { $('#modal').close(); }

$('#form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const dados = Object.fromEntries(new FormData(ev.target).entries());
  const { entidade, id } = contexto;
  try {
    await api(`/${entidade}${id ? '/' + id : ''}`, { method: id ? 'PUT' : 'POST', body: dados });
    fecharModal();
    toast('Salvo com sucesso!');
    carregar[entidade]();
  } catch (err) {
    $('#form-erro').textContent = err.message;
  }
});

async function excluir(entidade, id) {
  const msg = entidade === 'movimentacoes'
    ? 'Confirma o estorno desta movimentação? O saldo do produto será ajustado.'
    : 'Confirma a exclusão deste registro?';
  if (!confirm(msg)) return;
  try {
    await api(`/${entidade}/${id}`, { method: 'DELETE' });
    toast('Registro excluído.');
    carregar[entidade]();
  } catch (err) {
    alert(err.message);
  }
}

let timer;
['produtos', 'categorias', 'fornecedores'].forEach((e) => {
  $('#busca-' + e).addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => carregar[e](), 300);
  });
});
$('#filtro-tipo').addEventListener('change', () => carregar.movimentacoes());

carregar.painel();
