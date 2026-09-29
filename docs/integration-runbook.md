# Guia de execução e operação

Como rodar o Reviradão no seu computador, alternar entre banco real e de teste, liberar o site
para os amigos e resolver os problemas mais comuns.

> Os caminhos abaixo (ex.: `D:\db\bin`, `C:\Tools\apache-maven-3.9.9`) são os da máquina onde este
> guia foi escrito. Na sua, ajuste para onde o programa estiver instalado.

---

## 1. Pré-requisitos

| Programa | Versão | Onde está (exemplo) |
|---|---|---|
| Java (JDK) | 21 | `C:\Program Files\Eclipse Adoptium\jdk-21...` |
| Maven | 3.9+ | `C:\Tools\apache-maven-3.9.9\bin\mvn.cmd` |
| Node.js + npm | 18+ | instalado normalmente |
| PostgreSQL | 18 (testado) | `D:\db\bin` (psql e pg_dump ficam aqui) |
| VS Code | — | extensões **Extension Pack for Java** e **Spring Boot Extension Pack** |

> No PowerShell, use `npm.cmd` em vez de `npm` se aparecer erro de "execução de scripts desabilitada".

---

## 2. Configuração inicial (uma vez)

### Backend
1. Copie `backend/src/main/resources/application.yml.example` para `application.yml` (mesma pasta).
2. Preencha `spring.datasource.username` e `password` com os dados do seu PostgreSQL.
3. Gere um segredo e coloque em `app.jwt.secret` (sem aspas):
   ```powershell
   $b = New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)
   ```
   Sem um segredo forte (32+ caracteres) o backend **se recusa a subir**. Isso é proposital.
4. Crie o banco real, se ainda não existir: `& 'D:\db\bin\psql.exe' -U postgres -c "CREATE DATABASE game_ranking;"`

### Frontend
1. Copie `reviradao/.env.example` para `reviradao/.env.local` (valor: `VITE_API_URL=/api/v1`).
2. Na pasta `reviradao`, rode `npm.cmd install`.

### VS Code
O arquivo `.vscode/launch.json` já traz três opções para o **F5**:
- **Backend (TESTE)** — usa o banco `game_ranking_teste`;
- **Backend (REAL)** — usa o banco `game_ranking`;
- **Anexar (porta 5005)** — para debug de um backend iniciado pelo terminal.

---

## 3. Rodando no dia a dia

1. **Backend:** F5 → escolha **TESTE** ou **REAL**. Espere a linha
   `Started GameRankingApplication`. Ele fica rodando (não "termina"). Para desligar: ⏹ (Shift+F5).
   - Pelo terminal (de dentro de `backend/`): `mvn.cmd spring-boot:run`
     (perfil de teste: `mvn.cmd spring-boot:run "-Dspring-boot.run.arguments=--spring.profiles.active=teste"`).
2. **Frontend:** em outro terminal:
   ```powershell
   cd reviradao
   npm.cmd run dev
   ```
3. Abra `http://localhost:5173`.

Como funciona a ligação: o site chama `/api/v1/...` no próprio endereço e o **proxy do Vite**
(`reviradao/vite.config.js`) repassa para `http://localhost:8080`.

---

## 4. Banco REAL x banco de TESTE

| | REAL | TESTE |
|---|---|---|
| Banco | `game_ranking` | `game_ranking_teste` |
| Como ligar | F5 → "Backend (REAL)" | F5 → "Backend (TESTE)" |
| Arquivo | `application.yml` | `application.yml` + `application-teste.yml` |

- Confirme no terminal: com TESTE aparece `The following 1 profile is active: "teste"`.
- **Cada banco tem suas próprias contas.** Ao trocar, **saia e entre de novo** no site.
- Para preparar o perfil de teste numa máquina nova:
  1. copie `application-teste.yml.example` para `application-teste.yml`;
  2. crie o banco: `& 'D:\db\bin\psql.exe' -U postgres -c "CREATE DATABASE game_ranking_teste;"`;
  3. suba com "Backend (TESTE)": o Flyway cria todas as tabelas sozinho.
- Para **zerar** o banco de teste (backend desligado):
  ```powershell
  & 'D:\db\bin\psql.exe' -U postgres -c "DROP DATABASE game_ranking_teste;" -c "CREATE DATABASE game_ranking_teste;"
  ```

---

## 5. Migrations (atualizações do banco)

- Ficam em `backend/src/main/resources/db/migration` (`V1` … `V17`) e são aplicadas **sozinhas**
  quando o backend sobe (Flyway).
- Ver quais já foram aplicadas:
  ```powershell
  & 'D:\db\bin\psql.exe' -U postgres -d game_ranking -c "select version, description, success from flyway_schema_history order by installed_rank;"
  ```
- **Nunca edite uma migration que já rodou.** Para mudar o banco, crie a próxima (`V18__descricao.sql`).
- Faça **backup antes** de subir uma versão com migrations novas no banco REAL.

---

## 6. Usuários e admins

Com o backend ligado, na pasta do projeto:

```powershell
# jogador comum (banco de TESTE, padrão)
powershell -ExecutionPolicy Bypass -File .\scripts\criar-usuario.ps1 -Nome "Joao" -Email "joao@teste.com" -Senha "senha123"

# admin (se o e-mail já existir, apenas promove)
powershell -ExecutionPolicy Bypass -File .\scripts\criar-usuario.ps1 -Nome "Alex" -Email "alex@teste.com" -Senha "senha123" -Admin

# no banco REAL
powershell -ExecutionPolicy Bypass -File .\scripts\criar-usuario.ps1 -Nome "Alex" -Email "alex@x.com" -Senha "senha123" -Admin -Banco game_ranking
```

- O cadastro passa pela API (senha criptografada como no site); a promoção a admin é feita no banco.
- Quem virou admin precisa **sair e entrar** de novo para ver o menu Admin.
- Os amigos podem se cadastrar sozinhos pelo site.

---

## 7. Backup e restauração

Guarde os backups **fora da pasta do projeto** (eles contêm e-mails e senhas criptografadas).
Arquivos `backup*.sql` na raiz do projeto já são ignorados pelo Git, por segurança.

```powershell
# backup com data e hora no nome
& 'D:\db\bin\pg_dump.exe' -U postgres -d game_ranking -f "D:\backups\game_ranking_$(Get-Date -Format yyyy-MM-dd_HH-mm).sql"

# restaurar em um banco NOVO (para conferir antes de substituir o original)
& 'D:\db\bin\psql.exe' -U postgres -c "CREATE DATABASE game_ranking_restaurado;"
& 'D:\db\bin\psql.exe' -U postgres -d game_ranking_restaurado -f "D:\backups\ARQUIVO.sql"
```

Alternativa visual: no **pgAdmin**, botão direito no banco → **Backup...** / **Restore...**.

> As imagens (comprovantes e avatares) ficam em `backend/storage/` e **não** estão no backup do
> banco. Copie essa pasta junto.

---

## 8. Liberar o site para os amigos (túnel)

O túnel cria um endereço público `https://...trycloudflare.com` que aponta para o seu PC.

**Instalar (uma vez):**
```powershell
winget install --id Cloudflare.cloudflared
```
Depois de instalar, **feche o VS Code inteiro e abra de novo** (senão o comando não é reconhecido).

**Ligar:** backend e frontend rodando, então em um terceiro terminal:
```powershell
cloudflared tunnel --url http://localhost:5173
```
Procure no terminal o endereço `https://<palavras>.trycloudflare.com` e envie aos amigos.

**Cuidados:**
- O site só funciona com **o PC ligado**, backend + frontend + túnel rodando e internet ativa.
- Desative a suspensão do PC (Configurações → Sistema → Energia).
- **O endereço muda** sempre que o túnel é reiniciado.
- Use o banco de **TESTE** para experimentar com os amigos.
- Endereços de túnel aceitos pelo Vite estão em `server.allowedHosts` no `vite.config.js`
  (`.trycloudflare.com` e `.ngrok-free.app`).

**Checklist antes de liberar:**
- [ ] Backup do banco feito
- [ ] Backend no banco certo (TESTE ou REAL)
- [ ] Sua conta de admin criada nesse banco
- [ ] Link do túnel testado no seu celular (abrir, cadastrar, enviar um jogo com imagem)

---

## 9. Problemas comuns

| Sintoma | Causa | Solução |
|---|---|---|
| Backend para ao subir: `app.jwt.secret nao configurado` ou `precisa ter pelo menos 32 bytes` | Segredo ausente, fraco ou de exemplo | Gere um segredo (seção 2) e salve o `application.yml` (Ctrl+S) |
| `Schema-validation: missing column [...]` | Banco desatualizado e Flyway desligado | Mantenha `spring.flyway.enabled: true`; ao subir, as migrations pendentes são aplicadas |
| `Unable to start embedded Tomcat` / porta 8080 ocupada | Outro backend já está rodando | `netstat -ano \| findstr :8080` e `taskkill /PID <numero> /F` |
| `'cloudflared' não é reconhecido` | VS Code aberto antes da instalação | Feche e abra o VS Code, ou rode `& 'C:\Program Files (x86)\cloudflared\cloudflared.exe' tunnel --url http://localhost:5173` |
| `'psql' não é reconhecido` | Pasta do PostgreSQL fora do PATH | Use o caminho completo: `& 'D:\db\bin\psql.exe' ...` |
| No psql, "não consigo digitar a senha" | A senha fica invisível de propósito | Digite normalmente e aperte Enter; ou defina `$env:PGPASSWORD = 'senha'` antes |
| Pelo túnel, cadastro/login falham (código 403, `Invalid CORS request`) | Proxy repassando a origem do túnel | Já corrigido no `vite.config.js`; reinicie o `npm.cmd run dev` se estiver com versão antiga |
| `Blocked request. This host is not allowed` | Endereço do túnel não liberado no Vite | Adicione o domínio em `server.allowedHosts` no `vite.config.js` |
| Site volta para o login ao trocar de banco | Sua conta não existe no banco atual | Esperado. Crie a conta nesse banco (seção 6) e entre de novo |
| Imagens antigas não aparecem | Backend iniciado fora da pasta `backend/` | Rode pelo F5 ou de dentro de `backend/` |
| Menu Admin não aparece | Promovido a admin com a sessão aberta | Saia e entre de novo |
| Terminal com "um monte de linhas" e parou | Erro ao subir | Procure `APPLICATION FAILED TO START` ou a **última** linha `Caused by:` |

Para investigar outros problemas, veja o [guia de debug](debugging.md).
