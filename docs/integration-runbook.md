# Runbook de Integracao: Backend + Frontend

Este documento resume o processo para subir, conectar e validar o backend e o frontend deste projeto sem repetir toda a investigacao feita na configuracao inicial.

## Objetivo

Nao precisamos refazer todo o trabalho do zero a cada validacao.

Se estas configuracoes forem mantidas:

- backend com banco configurado localmente
- frontend com `VITE_API_URL` apontando para a API
- CORS permitido para o host do Vite

entao a validacao passa a ser um processo curto e repetivel.

## Estrutura atual

- Backend: `backend/`
- Frontend: `reviradao/`
- Base URL da API: `http://localhost:8080/api/v1`
- Frontend dev server: `http://localhost:5173`

## Pre-requisitos

### Backend

- Java 21
- Maven 3.9+
- PostgreSQL local ativo
- Banco `game_ranking` acessivel com as credenciais locais

### Frontend

- Node.js 18+
- npm

## Arquivos de configuracao importantes

### Backend

Arquivo local:

- `backend/src/main/resources/application.yml`

Arquivo de exemplo:

- `backend/src/main/resources/application.yml.example`

Este arquivo esta no `.gitignore` e deve continuar local quando contiver credenciais reais.

Configuracoes importantes:

- `spring.datasource.url`
- `spring.datasource.username`
- `spring.datasource.password`
- `server.port`

### Frontend

Arquivo local:

- `reviradao/.env.local`

Arquivo de exemplo:

- `reviradao/.env.example`

Conteudo esperado:

```env
VITE_API_URL=http://localhost:8080/api/v1
```

Esse arquivo tambem esta ignorado pelo Git.

## Como criar os arquivos locais a partir dos exemplos

### Backend

Copie:

- `backend/src/main/resources/application.yml.example`

para:

- `backend/src/main/resources/application.yml`

Depois ajuste:

- `spring.datasource.url`
- `spring.datasource.username`
- `spring.datasource.password`

### Frontend

Copie:

- `reviradao/.env.example`

para:

- `reviradao/.env.local`

Depois ajuste a URL da API se o backend nao estiver na porta padrao.

## Como subir o backend

No PowerShell:

```powershell
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot'
$env:Path="$env:JAVA_HOME\bin;C:\Tools\apache-maven-3.9.9\bin;$env:Path"
C:\Tools\apache-maven-3.9.9\bin\mvn.cmd spring-boot:run
```

Se a porta `8080` estiver ocupada, ha duas opcoes:

### Opcao 1: liberar a porta

```powershell
netstat -ano | findstr :8080
taskkill /PID SEU_PID /F
```

### Opcao 2: subir em outra porta

```powershell
C:\Tools\apache-maven-3.9.9\bin\mvn.cmd spring-boot:run "-Dspring-boot.run.arguments=--server.port=8081"
```

Se usar outra porta, ajuste tambem o frontend:

```env
VITE_API_URL=http://localhost:8081/api/v1
```

## Como subir o frontend

No diretorio `reviradao/`:

```powershell
npm.cmd install
npm.cmd run dev
```

Observacao:

- Em PowerShell, `npm` pode falhar por causa da policy de scripts.
- Se isso acontecer, use `npm.cmd` em vez de `npm`.

## Validacao rapida da integracao

### 1. Testar o backend sozinho

```powershell
Invoke-WebRequest http://localhost:8080/api/v1/ranking
```

Esperado:

- status `200`

### 2. Testar cadastro

```powershell
$body = @{ displayName = 'Teste Local'; email = 'teste.local@example.com'; password = '123456' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri 'http://localhost:8080/api/v1/auth/register' -ContentType 'application/json' -Body $body
```

### 3. Testar login

```powershell
$body = @{ email = 'teste.local@example.com'; password = '123456' } | ConvertTo-Json
Invoke-WebRequest -Method Post -Uri 'http://localhost:8080/api/v1/auth/login' -ContentType 'application/json' -Body $body -UseBasicParsing
```

Resposta esperada:

```json
{
  "accessToken": "...",
  "tokenType": "Bearer",
  "expiresIn": 7200,
  "userId": "...",
  "displayName": "...",
  "role": "USER"
}
```

### 4. Testar o frontend no navegador

Fluxo esperado:

1. abrir `http://localhost:5173`
2. criar conta ou fazer login
3. acessar ranking
4. verificar se os dados carregam sem erro de CORS ou 401 inesperado

## Contrato atual entre frontend e backend

O frontend foi ajustado para o contrato real da API.

### Login

Endpoint:

- `POST /auth/login`

O backend retorna:

- `accessToken`
- `userId`
- `displayName`
- `role`

O frontend salva:

- `auth_token`
- `user_id`
- `user_email`
- `user_display_name`

### Registro

Endpoint:

- `POST /auth/register`

Hoje o backend cria o usuario, mas nao autentica automaticamente.
Por isso, o frontend faz:

1. `register`
2. `login`

em seguida.

## Problemas ja resolvidos neste projeto

### 1. Assinatura de CORS no Spring

O arquivo `CorsConfig.java` foi ajustado para usar `List.of(...)`, compativel com a API atual do Spring.

### 2. Contrato de autenticacao

O frontend antes esperava `token`, mas o backend retorna `accessToken`.
Isso ja foi corrigido no contexto de autenticacao.

### 3. Politica do PowerShell para npm

Usar `npm.cmd` evita o bloqueio comum de execucao de `npm.ps1`.

## Checklist antes de validar

- PostgreSQL esta ativo
- credenciais em `application.yml` estao corretas
- backend subiu sem erro
- `VITE_API_URL` aponta para a porta certa
- frontend subiu em `5173`
- sem conflito de porta na `8080`

## O que fazer se quebrar de novo

### Erro de senha no banco

Verificar:

- `backend/src/main/resources/application.yml`

Campos:

- `spring.datasource.username`
- `spring.datasource.password`

### Erro de porta ocupada

Executar:

```powershell
netstat -ano | findstr :8080
```

### Erro de CORS

Verificar:

- `backend/src/main/java/com/gameranking/config/CorsConfig.java`

Hosts esperados:

- `http://localhost:5173`
- `http://localhost:3000`

### Frontend nao autentica

Verificar:

- `reviradao/src/contexts/AuthContext.jsx`

Confirmar que esta usando:

- `accessToken`
- `userId`

e nao `token`.

## Melhorias futuras recomendadas

Para deixar esse processo ainda mais simples, as proximas melhorias mais uteis seriam:

1. adicionar `mvnw` ao backend para nao depender de Maven instalado globalmente
2. adicionar scripts na raiz para subir backend e frontend juntos
3. adicionar um README raiz com setup rapido

## Resumo pratico

Nao, nao precisamos repetir toda a descoberta tecnica a cada validacao.

Com os arquivos locais corretos e este runbook, o processo passa a ser:

1. subir o banco
2. subir o backend
3. subir o frontend
4. testar `ranking`, `register` e `login`

Se essas configuracoes forem preservadas, a integracao fica previsivel e reaproveitavel.
