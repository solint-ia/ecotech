# Tasks: Ecotech Platform

**Input**: Design documents from `/specs/001-ecotech-platform/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL - only implementation tasks are listed since automated test suites were not requested in the specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Contains exact file paths in descriptions.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure.

- [x] T001 Initialize pnpm workspaces and Turborepo configuration in package.json and turbo.json
- [x] T002 Configure linting, formatting and typescript compiler options at monorepo root tsconfig.json and .eslintrc
- [x] T003 Initialize Next.js 15 app under apps/web/
- [x] T004 Initialize NestJS app under apps/api/
- [x] T005 Setup shared-types package under packages/shared-types/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T006 Configure database schema, models and enums in apps/api/prisma/schema.prisma
- [x] T007 Initialize Prisma client database connection service in apps/api/src/prisma/prisma.service.ts
- [x] T008 Implement shared types, enums and entities in packages/shared-types/src/index.ts
- [x] T009 Implement local Docker environment in docker/docker-compose.yml (PostgreSQL database and local storage emulator)
- [x] T010 Implement NestJS Authentication module, JWT Validation and RolesGuard in apps/api/src/modules/auth/
- [x] T011 Configure NextAuth.js (Auth.js v5) session setup in apps/web/lib/auth.ts
- [x] T012 Implement API HTTP client wrapper with JWT interceptors in apps/web/lib/api-client.ts
- [x] T013 Implement middleware for protected routes and profile redirection in apps/web/middleware.ts
- [x] T014 Implement base layout, responsive menus, CSS variables and HSL colors in apps/web/app/layout.tsx and apps/web/components/layout/
- [x] T015 Create db seed script with default admin user and biomas in apps/api/prisma/seed.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - Cadastro de Trilhas e Pontos (Priority: P1) 🎯 MVP

**Goal**: Permite criar trilhas ecológicas com múltiplos pontos educativos vinculados, incluindo dados de fauna, flora e metadados.

**Independent Test**: Criar uma trilha e um ponto educativo associado no painel administrativo e vê-la renderizada na listagem de trilhas pública.

### Implementation for User Story 1
- [ ] T016 [P] [US1] Implement Trails controller, service and routing in apps/api/src/modules/trails/
- [ ] T017 [P] [US1] Implement Educational Points controller and service in apps/api/src/modules/educational-points/
- [ ] T018 [US1] Create public routes for trails listing and detailed view in apps/web/app/trilhas/page.tsx and apps/web/app/trilhas/[slug]/page.tsx
- [ ] T019 [US1] Create public route for educational point details page in apps/web/app/pontos/[slug]/page.tsx
- [ ] T020 [US1] Implement Trail creation and edit forms for School/Admin in apps/web/app/(dashboard)/escola/trilhas/criar/page.tsx
- [ ] T021 [US1] Implement Educational Point forms inside Trail edit workflow in apps/web/app/(dashboard)/escola/trilhas/[slug]/pontos/page.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Geração de QR Code e PDF Offline (Priority: P1) 🎯 MVP

**Goal**: Gerar arquivos offline automaticamente: PDFs formatados e QR Codes híbridos para leitura sem internet.

**Independent Test**: Salvar um ponto educativo com resumo offline < 250 caracteres, visualizar o QR Code gerado, ler o texto contendo o resumo offline pelo leitor da câmera e clicar no botão "Baixar PDF" para baixar o arquivo.

### Implementation for User Story 2
- [ ] T022 [US2] Implement PDF generation service using pdfmake in apps/api/src/modules/educational-points/pdf-generator.service.ts
- [ ] T023 [US2] Implement QR Code generation service in apps/api/src/modules/educational-points/qr-generator.service.ts
- [ ] T024 [US2] Expose download and preview endpoint for point PDF in apps/api/src/modules/educational-points/educational-points.controller.ts
- [ ] T025 [US2] Format QR Code text payload (limit 250 chars) + URL in apps/api/src/modules/educational-points/qr-generator.service.ts
- [ ] T026 [US2] Add PDF download button and QR Code presentation modal in apps/web/components/trilhas/QrPdfActions.tsx

**Checkpoint**: At this point, User Stories 1 and 2 should both work independently.

---

## Phase 5: User Story 3 - Feed Social e Stories Efêmeros (Priority: P2)

**Goal**: Compartilhamento de atualizações rápidas (stories 24h) e publicações de trilhas (posts com fotos/vídeos).

**Independent Test**: Fazer um post no feed, criar um story no topo do feed e verificar que o story desaparece automaticamente após 24h.

### Implementation for User Story 3
- [ ] T027 [P] [US3] Implement Feed Post service, controllers and likes/comments endpoints in apps/api/src/modules/feed/
- [ ] T028 [P] [US3] Implement Story service with expiresAt logic in apps/api/src/modules/feed/story.service.ts
- [ ] T029 [US3] Implement cron job schedule for story logical cleanups in apps/api/src/modules/feed/story-cleanup.cron.ts
- [ ] T030 [US3] Build feed layout view, post list, and comments modal in apps/web/app/feed/page.tsx
- [ ] T031 [US3] Build Story reel carousel and creation upload component in apps/web/components/feed/StoryReel.tsx

**Checkpoint**: At this point, User Stories 1, 2, and 3 should work independently.

---

## Phase 6: User Story 4 - Biblioteca de Recursos com Moderação (Priority: P2)

**Goal**: Envio de materiais didáticos pelas escolas e aprovação prévia pelo administrador antes de ficarem públicos.

**Independent Test**: Enviar um PDF pela conta escola, verificar que ele está como pendente na biblioteca, aprovar o material pela conta admin e vê-lo disponível para todos na biblioteca.

### Implementation for User Story 4
- [ ] T032 [US4] Implement Library CRUD and approval status endpoints in apps/api/src/modules/library/
- [ ] T033 [US4] Build moderation workflow panel for Admin in apps/web/app/(dashboard)/admin/moderacao/page.tsx
- [ ] T034 [US4] Build library catalog search, type filtering, and content download in apps/web/app/biblioteca/page.tsx
- [ ] T035 [US4] Build file upload submission form for Escola profiles in apps/web/app/biblioteca/enviar/page.tsx

**Checkpoint**: All MVP and P2 features should now be independently functional.

---

## Phase 7: User Story 5 - Perfis de Escolas e Rede de Parceiros (Priority: P3)

**Goal**: Listagem de escolas parceiras (com filtro de bioma/dificuldade/distância) e cadastro da rede de apoio turístico local.

**Independent Test**: Visualizar a lista de escolas, filtrar suas rotas associadas, seguir uma escola e navegar pela lista de parceiros locais.

### Implementation for User Story 5
- [ ] T036 [P] [US5] Implement Partner CRUD and category filtering in apps/api/src/modules/partners/
- [ ] T037 [P] [US5] Implement Follower toggle logic for schools in apps/api/src/modules/schools/followers.service.ts
- [ ] T038 [US5] Build Schools list cards and profile details page in apps/web/app/escolas/page.tsx and apps/web/app/escolas/[id]/page.tsx
- [ ] T039 [US5] Build dynamic sidebar filter component on School detail page in apps/web/components/escolas/FilterSidebar.tsx
- [ ] T040 [US5] Build local partners directory with category tabs and WhatsApp action buttons in apps/web/app/rede/page.tsx

**Checkpoint**: All user stories should now be independently functional.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories.

- [ ] T041 Configure production Dockerfiles for frontend and API in apps/web/Dockerfile and apps/api/Dockerfile
- [ ] T042 Setup GitHub Actions workflow for CI/CD linting and builds in .github/workflows/ci.yml
- [ ] T043 Add WCAG AA accessibility tag requirements check during build phase in apps/web/
- [ ] T044 Run E2E validation scenarios listed in quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational phase completion.
  - User stories can then proceed in parallel (if staffed).
  - Or sequentially in priority order (P1 → P2 → P3).
- **Polish (Final Phase)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories.
- **User Story 2 (P1)**: Depends on User Story 1 (requires Point details) to output QR/PDF code.
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Independent from other stories.
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Independent from other stories.
- **User Story 5 (P3)**: Depends on User Story 1 (requires Trails list for filters).

---

## Parallel Example: User Story 1

```bash
# Launch NestJS and NextJS controllers/services in parallel (different folders):
Task: "T016 [P] [US1] Implement Trails controller, service and routing in apps/api/src/modules/trails/"
Task: "T017 [P] [US1] Implement Educational Points controller and service in apps/api/src/modules/educational-points/"
```

---

## Implementation Strategy

### MVP First (User Story 1 & 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. Complete Phase 4: User Story 2
5. **STOP and VALIDATE**: Test User Story 1 & 2 independently (Trilhas + PDF/QR generator)
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready.
2. Add User Story 1 & 2 → Test independently → Deploy/Demo (MVP!).
3. Add User Story 3 → Test independently → Deploy/Demo.
4. Add User Story 4 → Test independently → Deploy/Demo.
5. Add User Story 5 → Test independently → Deploy/Demo.
6. Each story adds value without breaking previous stories.
