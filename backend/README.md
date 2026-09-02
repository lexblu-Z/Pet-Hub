# PetHub Backend API

API REST em Node.js com Fastify, Prisma e PostgreSQL para o ecossistema PetHub.

## Requisitos
- Node.js
- PostgreSQL rodando localmente (porta 5432)

## Configuração

1. Copie o arquivo de variáveis de ambiente:
   ```bash
   cp .env.example .env
   ```
2. Edite o arquivo `.env` para incluir a senha correta do seu banco PostgreSQL e suas credenciais do Google OAuth.
3. Instale as dependências:
   ```bash
   npm install
   ```
4. Crie as tabelas no banco de dados:
   ```bash
   npx prisma db push
   ```
   *(Ou `npx prisma migrate dev` para gerar arquivos de migração)*
5. Gere o Prisma Client:
   ```bash
   npx prisma generate
   ```

## Rodando a Aplicação
```bash
# Modo desenvolvimento com hot-reload
npm run dev

# Para build
npm run build
npm start
```
