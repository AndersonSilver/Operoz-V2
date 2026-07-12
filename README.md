# Operoz v2

Reescrita do zero do Operoz, independente do fork do Plane (AGPL) usado no projeto anterior.

## Como este projeto foi planejado

Este código é escrito **a partir de uma especificação funcional e tecnológica** (comportamento observável e stack), não copiado ou derivado do código-fonte do projeto anterior. O guia completo de especificação está publicado em:

**https://claude.ai/code/artifact/3b1e258a-7cdc-435a-96c7-cac07451d0ca**

10 partes: infraestrutura, modelos de dados, toda a API REST, autenticação, motor de automação, assistente de IA, jobs em background, integrações, e todo o frontend (apps/web, admin, space, live, mcp-server, design system).

## Estrutura do monorepo

```
apps/
  api/     — backend Express + TypeORM (EM IMPLEMENTAÇÃO)
  web/     — frontend principal (placeholder)
  admin/   — painel administrativo (placeholder)
  space/   — portal público de guests (placeholder)
  live/    — servidor de colaboração real-time (placeholder)
mcp-server/ — servidor MCP (placeholder)
packages/
  types/   — tipos compartilhados (placeholder)
  config/  — configuração compartilhada (placeholder)
```

## Status atual

- [x] Scaffold do monorepo (pnpm workspaces + turborepo)
- [x] Backend: fundação (Express, TypeORM, config de ambiente validada, middlewares base)
- [x] Backend: autenticação e sessão (signup/signin por senha, magic link, reset de senha, OAuth Google/GitHub/GitLab/Gitea, sessão em Redis, rate limiting, CSRF)
- [ ] Backend: workspace, project, issue e demais domínios do produto
- [ ] Frontend: todos os apps

## Rodando localmente

Pré-requisitos: Node >= 22.18, pnpm 10.32.1, Docker.

```bash
pnpm install
docker compose -f docker-compose.dev.yml up -d
cp apps/api/.env.example apps/api/.env   # ajuste os valores conforme necessário
pnpm --filter @operoz/api migration:run
pnpm --filter @operoz/api dev
```

A API sobe em `http://localhost:3000`. Endpoints de autenticação em `/auth/*`, usuário logado em `/users/me`.

## Decisões de arquitetura (backend)

- **Sessão em Redis** (`express-session` + `connect-redis`), não JWT — revogação imediata é trivial (logout de todos os dispositivos = apagar chaves).
- **Argon2id** para hash de senha.
- **Segredos OAuth sempre criptografados em repouso** (AES-256-GCM) — o sistema anterior tinha isso como bug real (tokens em texto plano); aqui é o padrão, não uma correção.
- **Rate limiting em todo endpoint sensível de auth** (sign-in, sign-up, magic link, reset de senha) — o sistema anterior não tinha rate limit em sign-in/sign-up por senha; aqui é resolvido desde o início.
- **CSRF via double-submit cookie**, já que a API é consumida por SPAs em origens separadas.
- Migrations do TypeORM são a única fonte de verdade de schema (`synchronize: false` sempre, inclusive em dev).
