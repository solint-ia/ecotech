# Quickstart & Validation Guide: Ecotech Platform

Este guia descreve os passos e cenários necessários para instalar, executar e validar a funcionalidade da plataforma Ecotech ponta a ponta.

## 1. Pré-requisitos

* Node.js v20.x ou superior instalado.
* Gerenciador de pacotes `pnpm` instalado (`npm i -g pnpm`).
* Docker e Docker Compose instalados localmente.

---

## 2. Configuração do Ambiente e Inicialização

Execute os seguintes comandos na raiz do repositório:

```bash
# 1. Instalar as dependências globais do Monorepo
pnpm install

# 2. Inicializar o banco de dados PostgreSQL e local storage em container Docker
docker-compose -f docker/docker-compose.yml up -d

# 3. Rodar as migrações do banco (Prisma) no backend api
pnpm --filter api prisma migrate dev

# 4. Rodar o script de carga inicial (seed) do banco
pnpm --filter api run seed

# 5. Inicializar o ambiente de desenvolvimento (Turborepo executa Next.js e NestJS em paralelo)
pnpm dev
```

Após o comando final:
* O frontend Next.js 15 estará rodando em `http://localhost:3000`
* O backend NestJS estará respondendo em `http://localhost:4000`

---

## 3. Cenários de Validação (Manual / E2E)

### Cenário 1: Autenticação e Dashboards
1. **Passo**: Abra `http://localhost:3000/login` no navegador.
2. **Passo**: Faça login com as credenciais padrões do seed (ex: `admin@ecotech.com` / `AdminEcotech123`).
3. **Resultado Esperado**: O usuário deve ser autenticado com sucesso, o cookie HTTP-Only deve ser injetado e a página deve redirecionar para `http://localhost:3000/admin`. O dashboard administrativo deve exibir os KPIs gerais com dados do seed.

### Cenário 2: Cadastro de Trilha e Ponto Educativo
1. **Passo**: Acesse o painel de trilhas do administrador ou escola e clique em "Criar Trilha".
2. **Passo**: Insira os metadados requeridos (Título: "Trilha do Manguinho", Cidade: "Floripa", Bioma: "Mata Atlântica", etc.) e salve.
3. **Passo**: Dentro da trilha recém-criada, acesse "Pontos Educativos" e clique em "Criar Ponto".
4. **Passo**: Preencha o nome ("Ponto do Guará"), tipo ("FAUNA"), ordem ("1"), resumo offline ("Garça-vermelha que habita estuários.") e salve.
5. **Resultado Esperado**:
   * O ponto e a trilha devem ser salvos sem erros.
   * O backend deve gerar a imagem do QR Code (Base64) e a URL do PDF.
   * Ao acessar `http://localhost:3000/pontos/ponto-do-guara` com internet, os botões "Ver no Wikiloc" e "Baixar PDF" devem estar visíveis e funcionais.

### Cenário 3: Validação do QR Code Offline
1. **Passo**: No painel de administração, abra o QR Code gerado para o "Ponto do Guará".
2. **Passo**: Escaneie o QR Code usando a câmera de um smartphone desconectado de qualquer rede (modo avião).
3. **Resultado Esperado**: O smartphone deve exibir na tela, como texto plano, exatamente os dados embutidos:
   ```text
   Ponto: Ponto do Guará
   Trilha: Trilha do Manguinho
   Resumo: Garça-vermelha que habita estuários.
   ...
   https://ecotech.com/pontos/ponto-do-guara
   ```

### Cenário 4: Geração do PDF
1. **Passo**: Na página pública do ponto, clique no botão "Baixar PDF".
2. **Resultado Esperado**: O navegador deve receber o stream binário de arquivo PDF, abrindo ou salvando uma ficha pedagógica que contenha cabeçalhos e textos estilizados nas cores Verde e Bege, imagem do ponto, e as descrições inseridas no formulário.

### Cenário 5: Moderação da Biblioteca
1. **Passo**: Faça login como uma Escola parceira.
2. **Passo**: Acesse `http://localhost:3000/biblioteca/enviar` e faça upload de um guia ecológico em PDF.
3. **Passo**: Abra outra aba anônima, faça login como Administrador e acesse a fila de moderação de biblioteca.
4. **Passo**: Clique em "Aprovar" no arquivo enviado.
5. **Resultado Esperado**: O arquivo deve sair da fila de pendentes e passar a constar na aba pública de materiais (`http://localhost:3000/biblioteca`) para download livre de qualquer visitante.
