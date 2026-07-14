# Auditoria de Segurança — Plataforma EcoTech

> Documento gerado a partir de uma análise do código-fonte (API NestJS + frontend Next.js).
> Foco: fundamentos de segurança, autorização por role, manipulação indevida de body/query,
> uso de endpoints não autorizados e ataques mais comuns.

---

## Veredito geral

A base de segurança é **boa** para um projeto deste porte: Prisma (elimina SQL Injection),
`helmet`, CORS restrito por allow-list, `ValidationPipe` global com `whitelist + forbidNonWhitelisted`,
throttling global, bcrypt, e — importante — a **escalada de privilégio no registro está bloqueada**
e o `RolesGuard` é aplicado com os guards corretos.

Não foi encontrado um buraco crítico do tipo "virar admin" ou injeção. Porém há **algumas lacunas
reais** que valem correção, sendo a mais séria a **ausência de invalidação de sessão**.

---

## Check-in dos fundamentos

| Fundamento | Status | Evidência |
|---|---|---|
| SQL Injection | ✅ Protegido | Prisma parametriza tudo |
| AuthZ por role / spoofing de role | ✅ Enforçado | `apps/api/src/common/guards/roles.guard.ts`, guards em nível de classe (users, analytics) |
| Escalada via registro (`role: ADMIN`) | ✅ Bloqueado | `allowedPublicRoles` em `apps/api/src/modules/auth/auth.service.ts:165` |
| Mass assignment (body) | ⚠️ Parcial | Pipe protege DTOs, mas endpoints com `@Body() any` escapam (mitigado por seleção manual) |
| CORS / headers | ✅ OK | allow-list + helmet em `apps/api/src/main.ts:17` |
| Rate limiting | ⚠️ Parcial | Global OK; `reset-password` sem throttle dedicado |
| Brute-force senha (login) | ✅ OK | 10/15min em `apps/api/src/modules/auth/auth.controller.ts:112` |
| Brute-force OTP | ⚠️ Fraco | OTP 6 dígitos sem lockout de tentativas |
| Invalidação de sessão | ❌ Ausente | JWT sem expiração e sem `tokenVersion` |
| Exposição de PII | ⚠️ Excessiva | `GET /users/:id` devolve e-mail/telefone de qualquer um |
| Hash de senha | ✅ bcrypt(10) | consistente |
| Upload de arquivos | ⚠️ Sem limites | sem `fileSize`/tipo em vários endpoints |
| Segredos | ⚠️ 1 fallback | secret padrão hardcoded no NextAuth |

---

## Achados (ordenados por severidade)

### 🔴 ALTA — Troca/reset de senha não invalida sessões existentes

Os JWT **não expiram** (`// No expiresIn` em `apps/api/src/modules/auth/auth.module.ts:17`,
cookie de 10 anos) e o `apps/api/src/modules/auth/strategies/jwt.strategy.ts:37` só valida se o
usuário existe/está ativo — não há `tokenVersion`/`passwordChangedAt`.

**Consequência:** se uma conta é comprometida e a senha é trocada (pelo usuário ou pelo admin, via
a funcionalidade de redefinição), o token do atacante **continua válido**. A troca de senha só faz
logout local no frontend.

**Plano:** adicionar coluna `tokenVersion` (ou `passwordChangedAt`) ao `User`; incluí-la no payload
do JWT; no `validate` do strategy, rejeitar se divergir; incrementar em toda troca/reset de senha e
no `toggle-status` (suspensão). Idealmente também dar `expiresIn` (ex.: 7–30 dias) + refresh token.

---

### 🟠 MÉDIA-ALTA — Brute-force do OTP de reset de senha

`reset-password` (`apps/api/src/modules/auth/auth.controller.ts:105`) não tem `@Throttle` dedicado
(só o global de 300/min) e o OTP é numérico de 6 dígitos, **validado direto** sem contador de
tentativas. Com múltiplos IPs, o espaço de 1.000.000 é varrível dentro da janela de 10 min.
Resultado: account takeover.

**Plano:** `@Throttle` estrito (ex.: 5/10min por IP) + contador de tentativas por e-mail no registro
do token, invalidando o OTP após ~5 falhas. Aplicar o mesmo a `verify-email` e `verify-email-update`.

---

### 🟠 MÉDIA — Exposição de PII autenticada (IDOR de campos)

`GET /users/:id` (`apps/api/src/modules/users/users.controller.ts:97`) chama `getMe`, que retorna
e-mail, telefone, `schoolId`, `roleStatus` etc. Qualquer usuário logado (inclusive STUDENT) pode
enumerar `:id` e coletar **e-mail e telefone de todos**. O frontend esconde o telefone, mas a API
entrega.

**Plano:** criar uma projeção pública (`name`, `profileImage`, `role`, `school`, `createdAt`) para o
`getUser`, e reservar os campos sensíveis para o próprio dono (`getMe`) ou admin.

---

### 🟠 MÉDIA — Uploads sem limite de tamanho/tipo

`memoryStorage()` sem `limits` no feed/stories/register (ex.: `apps/api/src/modules/feed/feed.controller.ts:70`
aceita 5 arquivos, sem `fileSize` nem `fileFilter`). Risco de **DoS por memória** e upload de tipos
arbitrários ao storage.

**Plano:** adicionar `limits: { fileSize }` (ex.: 5–10 MB) e `fileFilter` de mimetype (image/video)
em todos os `FileInterceptor`/`FilesInterceptor`.

---

### 🟡 BAIXA — Mass assignment (defense-in-depth)

`register`, `updateMe` e `adminUpdateUser` usam `@Body() ... : any`, o que **desliga** o
`whitelist/forbidNonWhitelisted` global nesses pontos. Hoje está mitigado porque os services
selecionam campos manualmente, mas é frágil.

**Plano:** tipar com DTOs (`RegisterDto`, `UpdateProfileDto`, `AdminUpdateUserDto`) para reativar a
proteção automática. Bônus: remover `ADMIN` do enum aceito no `RegisterDto`.

---

### 🟡 BAIXA — Enumeração de usuários

`forgot-password` responde 404 "E-mail não cadastrado" (`apps/api/src/modules/auth/auth.service.ts:268`)
e `check-availability`/`send-register-otp` confirmam existência de e-mail/telefone/CNPJ.

**Plano:** `forgot-password` deve responder sempre 200 genérico ("se existir, enviaremos o código").
Manter throttle no `check-availability`.

---

### 🟡 BAIXA — Segredo padrão hardcoded

`apps/web/lib/auth.ts:5` tem `AUTH_SECRET || "dev-nextauth-secret-key..."`. Se for a produção sem
env, o segredo de sessão é público.

**Plano:** remover o fallback e falhar no boot se `AUTH_SECRET` faltar. Rodar um scan de segredos no repo.

---

### 🟡 BAIXA — JWT de 10 anos

Blast radius enorme em caso de vazamento de token (sem revogação). Resolvido junto do item de ALTA
(expiração + `tokenVersion`).

---

## Plano de melhoria priorizado

1. **`tokenVersion`/`passwordChangedAt` + expiração de JWT** — fecha a ALTA e a BAIXA do JWT de 10
   anos; dá sentido real ao reset de senha do admin. *(Requer migration Prisma.)*
2. **Throttle + lockout de OTP** em reset/verify (MÉDIA-ALTA).
3. **Projeção pública em `GET /users/:id`** (MÉDIA — PII).
4. **Limites de upload** (MÉDIA — DoS).
5. **DTOs tipados** em register/updateMe/adminUpdateUser + remover ADMIN do enum público (BAIXA).
6. **Respostas genéricas** anti-enumeração + remover secret fallback (BAIXA).

Os itens **1 a 4** são os de maior retorno.
