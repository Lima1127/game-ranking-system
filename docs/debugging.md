# Guia de debug (para quem está começando)

"Debugar" é **pausar o programa numa linha que você escolher** e olhar, com calma, os valores de
tudo naquele momento — como dar pause num vídeo. Este guia mostra como fazer isso no Reviradão.

---

## 1. Antes de tudo: ler o erro do terminal

Quando o backend não sobe, o terminal mostra muitas linhas (o "log"). Não é preciso ler tudo:

1. Procure `APPLICATION FAILED TO START`, ou
2. Procure a **última** linha que começa com `Caused by:` — ali está o motivo real.

Exemplo:
```
Caused by: java.lang.IllegalStateException: app.jwt.secret nao configurado ...
```
→ o segredo não foi configurado (veja o [guia de execução](integration-runbook.md#9-problemas-comuns)).

Se o backend subiu bem, aparece `Started GameRankingApplication in X seconds` e ele **fica
rodando** — isso é o normal para um servidor.

---

## 2. Primeiro debug: ver os pontos sendo calculados

O arquivo `backend/src/main/java/com/gameranking/service/scoring/ScoringEngine.java` calcula
os pontos. Vamos pausar o programa ali.

1. **Coloque um breakpoint:** abra o `ScoringEngine.java` e clique à esquerda do número da linha
   que contém `"GAME_COMPLETED"`. Aparece uma **bolinha vermelha**.
2. **Ligue o backend:** F5 → "Backend (TESTE)".
3. **Ligue o site:** `cd reviradao` e `npm.cmd run dev`.
4. **Faça o código rodar:** esse trecho só roda quando um admin **aprova** um pedido.
   - com uma conta comum, registre um jogo de teste;
   - com uma conta admin, vá em **Solicitações** e clique em **Aprovar**.
5. **O VS Code vai parar** na linha marcada (ela fica amarela). O site fica "carregando" — é
   normal, o programa está pausado esperando você.
6. **Olhe os valores:** no painel **Run and Debug** (ícone ▶ com um besourinho, à esquerda),
   seção **VARIABLES**, abra `completion` e veja `hoursPlayed`, `platinum`, `coop`...
   Também dá para passar o mouse sobre qualquer variável no código.
7. **Ande pelo código:** **F10** executa a linha e para na próxima. Veja a lista `events` crescer.
8. **Solte o programa:** **F5**. A aprovação termina normalmente.

Para tirar o breakpoint, clique na bolinha de novo.

### Atalhos

| Tecla | O que faz |
|---|---|
| **F5** | Liga o programa / continua depois de uma pausa |
| **F10** | Executa a linha atual e para na próxima |
| **F11** | Entra dentro da função da linha atual |
| **Shift+F11** | Sai da função atual |
| **Shift+F5** | Desliga o programa |

### Bons lugares para breakpoints

| Quero entender… | Arquivo / método |
|---|---|
| Quais regras pontuaram | `ScoringEngine.buildCompletionEvents` |
| Aprovação (primeiro na edição, café com leite, rotativa) | `CompletionService.approve` |
| Recálculo da edição | `EditionScoreRecalculationService.recalculateEdition` |
| Por que um pedido foi recusado | `CompletionService.create` (validações no início) |
| Obrigações | `ObligationService` |
| Login / "usuário não autenticado" | `BearerTokenAuthenticationFilter.doFilterInternal` |

---

## 3. Ver mais detalhes no log

Adicione no `application.yml` (só enquanto estiver investigando — deixa o log bem grande):

```yaml
logging:
  level:
    com.gameranking: DEBUG
    org.hibernate.SQL: DEBUG               # mostra o SQL executado
    org.hibernate.orm.jdbc.bind: TRACE     # mostra os valores usados no SQL
    org.springframework.security: DEBUG    # mostra por que uma requisição foi negada
```

---

## 4. Olhar o banco de dados

Abra o psql (menu Iniciar → "SQL Shell (psql)", ou no terminal
`& 'D:\db\bin\psql.exe' -U postgres -d game_ranking_teste`). A senha não aparece ao digitar.
Todo comando termina com `;`. Para sair: `\q`.

```sql
-- de onde vieram os pontos de cada jogador
SELECT u.display_name, se.rule_code, se.points, se.reason, se.created_at
FROM score_events se JOIN users u ON u.id = se.user_id
ORDER BY se.created_at DESC LIMIT 30;

-- ranking "na mão", para comparar com a tela
SELECT u.display_name, SUM(se.points) AS total
FROM score_events se JOIN users u ON u.id = se.user_id
GROUP BY u.display_name ORDER BY total DESC;

-- pedidos e status
SELECT u.display_name, g.name, c.status, c.completed_at, c.hours_played
FROM completions c JOIN users u ON u.id = c.user_id JOIN games g ON g.id = c.game_id
ORDER BY c.created_at DESC;
```

> Só **consulte** (`SELECT`). Alterar dados direto no banco pula as regras do sistema.

---

## 5. Debugar o site (navegador)

1. Com o site aberto, aperte **F12** (DevTools).
2. Aba **Network** → filtro **Fetch/XHR** → repita a ação que deu problema.
3. Clique na requisição em vermelho:
   - **Headers** → *Status Code* (401, 404, 422…);
   - **Payload** → o que o site enviou;
   - **Response** → a resposta; o campo `message` explica o erro.
4. Aba **Sources**: aperte **Ctrl+P**, abra um arquivo `.jsx` e clique na linha para pausar
   (funciona igual ao VS Code). Também dá para escrever `debugger;` no código.

O significado de cada código está no [README](../README.md#formato-de-erro).

---

## 6. Chamar a API sem o site (PowerShell)

```powershell
$api = 'http://localhost:8080/api/v1'
$login = Invoke-RestMethod -Method Post "$api/auth/login" -ContentType 'application/json' `
  -Body (@{ email = 'voce@teste.com'; password = 'sua-senha' } | ConvertTo-Json)
$h = @{ Authorization = "Bearer $($login.accessToken)" }

Invoke-RestMethod "$api/ranking" -Headers $h | Format-Table
Invoke-RestMethod "$api/completions/submissions" -Headers $h | Select-Object gameName, status, ruleCodes
```

---

## 7. Testes automatizados

```powershell
cd backend
mvn.cmd test                               # todos
mvn.cmd test "-Dtest=TokenServiceTest"     # só uma classe
```

No VS Code aparece **Run Test | Debug Test** acima de cada `@Test`; "Debug Test" para nos breakpoints.

**Bom hábito:** achou um bug de pontuação? Escreva primeiro um teste que reproduz o problema
(veja `EditionScoreRecalculationServiceTest` como modelo), confirme que ele falha, corrija e
veja passar.

---

## 8. Roteiro para investigar um problema de pontos

1. **Site:** F12 → Network — qual chamada falhou e o que ela respondeu?
2. **Banco:** consulte `score_events` daquele jogador (seção 4).
3. **Backend:** breakpoint em `CompletionService.approve` ou `ScoringEngine` e repita a ação.
4. **Teste:** reproduza num teste automatizado, corrija e rode `mvn.cmd test`.
