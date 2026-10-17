# Publicar o Reviradão na nuvem (Render + Neon)

Guia passo a passo para colocar o site no ar **sem depender do seu computador**, no plano grátis.

> Escrito em 14/10/2026. Telas e limites das plataformas mudam com o tempo; se algo estiver
> diferente, procure a opção com nome parecido.

## Como fica

```
Amigos (navegador / celular)
      │  https://<nome>.onrender.com
      ▼
Render (plano gratis) — um unico servico com o backend + o site
      │  conexao segura (SSL)
      ▼
Neon (plano gratis) — PostgreSQL com os dados e as imagens
```

| | Render (site) | Neon (banco) |
|---|---|---|
| Custo | Grátis, sem cartão | Grátis, sem cartão |
| Limite principal | **Dorme após 15 min sem acesso**; o primeiro acesso depois disso leva ~1 min | **0,5 GB** de dados; o banco também "dorme" sem uso (acorda sozinho em ~1 s) |
| O que acontece no limite | 750 h/mês por conta (um serviço ligado o mês todo cabe) | Acima de 0,5 GB, novas gravações falham |

As imagens enviadas são **reduzidas no navegador** (~200 KB cada) e guardadas no banco.

---

## Antes de começar

- [ ] Branch com o código de nuvem enviada ao GitHub e, de preferência, mesclada na `main`.
- [ ] Acesso ao repositório no GitHub. O Render precisa de permissão no repositório
      `Lima1127/game-ranking-system`: quem for **dono** (ou admin) do repositório autoriza o Render,
      **ou** você faz um *fork* (cópia) para a sua conta e usa o fork.
- [ ] PostgreSQL local funcionando (para levar os dados do banco REAL).

---

## Passo 1 — Criar o banco no Neon

1. Acesse **neon.tech** e crie uma conta (dá para entrar com o GitHub).
2. Crie um projeto:
   - **Nome:** `reviradao`
   - **Postgres version:** a mais nova disponível (17 ou 18)
   - **Region:** `AWS US East (N. Virginia)` — perto do servidor do Render (passo 3).
3. No painel do projeto, clique em **Connect**:
   - **desmarque "Connection pooling"** (o Flyway, que cria as tabelas, precisa da conexão direta);
   - copie o endereço que começa com `postgresql://...`. Ele contém a **senha**: não compartilhe.

Do endereço `postgresql://USUARIO:SENHA@HOST/BANCO?sslmode=require` você vai precisar das partes
separadas no passo 3. Exemplo:

| Parte | Exemplo |
|---|---|
| USUARIO | `neondb_owner` |
| SENHA | `npg_xxxxxxxx` |
| HOST | `ep-algo-123456.us-east-1.aws.neon.tech` |
| BANCO | `neondb` |

## Passo 2 — Levar os dados do banco REAL para o Neon

> Faça isto **antes** de ligar o site no Render: o banco do Neon precisa estar vazio.
> Pule este passo se quiser começar a nuvem do zero.

No terminal do VS Code, na pasta do projeto:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\migrar-para-nuvem.ps1 -EnviarParaNeon
```

O script:
1. faz backup do banco REAL em `D:\backups` (o REAL é só lido);
2. cria uma cópia local e aplica as atualizações novas;
3. copia as imagens de `backend\storage` para dentro do banco;
4. pede o endereço do Neon (cole o `postgresql://...` do passo 1 e aperte Enter — o texto não aparece);
5. envia tudo e mostra a conferência, ex.: `Enviado! No Neon agora: 4 usuarios, 9 registros, 11 imagens`.

Se o Neon já tiver tabelas, nada é enviado e o script mostra o que existe lá:

- **Com usuários/registros** (`O Neon ja tem 17 tabelas com: 4 usuarios, 9 registros...`): um envio
  anterior já funcionou. Se os números baterem com a etapa 4, siga para o passo 3.
- **Tabelas vazias** (`0 usuarios, 0 registros`): o site no Render foi ligado antes do envio e criou
  a estrutura. Rode com `-LimparNeonVazio` (só apaga se não houver nenhum usuário nem registro) e,
  depois, reinicie o site no Render (**Manual Deploy → Restart service**):
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\scripts\migrar-para-nuvem.ps1 -EnviarParaNeon -LimparNeonVazio
  ```

## Passo 3 — Criar o site no Render

1. Acesse **render.com** e crie uma conta **entrando com o GitHub**.
2. **New → Web Service** → escolha o repositório do Reviradão.
3. Preencha:

   | Campo | Valor |
   |---|---|
   | Name | `reviradao` (vira `https://reviradao.onrender.com`, se estiver livre) |
   | Region | **Virginia (US East)** |
   | Branch | `main` (ou a branch que tiver o código de nuvem) |
   | Language / Runtime | **Docker** (o Render encontra o `Dockerfile` na raiz) |
   | Instance Type | **Free** |

4. Em **Environment Variables**, adicione:

   | Nome | Valor |
   |---|---|
   | `DATABASE_URL` | `jdbc:postgresql://HOST/BANCO?sslmode=require` (partes do passo 1) |
   | `DATABASE_USERNAME` | USUARIO do Neon |
   | `DATABASE_PASSWORD` | SENHA do Neon |
   | `APP_JWT_SECRET` | um segredo **novo** (não reutilize o do seu PC) — gere com o comando abaixo |
   | `APP_INVITE_CODE` | o código de convite que você vai passar aos amigos |
   | `STEAM_API_KEY` | (opcional) chave da Steam Web API, gerada em https://steamcommunity.com/dev/apikey. Liga a conferência de horas e conquistas na tela de Solicitações |
   | `APP_PUBLIC_URL` | o endereço do site no Render, sem barra no final (ex.: `https://reviradao.onrender.com`). Sem ele, o botão "Conectar Steam" não funciona |

   ```powershell
   $b = New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)
   ```

   Atenção ao `DATABASE_URL`: começa com **`jdbc:postgresql://`** e **não** leva usuário nem senha.

5. Em **Advanced → Health Check Path**, coloque `/api/v1/health`.
6. Clique em **Create Web Service**. A primeira montagem leva alguns minutos (baixa dependências
   e monta o site). Acompanhe em **Logs**; quando aparecer `Started GameRankingApplication`, está no ar.

## Passo 4 — Conferir

1. Abra `https://<nome>.onrender.com` → a tela de login aparece.
2. Entre com sua conta (se trouxe o banco REAL, sua senha é a mesma de antes).
3. Abra o Ranking e um comprovante para ver se as imagens aparecem.
4. Teste criar conta: sem código de convite deve ser recusado; com o código, funciona.

### Virar admin na nuvem

Se sua conta não for admin no banco que subiu: no **Neon → SQL Editor**, rode:

```sql
UPDATE users SET role = 'ADMIN' WHERE lower(email) = lower('seu@email.com');
```

Depois saia e entre de novo no site.

---

## Atualizar o site depois

- Todo `push` na branch configurada (ex.: `main`) faz o Render **montar e publicar de novo
  sozinho**. As migrations novas rodam ao subir.
- Antes de publicar mudanças que alteram o banco (migration nova), faça um backup do Neon:
  ```powershell
  & 'D:\db\bin\pg_dump.exe' "postgresql://USUARIO:SENHA@HOST/BANCO?sslmode=require" --no-owner --no-privileges -f "D:\backups\neon_$(Get-Date -Format yyyy-MM-dd_HH-mm).sql"
  ```
- Para trocar o código de convite: Render → serviço → **Environment** → edite `APP_INVITE_CODE`
  → salvar (o serviço reinicia).

## Evitar a espera de 1 minuto (opcional)

O site dorme após 15 min sem visitas. Um serviço gratuito de "ping" (ex.: cron-job.org) pode
acessar `https://<nome>.onrender.com/api/v1/health` a cada 10 minutos para mantê-lo acordado.
Esse endereço **não usa o banco**, então não gasta a cota do Neon. Um único serviço ligado o mês
inteiro cabe nas 750 h grátis do Render.

---

## Problemas comuns

| Sintoma (nos Logs do Render) | Causa | Solução |
|---|---|---|
| `app.jwt.secret nao configurado` | `APP_JWT_SECRET` faltando ou curto | Adicione a variável com 32+ caracteres |
| `Connection to ... refused` / `password authentication failed` | Dados do Neon errados | Confira `DATABASE_URL` (com `jdbc:`), usuário e senha |
| `relation "..." already exists` ao subir | Banco do Neon foi preenchido duas vezes | Crie um banco novo no Neon e refaça o passo 2 |
| Script: `O Neon ja tem 17 tabelas com: 0 usuarios...` | Render ligado antes do envio | Rode o script com `-LimparNeonVazio` e reinicie o Render |
| Flyway travado / erro com pooler | Endereço com `-pooler` no host | Use a conexão direta (pooling desmarcado) |
| Site abre mas demora ~1 min | Serviço estava dormindo | Normal no plano grátis (veja "Evitar a espera") |
| Imagens antigas não aparecem | Passo 2 feito sem as imagens | Rode o script de novo num banco Neon novo |
| `Codigo de convite invalido` | Código diferente do configurado | Confira `APP_INVITE_CODE` no Render |

## Arquivos envolvidos

| Arquivo | Para quê |
|---|---|
| `Dockerfile` | Monta site + backend numa imagem só (usado pelo Render) |
| `.dockerignore` | Impede que configurações locais e senhas entrem na imagem |
| `backend/src/main/resources/application-prod.yml` | Configuração de produção; os valores vêm das variáveis de ambiente |
| `scripts/migrar-para-nuvem.ps1` | Leva o banco REAL e as imagens para o Neon |
| `backend/.../config/SpaWebConfig.java` | Faz o backend entregar o site e as rotas do React |
