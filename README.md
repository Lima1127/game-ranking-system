# Reviradão de Jogos (Game Ranking System)

Site da competição **Reviradão**: um grupo de amigos registra os jogos que zerou durante a
edição do ano, um admin confere cada registro e o sistema calcula os pontos e o ranking.

> **Status:** em desenvolvimento. Última revisão desta documentação: 28/09/2026.

## Sumário

- [O que o sistema faz](#o-que-o-sistema-faz)
- [Arquitetura](#arquitetura)
- [Tecnologias](#tecnologias)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Como rodar](#como-rodar)
- [Configuração](#configuração)
- [API](#api)
- [Testes](#testes)
- [Segurança](#segurança)
- [Limitações conhecidas](#limitações-conhecidas)
- [Documentação complementar](#documentação-complementar)
- [Contribuindo](#contribuindo)

---

## O que o sistema faz

- **Cadastro e login** de jogadores; papéis `USER` e `ADMIN`.
- **Registro de conclusões**: o jogador envia o jogo zerado com uma imagem de comprovante.
  O pedido fica **pendente** até um admin **aprovar** (e só então gera pontos) ou ser cancelado.
- **Coop** (2 a 4 jogadores), **Hype**, **Lista Rotativa** e **Obrigações** entre jogadores.
- **Pedidos de atualização** de registros já aprovados (o admin vê a prévia dos pontos).
- **Ranking** da edição com pódio, emojis das regras que pontuaram e lista de jogos por jogador.
- **Painel admin**: excluir registros, recalcular a edição e ver o log de auditoria.

As regras completas de pontuação estão em [docs/concept.md](docs/concept.md).

## Arquitetura

```
Navegador (PC ou celular)
    │  http://localhost:5173  ou  https://<tunel>.trycloudflare.com
    ▼
Frontend — React + Vite (pasta reviradao/)
    │  chamadas para /api/v1/...  → o proxy do Vite repassa para o backend
    ▼
Backend — Spring Boot (pasta backend/), porta 8080
    │  Controllers → Services → ScoringEngine → Repositories (JPA)
    ├──────────────► PostgreSQL (banco game_ranking ou game_ranking_teste)
    │                 estrutura criada/atualizada pelo Flyway (migrations V1…V17)
    └──────────────► Disco: backend/storage/{platinum,avatars}  (imagens enviadas)

Serviços externos: nenhum.
```

- O ranking **não é armazenado**: é a soma, em tempo real, da tabela `score_events`
  (cada ponto ganho ou perdido é um evento com código da regra e motivo).
- O navegador fala só com o endereço do site; o **proxy do Vite** repassa `/api` ao backend.
  Isso permite usar o mesmo código em `localhost` e através de um túnel.

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Backend | Java 21, Spring Boot 3.3.5 (Web, Data JPA, Security, Validation), Lombok |
| Banco | PostgreSQL (testado na versão 18), migrations com Flyway 11 |
| Autenticação | Token próprio assinado com HMAC-SHA256 (**não** é JWT), enviado como `Authorization: Bearer` |
| Frontend | React 18, Vite 5, React Router 6, TanStack Query 5, axios, Tailwind CSS 3 |
| Testes | JUnit 5 + Mockito + AssertJ (backend) |

## Estrutura de pastas

```
game-ranking-system/
├── backend/
│   ├── pom.xml
│   └── src/
│       ├── main/java/com/gameranking/
│       │   ├── common/        # exceções, tratamento de erros, validação de uploads
│       │   ├── config/        # segurança (SecurityConfig) e CORS
│       │   ├── domain/        # entidades (model/) e enums
│       │   ├── repository/    # acesso ao banco (Spring Data JPA)
│       │   ├── security/      # token e filtro de autenticação
│       │   ├── service/       # regras de negócio; scoring/ScoringEngine = pontuação
│       │   └── web/           # controllers (endpoints) e DTOs
│       ├── main/resources/
│       │   ├── application.yml.example        # modelo de configuração
│       │   ├── application-teste.yml.example  # modelo do perfil de teste
│       │   └── db/migration/                  # migrations Flyway V1…V17
│       └── test/java/                         # testes automatizados
├── reviradao/                # frontend
│   ├── src/pages/            # telas
│   ├── src/services/api.js   # cliente HTTP (axios)
│   ├── src/contexts/         # sessão do usuário (AuthContext)
│   └── vite.config.js        # porta, proxy /api e endereços de túnel liberados
├── scripts/
│   └── criar-usuario.ps1     # cadastra usuário (e opcionalmente o torna ADMIN)
└── docs/
    ├── concept.md            # regras do Reviradão e da pontuação
    ├── integration-runbook.md# como rodar, bancos, túnel, backup, problemas comuns
    └── debugging.md          # guia de debug para iniciantes
```

## Como rodar

Resumo (passo a passo detalhado em [docs/integration-runbook.md](docs/integration-runbook.md)):

1. Copie `backend/src/main/resources/application.yml.example` para `application.yml`
   e preencha o banco e o **`app.jwt.secret`** (obrigatório, 32+ caracteres).
2. Copie `reviradao/.env.example` para `reviradao/.env.local`.
3. Backend: no VS Code, **F5 → "Backend (TESTE)"** ou **"Backend (REAL)"**
   (ou `mvn spring-boot:run` dentro de `backend/`).
4. Frontend: dentro de `reviradao/`, `npm.cmd install` (primeira vez) e `npm.cmd run dev`.
5. Abra `http://localhost:5173`.

> Rode o backend **de dentro da pasta `backend/`**: as imagens enviadas ficam em
> `backend/storage/`, um caminho relativo à pasta de onde o backend é iniciado.

## Configuração

### Backend — `backend/src/main/resources/application.yml` (não vai para o Git)

| Chave | Obrigatória | Descrição |
|---|---|---|
| `spring.datasource.url` / `username` / `password` | sim | Conexão com o PostgreSQL |
| `app.jwt.secret` | **sim** | Segredo que assina os logins. Mínimo 32 bytes; valores de exemplo são recusados e o backend **não sobe**. Também pode vir da variável de ambiente `APP_JWT_SECRET`. |
| `app.jwt.expiration-seconds` | não | Duração do login (padrão 7200 = 2h) |
| `spring.flyway.enabled` | sim (`true`) | Aplica as migrations ao subir |
| `spring.jpa.hibernate.ddl-auto` | sim (`validate`) | O Hibernate só confere a estrutura; quem altera o banco é o Flyway |
| `app.storage.root-path` | — | **Ainda não é lido pelo código** (ver limitações) |

Gerar um segredo no PowerShell:
```powershell
$b = New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)
```

### Perfil de teste — `application-teste.yml` (não vai para o Git)

Troca apenas o banco para `game_ranking_teste`. É ativado pela configuração
**"Backend (TESTE)"** do VS Code (`--spring.profiles.active=teste`). Modelo em
`application-teste.yml.example`.

### Frontend — `reviradao/.env.local` (não vai para o Git)

```env
VITE_API_URL=/api/v1
```
O valor relativo usa o proxy do Vite. Só troque se o backend estiver em outro endereço.

## API

Base: `/api/v1`. Todas as rotas exigem login, exceto as marcadas como **pública**.
Rotas marcadas como **admin** verificam o papel do usuário no banco.

| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/register` | Cadastro (**pública**) |
| POST | `/auth/login` | Login; devolve `accessToken` (**pública**) |
| GET | `/ranking?editionId=` | Ranking da edição (padrão: edição ativa) |
| GET | `/games` | Catálogo de jogos |
| POST | `/games` | Cria jogo (ou devolve o existente com o mesmo nome). O ano só é aceito se enviado por admin |
| PATCH | `/games/{id}/release-year` | Define o ano de lançamento (**admin**) |
| POST | `/completions` | Envia pedido de conclusão (fica `PENDING`) |
| GET | `/completions?editionId=` | Conclusões aprovadas da edição, com códigos de regra |
| GET | `/completions/{id}` | Detalhes de um registro (dono ou admin) |
| GET | `/completions/requests` | Pedidos de conclusão (admin vê todos) |
| POST | `/completions/{id}/approve` | Aprova pedido e gera pontos (**admin**) |
| POST | `/completions/{id}/cancel` | Cancela pedido pendente (dono ou admin) |
| GET | `/completions/submissions` | Lista unificada: novos registros + atualizações |
| GET / PUT | `/completions/submissions/{kind}/{id}` | Detalha / edita um pedido pendente (`kind` = `NEW_COMPLETION` ou `UPDATE_COMPLETION`) |
| POST | `/completions/submissions/{kind}/{id}/approve` | Aprova (**admin**) |
| POST | `/completions/submissions/{kind}/{id}/cancel` | Cancela |
| POST | `/completions/{id}/update-requests` | Pede atualização de um registro aprovado |
| GET | `/completions/update-requests` | Lista pedidos de atualização (com prévia de pontos se pendente) |
| POST | `/completions/update-requests/{id}/approve` | Aprova e recalcula a edição (**admin**) |
| POST | `/completions/update-requests/{id}/cancel` | Cancela |
| POST | `/uploads/platinum` | Envia comprovante (JPG, PNG, GIF ou WEBP; até 5 MB) |
| GET | `/uploads/proofs/{id}` | Exibe comprovante (**pública**) |
| GET | `/users` | Jogadores ativos (para coop e obrigações) |
| POST | `/users/me/avatar` | Envia avatar (JPG, PNG, GIF ou WEBP; até 5 MB) |
| GET | `/users/{id}/avatar` | Exibe avatar (**pública**) |
| GET / POST | `/obligations` | Lista / cria obrigação |
| POST | `/obligations/{id}/accept` · `refuse` · `cancel` · `submit-review` | Ações do jogador |
| POST | `/obligations/{id}/approve-review` · `reject-review` | Revisão (**admin**) |
| GET | `/rotative-list` | Lista rotativa ativa |
| POST | `/rotative-list/source-file` · `generate-next` | Importar base / gerar rodada (**admin**) |
| GET | `/admin/completions` · `/admin/audit-logs` | Painel admin (**admin**) |
| DELETE | `/admin/completions/{id}` | Exclui registro, reabre obrigação vinculada e recalcula (**admin**) |
| POST | `/admin/recalculate?editionId=` | Recalcula pontos da edição (**admin**) |

### Formato de erro

```json
{ "timestamp": "2026-09-28T23:32:51-03:00", "status": 422, "error": "Unprocessable Entity",
  "message": "A data de conclusao deve estar entre 2026-01-01 e 2026-09-28 (periodo da edicao Reviradao 2026)" }
```

| Código | Quando |
|---|---|
| 400 | Dados inválidos ou requisição malformada |
| 401 | Sem login, login expirado ou usuário inexistente/desativado → o site volta para a tela de login |
| 403 | Chamada de outro site bloqueada pelo CORS |
| 404 | Registro não encontrado |
| 409 | Conflito com dado existente (ex.: jogo já registrado) |
| 413 | Arquivo acima do limite |
| 422 | Regra de negócio violada (inclui "apenas ADMIN pode…") |
| 500 | Erro inesperado (detalhes só no log do servidor) |

## Testes

```powershell
cd backend
mvn.cmd test                              # todos (15 testes)
mvn.cmd test "-Dtest=TokenServiceTest"    # uma classe
```

Cobertura atual: token (assinatura, adulteração, expiração, segredo fraco), filtro de
autenticação, validação de imagens, regra de data da edição e "primeiro na edição" com coop
no recálculo. O frontend ainda não tem testes automatizados; valide com `npm.cmd run build`.

## Segurança

- Senhas guardadas com BCrypt.
- Tokens assinados com HMAC-SHA256 e segredo obrigatório; usuários removidos/desativados perdem o acesso.
- Pontos são calculados **somente no servidor**, na aprovação feita por um admin.
- Uploads: apenas imagens reais (tipo detectado pelo conteúdo), servidas com `nosniff` e CSP `sandbox`.
- Mensagens de erro não expõem detalhes internos.
- Operações que distribuem pontos travam a edição no banco, evitando bônus duplicados por concorrência.

## Limitações conhecidas

Levantadas na auditoria de 28/09/2026 e ainda **não corrigidas**:

- Sem tela para criar edições (só existe a "Reviradao 2026", criada pela migration V1).
- Sem tela para o admin definir o ano de lançamento (só via `PATCH /games/{id}/release-year`).
- `app.storage.root-path` é ignorado; as imagens vão para `./storage` relativo à pasta de execução.
- Quem cria uma obrigação pode cancelá-la mesmo durante a revisão da conclusão (anula o +3 do outro jogador).
- A prévia de pontos não considera obrigações ainda não aceitas.
- Não há desempate no ranking nem limite de tentativas de login.
- Regras ainda não definidas pelo grupo: ver [docs/concept.md](docs/concept.md#regras-ainda-não-definidas).

## Documentação complementar

| Documento | Conteúdo |
|---|---|
| [docs/concept.md](docs/concept.md) | Regras do Reviradão, pontuação e ranking |
| [docs/integration-runbook.md](docs/integration-runbook.md) | Rodar local, bancos REAL/TESTE, túnel para amigos, backup, problemas comuns |
| [docs/debugging.md](docs/debugging.md) | Guia de debug passo a passo para iniciantes |
| [reviradao/README.md](reviradao/README.md) | Detalhes do frontend |
| `docs/architecture.html` | Documento antigo (março/2026) — **desatualizado**, mantido só como histórico |

## Contribuindo

1. Crie uma branch a partir da `main`: `git checkout -b fix/descricao-curta`.
2. Faça commits no padrão já usado: `feat: ...`, `fix: ...`, `docs: ...`, `style: ...`.
3. Rode `mvn.cmd test` (backend) e `npm.cmd run build` (frontend) antes de abrir o PR.
4. **Nunca edite uma migration já aplicada**; crie uma nova (`V18__...sql`).
5. Mudou uma regra de pontuação? Atualize o `ScoringEngine`, a tabela de regras em
   `reviradao/src/pages/RankingPage.jsx` e o [docs/concept.md](docs/concept.md).
