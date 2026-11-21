# Sistema de Controle de Estoque

Aplicação web para cadastro de categorias, fornecedores e produtos, com registro de entradas e saídas de estoque, estorno de movimentações e painel com alertas de produtos abaixo do estoque mínimo.

# Como executar

Pré-requisitos: Node.js 18+ e PostgreSQL local ou via Docker.

```bash
# 1. Instalação postgreSQL
docker compose up -d

# 2. Configurar a conexão .env     

# 3. Instalar dependências e criar as tabelas
npm install
npm run db:init

# 4. Iniciar
npm start                 

