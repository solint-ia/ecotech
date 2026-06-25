## 🏗 Setup e Instalação

Siga este passo a passo para rodar o projeto localmente:

### 1. Clonar o repositório
```bash
git clone <url-do-repositorio>
cd ecotechh
```

### 2. Subir a Infraestrutura (Banco de Dados PostgreSQL)
Utilize o Docker Compose para subir o banco de dados local. A partir da raiz do projeto, execute:
```bash
docker-compose -f docker/docker-compose.yml up -d
```
> O banco de dados estará disponível na porta `5432` com usuário `postgres` e senha `postgres`.

### 3. Instalar Dependências
Na raiz do monorepo, instale todas as dependências do projeto:
```bash
pnpm install
```

### 4. Configurar as Variáveis de Ambiente
Copie o arquivo de exemplo `.env.example` para `.env` tanto no Frontend quanto no Backend (se existirem) ou configure de acordo com a infra.
As principais variáveis (como `DATABASE_URL` e `NEXTAUTH_SECRET`) geralmente já vêm pré-configuradas para o ambiente de desenvolvimento local.

### 5. Configurar o Banco de Dados (Prisma)
Acesse a pasta da API para rodar as migrações e popular o banco de dados inicial (Seed):

```bash
# Gere o client do Prisma
npm run db:generate -w api

# Rode as migrações no banco
npm run db:migrate -w api

# Popule o banco de dados (Escolas, Biomas, Admin padrão)
npm run db:seed -w api
```
> **Credenciais de Teste Geradas pelo Seed:**
> - Admin: `admin@ecotech.com` / `Senha@123`
> - Escola: `escola@ecotech.com` / `Senha@123`

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

