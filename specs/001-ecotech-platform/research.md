# Technical Research: Ecotech Platform

Este documento consolida as decisões arquiteturais e melhores práticas tecnológicas tomadas para a plataforma Ecotech na Phase 0.

## 1. Geração de Fichas Pedagógicas em PDF
* **Decisão**: Utilizar a biblioteca `pdfmake` no backend NestJS.
* **Justificativa**: `pdfmake` é extremamente leve, segura e rápida, gerando PDFs a partir de definições de objetos JSON declarativos direto na memória do servidor. Outras soluções, como o `puppeteer` (geração via headless browser), exigem a instalação de dependências pesadas do Chrome no container do Docker, consumindo muito mais memória RAM e aumentando consideravelmente os custos de hospedagem (AWS ECS Fargate). O `pdfmake` nos dá controle exato da identidade visual Ecotech através de margens, paletas de cores estritas (Verde/Bege) e fontes personalizadas.
* **Alternativas consideradas**: `puppeteer` (rejeitado por alto consumo de recursos e lentidão no cold start), `pdfkit` (rejeitado por ser de muito baixo nível e complexo de formatar layouts complexos).

## 2. Geração de QR Code Híbrido
* **Decisão**: Utilizar a biblioteca `qrcode` do ecossistema Node.js no backend NestJS.
* **Justificativa**: O pacote `qrcode` permite gerar QR Codes diretamente como imagens em Base64 ou buffers SVG/PNG de maneira síncrona e rápida. Para atingir o requisito de leitura offline, estruturaremos a carga de dados (payload) como um texto simples (`plain text`) contendo quebras de linha com o resumo do ponto, seguido da URL pública.
  * Formato do payload:
    ```text
    Ponto: [Nome]
    Trilha: [Trilha]
    Resumo: [Resumo de max 250 chars]
    Importância: [Resumo Importância]
    https://ecotech.com/pontos/[slug]
    ```
* **Alternativas consideradas**: Geração no frontend Next.js (rejeitada, pois os QR Codes precisam ser persistidos no banco de dados e gerados no momento da criação do ponto no CMS para que o Admin e Escola possam baixar ou visualizar em tabelas administrativas sem processamento repetido do lado do cliente).

## 3. Expiração de Stories (24 horas)
* **Decisão**: Expiração lógica via filtros de banco de dados (`expiresAt > NOW()`) e limpeza física agendada (Cron no NestJS).
* **Justificativa**: Ao criar um story, o banco calcula e grava o campo `expiresAt` como `createdAt + 24 horas`. As consultas públicas de feed filtram automaticamente os stories que ainda estão ativos. Para liberar espaço em disco no storage (S3) e no banco de dados, utilizaremos o módulo `@nestjs/schedule` para executar uma tarefa agendada (Cron Job) a cada hora, deletando os registros e arquivos correspondentes aos stories expirados.
* **Alternativas consideradas**: Expiração física imediata usando Redis TTL (rejeitada para simplificar a infraestrutura inicial, mantendo apenas o PostgreSQL como banco e estado do sistema).

## 4. Roteamento do Next.js 15 e Proteção de Rotas
* **Decisão**: Utilização de Next.js App Router com rotas agrupadas (`(auth)`, `(dashboard)`) e Middleware para validação de sessões e autorizações baseadas em Roles (perfis de usuários).
* **Justificativa**: O agrupamento de rotas permite organizar o painel administrativo por níveis de acesso de maneira limpa. O `middleware.ts` do Next.js intercepta todas as requisições em rotas de dashboard, lê os cookies `HttpOnly` que contêm o token JWT assinado pelo NestJS e decide se o usuário tem permissão para visualizar aquela página. Se a sessão estiver expirada ou o perfil não for condizente (ex: um estudante tentando acessar `/admin`), o middleware realiza o redirecionamento imediato no lado do servidor, evitando vazamento de layout.
* **Alternativas consideradas**: Controle de acesso puramente do lado do cliente (Client-Side redirection) (rejeitado por falhas graves de segurança e cintilação de tela/vazamento de dados visuais).

## 5. Autenticação Segura no Backend NestJS
* **Decisão**: Implementação de Passport JWT no NestJS com Cookies HttpOnly seguros + RolesGuard customizado.
* **Justificativa**: O uso de Cookies `HttpOnly`, `Secure` e `SameSite=Strict` para trafegar o token JWT protege a aplicação contra ataques do tipo XSS (Cross-Site Scripting), impedindo que códigos JavaScript acessem as credenciais. O backend NestJS aplica um `@Roles(Role.ADMIN)` decorador nos endpoints de criação e edição, e o `RolesGuard` valida a permissão do payload decodificado do JWT.
* **Alternativas consideradas**: Guardar JWT no LocalStorage do navegador (rejeitado por vulnerabilidade a XSS).
