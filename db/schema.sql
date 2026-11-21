DROP TABLE IF EXISTS movimentacao;
DROP TABLE IF EXISTS produto;
DROP TABLE IF EXISTS fornecedor;
DROP TABLE IF EXISTS categoria;

CREATE TABLE categoria (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(80)  NOT NULL UNIQUE,
    descricao   VARCHAR(255),
    criado_em   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE fornecedor (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(120) NOT NULL,
    cnpj        VARCHAR(18)  NOT NULL UNIQUE,
    email       VARCHAR(120),
    telefone    VARCHAR(20),
    criado_em   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE produto (
    id                 SERIAL PRIMARY KEY,
    codigo             VARCHAR(30)    NOT NULL UNIQUE,
    nome               VARCHAR(120)   NOT NULL,
    descricao          VARCHAR(255),
    preco_unitario     NUMERIC(12,2)  NOT NULL CHECK (preco_unitario >= 0),
    quantidade_estoque INTEGER        NOT NULL DEFAULT 0 CHECK (quantidade_estoque >= 0),
    estoque_minimo     INTEGER        NOT NULL DEFAULT 0 CHECK (estoque_minimo >= 0),
    categoria_id       INTEGER        NOT NULL REFERENCES categoria(id) ON DELETE RESTRICT,
    fornecedor_id      INTEGER        REFERENCES fornecedor(id) ON DELETE SET NULL,
    criado_em          TIMESTAMP      NOT NULL DEFAULT NOW(),
    atualizado_em      TIMESTAMP      NOT NULL DEFAULT NOW()
);

CREATE TABLE movimentacao (
    id              SERIAL PRIMARY KEY,
    produto_id      INTEGER     NOT NULL REFERENCES produto(id) ON DELETE CASCADE,
    tipo            VARCHAR(7)  NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA')),
    quantidade      INTEGER     NOT NULL CHECK (quantidade > 0),
    observacao      VARCHAR(255),
    data_movimento  TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_produto_categoria   ON produto(categoria_id);
CREATE INDEX idx_produto_fornecedor  ON produto(fornecedor_id);
CREATE INDEX idx_movimentacao_produto ON movimentacao(produto_id);
