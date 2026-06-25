# Implementation Plan: Ecotech Platform

**Branch**: `feature/ecotech-platform` | **Date**: 2026-06-23 | **Spec**: [specs/001-ecotech-platform/spec.md](file:///c:/Users/andre/echotec/specs/001-ecotech-platform/spec.md)

**Input**: Feature specification from [spec.md](file:///c:/Users/andre/echotec/specs/001-ecotech-platform/spec.md)

## Summary

O Ecotech é um ecossistema digital composto de uma aplicação web responsiva (Next.js 15) conectada a uma API backend robusta (NestJS) por meio de um Monorepo gerenciado por Turborepo e pnpm workspaces. A plataforma permite o cadastro de trilhas ecológicas, a geração automática de fichas pedagógicas em PDF e de QR Codes híbridos para leitura de resumos offline, além de um feed social de interações e stories de 24h e biblioteca escolar de conteúdos sujeitos a moderação.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+

**Primary Dependencies**: Next.js 15 (App Router), NestJS 10+, Turborepo, pnpm workspaces, Prisma ORM, Auth.js v5 (NextAuth), Tailwind CSS 4, pdfmake, qrcode, Lucide React, shadcn/ui

**Storage**: PostgreSQL 15+ (banco relacional principal) + Supabase Storage (upload de imagens, vídeos e arquivos PDF)

**Testing**: Jest (NestJS API) + Vitest/React Testing Library (Next.js Web) + Playwright (E2E)

**Target Platform**: Navegadores Web (Celular, Tablet, Desktop) com foco primário em Mobile-first

**Project Type**: Monorepo Web Service / Web Application

**Performance Goals**: Carregamento da página pública da trilha em até 2 segundos em conexões 3G (SC-001); Geração de PDF/QR Code em menos de 3 segundos (SC-002)

**Constraints**: Resumo offline do QR Code limitado a 250 caracteres (FR-004); Stories com expiração lógica em 24 horas (expires_at); Links externos com target="_blank" (FR-008); Contraste acessível WCAG AA (Design)

**Scale/Scope**: Múltiplas instituições escolares, professores, alunos e parceiros locais. ~30 telas identificadas no escopo.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Qualidade de Código e Tipagem Estrita**: TypeScript strict mode (strict: true no tsconfig) ativado, impedindo `any` implícito. Separação total de regras de negócio (NestJS/services) e UI (Next.js components). Branches de feature automatizadas configuradas no CI/CD. -> **PASS**
- **Arquitetura Modular e Escopo**: API REST NestJS em módulos limpos por domínio de dados. Rotas públicas no Next.js isoladas para SEO das privadas por Auth.js. Escopo respeita as exclusões (sem app nativo, geolocalização própria, chat ou pagamentos). -> **PASS**
- **Geração de Artefatos**: Módulos específicos `pdfmake` e `qrcode` no backend NestJS para a geração assíncrona dos arquivos, desonerando o frontend. -> **PASS**
- **Design Mobile-First e Cores**: Framework Tailwind CSS 4 configurado com CSS Variables no tema (Verde Escuro, Verde Claro, Bege) e layout responsivo. -> **PASS**
- **Acessibilidade e SEO**: Tags `alt` dinâmicas obrigatórias, contraste WCAG AA validado por testes de lint de acessibilidade, e metadados dinâmicos no Next.js App Router. -> **PASS**

## Project Structure

```text
edu-platform/
├── apps/
│   ├── web/                          # Next.js 15 (Frontend)
│   │   ├── app/
│   │   │   ├── (auth)/               # login/ e recovery/
│   │   │   ├── (dashboard)/          # admin/, escola/, default/ (professor/aluno)
│   │   │   ├── feed/                 # feed social e stories
│   │   │   ├── trilhas/              # trilhas/ e trilhas/[slug]/ (página de detalhes)
│   │   │   ├── pontos/               # pontos/[slug]/ (ponto educativo público)
│   │   │   ├── escolas/              # escolas/ e escolas/[id]/
│   │   │   ├── biblioteca/           # biblioteca/ e biblioteca/enviar/
│   │   │   └── rede/                 # rede/ e rede/[id]/ (parceiros)
│   │   ├── components/
│   │   │   ├── ui/                   # botões, cards, inputs (Design System)
│   │   │   ├── feed/                 # posts, comments, story carousels
│   │   │   └── trilhas/              # abas de detalhes, roadmap de pontos
│   │   └── lib/
│   │       ├── auth.ts
│   │       └── api-client.ts
│   │
│   └── api/                          # NestJS (Backend API)
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/             # Autenticação e JWT
│       │   │   ├── users/            # Gestores, professores e alunos
│       │   │   ├── schools/          # Cadastro de escolas e seguidores
│       │   │   ├── trails/           # Trilhas e fauna/flora
│       │   │   ├── educational-points/# Pontos educativos, pdf e qrcode
│       │   │   ├── feed/             # Posts, stories, curtidas, comentários
│       │   │   ├── library/          # Envio e aprovação/moderação
│       │   │   ├── partners/         # Rede de parceiros
│       │   │   └── dashboard/        # KPIs e aggregations
│       │   ├── common/
│       │   │   ├── guards/
│       │   │   ├── decorators/
│       │   │   └── filters/
│       │   └── main.ts
│       └── prisma/
│           ├── schema.prisma
│           └── seed.ts
│
├── packages/
│   ├── shared-types/                 # Tipos TypeScript compartilhados
│   └── eslint-config/                # Config ESLint compartilhado
```

**Structure Decision**: Monorepo modular usando pnpm workspaces e Turborepo para orquestrar o build e lint de forma otimizada.

## Complexity Tracking

*Nenhuma violação aos princípios da constituição foi detectada. A complexidade do sistema está diretamente associada ao escopo definido.*
