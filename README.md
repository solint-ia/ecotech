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

### 3. Configurar Conexões na Nuvem (Supabase e Upstash Redis)
Na pasta `apps/api`, crie (ou edite) o arquivo `.env` para inserir as conexões externas. 

**1. Supabase (Banco de Dados PostgreSQL):**
Pegue a URL de conexão no painel do Supabase (Settings > Database) e insira:
```env
DATABASE_URL="postgresql://postgres:sua-senha-do-supabase@db.seu-id.supabase.co:5432/postgres"
```

**2. Upstash (Cache e Filas BullMQ):**
Pegue a URL de conexão segura no painel do Upstash. Certifique-se de usar `rediss://` (com dois `s`) para ativar a criptografia TLS:
```env
REDIS_URL="rediss://default:sua-senha-upstash@seu-endpoint.upstash.io:6379"
```
*(Para o frontend em `apps/web`, configure seu `.env.local` com `NEXT_PUBLIC_API_URL` e `AUTH_SECRET`).*

**✅ Como checar se as conexões deram certo?**
- **Terminal:** Ao rodar `npm run dev` na raiz do projeto, observe os logs da API. Se ela exibir `[NestApplication] Nest application successfully started` sem jogar erros vermelhos de `ECONNREFUSED` (relacionados ao BullMQ/Redis) e sem travar, as conexões iniciais deram certo.
- **Supabase:** O comando `npx prisma db push` deve retornar sucesso. Além disso, ao tentar fazer login ou listar dados na plataforma, não devem ocorrer erros de `PrismaClientInitializationError`.
- **Painéis (Dashboards):** Acesse as abas "Metrics" (Métricas) no site do Supabase e do Upstash. Você verá as linhas gráficas de conexões ativas subindo logo após iniciar o projeto na sua máquina.

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
