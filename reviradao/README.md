# Reviradão — Frontend

Site do Reviradão feito com React + Vite. Visão geral do projeto no [README principal](../README.md).

## Rodando

```powershell
npm.cmd install      # primeira vez
npm.cmd run dev      # desenvolvimento em http://localhost:5173
npm.cmd run build    # gera a versão de produção em dist/ (use para checar se compila)
```

O backend precisa estar rodando na porta 8080 (veja o [guia de execução](../docs/integration-runbook.md)).

## Como o site fala com o backend

- `src/services/api.js` usa a base `/api/v1` (relativa ao endereço do site).
- O **proxy do Vite** (`vite.config.js`) repassa `/api` para `http://localhost:8080`.
  Assim o mesmo código funciona em `localhost` e através de um túnel (Cloudflare/ngrok).
- O proxy remove o cabeçalho `Origin` porque, para o navegador, site e API estão no mesmo endereço;
  sem isso o backend recusaria (CORS) os envios feitos pelo endereço do túnel.
- Endereços de túnel aceitos ficam em `server.allowedHosts`.

### Variáveis de ambiente (`.env.local`, fora do Git)

```env
VITE_API_URL=/api/v1
```

## Sessão

- O login é guardado no `localStorage` (`auth_token`, `user_id`, `user_role`...).
- Quando o backend responde **401** (login expirado ou usuário inexistente no banco atual),
  `api.js` limpa a sessão e manda para `/login`.
- Mensagens de erro do backend (`message`) são repassadas para as telas.

## Telas (`src/pages`)

| Rota | Tela |
|---|---|
| `/login`, `/register` | Entrar / criar conta |
| `/dashboard` | Avatar e atalhos |
| `/ranking` | Pódio, tabela da edição e regras de pontuação |
| `/completion` | Registrar jogo (inclui coop, hype e lista rotativa) |
| `/requests` | Solicitações: pedidos novos e atualizações; admin aprova aqui |
| `/requests/:kind/:id/edit` | Editar pedido pendente |
| `/completion/:id/update` | Pedir atualização de registro aprovado |
| `/obligations` | Obrigações |
| `/rotative-list` | Lista rotativa (admin importa/gera) |
| `/admin/records`, `/admin/logs` | Painel admin e log de auditoria |

## Pontos de atenção

- A tabela de regras exibida em `RankingPage.jsx` (`scoringRules`) é uma cópia dos valores do
  backend (`ScoringEngine`). Se uma regra mudar, atualize os dois.
- Não há testes automatizados no frontend; valide com `npm.cmd run build`.
