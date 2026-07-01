# Ecotech Platform

Ecotech é uma plataforma educativa desenvolvida com NestJS (Backend) e Next.js (Frontend), estruturada em um Monorepo usando Turborepo. O projeto tem o objetivo de promover o conhecimento ambiental, catalogação de trilhas e pontos educativos, gerando inclusive PDFs e QR Codes offline.

## 🚀 Tecnologias Principais

- **Monorepo**: Turborepo (com PNPM Workspaces)
- **Frontend**: Next.js 15 (App Router), React, TailwindCSS, NextAuth.js (Auth.js v5)
- **Backend**: NestJS, Prisma ORM, PostgreSQL
- **Infraestrutura**: Docker e Docker Compose

---

## 🛠 Pré-requisitos

Certifique-se de ter os seguintes softwares instalados na sua máquina:

1. **Node.js** (Versão 20+)
2. **PNPM** (Gerenciador de pacotes rápido e eficiente)
   ```bash
   npm install -g pnpm
   ```
3. **Docker** e **Docker Compose** (Para rodar o banco de dados e outros serviços)

---

## 🏗 Setup e Instalação

Siga este passo a passo para rodar o projeto localmente:

### 1. Clonar o repositório
```bash
git clone <url-do-repositorio>
cd ecotechh
```

### 2. Instalar Dependências
O projeto utiliza npm workspaces (versão 10+). Na raiz do monorepo, instale as dependências:
```bash
npm install
```

### 3. Configurar as Variáveis de Ambiente
Na pasta `apps/api`, crie o arquivo `.env` e defina a URL do banco de dados (que agora está no Supabase) e outras chaves necessárias (veja o `.env.example` se disponível):
```env
DATABASE_URL="postgresql://postgres:sua-senha-do-supabase@db.seu-id.supabase.co:5432/postgres"
```
No frontend (`apps/web`), também defina suas variáveis em um arquivo `.env.local` (ex: `NEXT_PUBLIC_API_URL`, `AUTH_SECRET`).

### 4. Subir a Infraestrutura Local (Docker)
Utilize o Docker Compose para subir serviços locais auxiliares, como o Redis. A partir da raiz do projeto, execute:
```bash
docker-compose -f docker/docker-compose.yml up -d
```

### 5. Configurar o Banco de Dados (Prisma)
Para sincronizar seu código com o banco do Supabase, acesse a pasta da API e execute os comandos do Prisma:

```bash
cd apps/api

# 1. Gere o client do Prisma (atualiza a tipagem do TypeScript)
npx prisma generate

# 2. Sincronize o schema com o banco de dados (Cria/atualiza tabelas no Supabase sem apagar dados, ideal para dev)
npx prisma db push
# (Obs: se estiver usando sistema estrito de migrações, use "npx prisma migrate dev")

# 3. (Opcional) Popule o banco de dados com dados iniciais (Escolas, Admin padrão)
npx prisma db seed
```

> **Credenciais de Teste Geradas pelo Seed (caso execute):**
> - Admin: `admin@ecotech.com` / `AdminEcotech123`
> - Escola: `escola@ecotech.com` / `EscolaEcotech123`
> - Professor: `professor@ecotech.com` / `ProfessorEcotech123`

---

## 💻 Rodando o Projeto

Para iniciar tanto o Frontend quanto o Backend simultaneamente no modo de desenvolvimento, execute na raiz do monorepo:

```bash
npm run dev
```
> O Turborepo irá iniciar:
> - O **Frontend (Next.js)** na porta `http://localhost:3000`
> - A **API (NestJS)** na porta `http://localhost:4000`

---

## 📖 Comandos Úteis (Raiz do projeto)

- `npm run dev`: Inicia front e back em paralelo.
- `npm run build`: Roda o build de produção de todos os workspaces.
- `npm run lint`: Verifica erros de linting em todo o projeto.
- `npm run format`: Formata os arquivos utilizando Prettier.
- `npm run db:studio -w api`: Abre o painel visual do Prisma Studio para ver os dados no banco (`http://localhost:5555`).

---

## 🔒 Permissões e Rotas Protegidas

A plataforma utiliza **NextAuth** em conjunto com **JWT do NestJS**.
- Rotas como `/trilhas`, `/dashboard` e ações de curtir/salvar exigem autenticação.
- Caso o usuário tente acessar sem token, será automaticamente redirecionado pelo Middleware para a tela de Login.
