# Reviradão — Regras e Conceitos

Este documento descreve **como o sistema funciona hoje** (conforme o código) e as decisões
tomadas pelo grupo. Se o código e este documento divergirem, trate como bug e corrija um dos dois.

> Última revisão: 28/09/2026.

---

## 1. Conceitos

### Usuários
- Qualquer pessoa pode se cadastrar pelo site; todo cadastro nasce como **`USER`** (jogador).
- **`ADMIN`** aprova pedidos, revisa obrigações, gera a lista rotativa, exclui registros e
  recalcula a edição. Um usuário vira admin pelo script `scripts/criar-usuario.ps1 -Admin`.
- Usuários desativados (`active = false`) perdem o acesso imediatamente.

### Edição
- É a competição do ano. Hoje existe apenas **"Reviradao 2026"** (01/01/2026 a 31/12/2026),
  criada pela migration V1. Não há tela para criar edições.
- Tudo acontece na **edição ativa**; só pode haver uma ativa.

### Jogos
- Catálogo compartilhado. Quando alguém digita um jogo que não existe, ele é criado na hora.
- **Um nome = um jogo**, sem diferenciar maiúsculas/minúsculas nem ano. Remakes precisam de
  nome diferente (ex.: "Resident Evil 4 Remake").
- O **ano de lançamento é opcional** e só pode ser definido por um admin.

### Conclusão (registro de jogo zerado)
- O jogador envia um **pedido** com: jogo, data, horas jogadas, marcações (primeira vez, em dia,
  platina, coop, hype) e **uma imagem de comprovante (obrigatória)**.
- O pedido fica **PENDENTE**. Só gera pontos quando um admin **APROVA**. Pode ser **CANCELADO**
  pelo próprio jogador ou por um admin enquanto estiver pendente.
- **Data da conclusão:** precisa estar entre o início da edição e o menor valor entre o fim da
  edição e **hoje** (não aceita datas passadas fora da edição nem datas futuras).
- **Um registro por jogador e jogo**, considerando pendentes e aprovados de **qualquer edição**.
  Pedidos **cancelados não contam**: quem cancelou pode enviar o mesmo jogo de novo.
- Registro já aprovado pode receber um **pedido de atualização** (horas, data, platina, hype,
  primeira vez, em dia, observações, novo anexo). **Coop e lista rotativa não podem ser
  alterados** por atualização. O admin vê a **prévia dos pontos** antes de aprovar; ao aprovar,
  a edição inteira é recalculada.

### Coop
- De 2 a 4 jogadores contando com quem registra. Quem registra escolhe os parceiros e o sistema
  cria um pedido para cada um, ligados pelo mesmo **grupo coop**.
- Cada pedido do grupo é aprovado separadamente (a tela de Solicitações aprova o grupo em sequência).

### Hype
- "Participação no Hype" sem zerar: vale apenas o ponto de participação (e não pode ser coop).
- "Hype concluído" exige a participação e soma o bônus de conclusão.
- Não existe cadastro de "qual jogo é o Hype": é uma marcação feita pelo jogador e conferida pelo admin.

### Lista Rotativa
- O admin importa uma base de jogos (.csv/.txt) e gera rodadas.
- Cada nova rodada mantém até **15** jogos da lista atual que ninguém zerou (sorteados) e
  completa até **30** com jogos da base que ainda não foram zerados na edição.
- A entrada é **consumida** quando o primeiro registro daquele jogo é aprovado.

### Obrigações
- A cada **20 pontos** o jogador libera **1 obrigação**: indicar um jogo que outro jogador deve zerar.
- Não vale para si mesmo, nem para jogo que o alvo já zerou, nem repetida enquanto houver uma ativa.
- Fluxo: `PENDENTE → ACEITA → revisão (parcial ou conclusão) → PARCIAL / CONCLUÍDA`.
  A conclusão é aprovada pela tela de Solicitações (junto com o registro do jogo).
- Quem criou pode cancelar enquanto estiver ativa: sem penalidade e a obrigação é devolvida.
- Se o admin **excluir** o registro que concluiu uma obrigação, ela **volta para ACEITA**
  (o +3 é removido) para o jogador concluir de novo.

---

## 2. Pontuação

Os pontos são gerados **no servidor, no momento da aprovação** (`ScoringEngine`). Cada ponto
vira um evento na tabela `score_events`.

### Regras de conclusão

| Código | Nome no site | Pontos | Quem decide |
|---|---|---|---|
| `GAME_COMPLETED` | Jogo fechado | +1 | automático |
| `FIRST_EXPERIENCE` | Primeira experiência | +1 | jogador marca, admin confere |
| `FIRST_IN_EDITION` | Primeiro no Reviradão | +1 | servidor (ver abaixo) |
| `IN_RELEASE_YEAR` | Em dia | +1 | jogador marca, admin confere |
| `TIME_VALUABLE_BLOCK` | Tempo valioso | +2 **a cada 25h** completas | horas informadas (máx. 1000h) |
| `PLATINUM` | Platina | +3 | jogador marca, admin confere |
| `COOP_RIGHT_HAND` | Braço direito | +2 | coop com até 4 jogadores |
| `HYPE_PARTICIPATION` | Participação no Hype | +1 | jogador marca, admin confere |
| `HYPE_COMPLETION_BONUS` | Hype concluído | +2 | jogador marca, admin confere |
| `ROTATIVE_LIST_BONUS` | Lista rotativa | +3 | servidor (ver abaixo) |
| `UNDERDOG_BONUS` | Café com leite | +3 | servidor (ver abaixo) |

Registro de **"só participação no Hype"** gera apenas `HYPE_PARTICIPATION`.

### Regras de obrigação

| Código | Pontos | Quando |
|---|---|---|
| `OBLIGATION_COMPLETED` | +3 | Registro do jogo da obrigação aprovado |
| `OBLIGATION_REFUSED` | −3 | Alvo recusou a obrigação |
| `OBLIGATION_CANCELLED` | −3 | Alvo cancelou depois de aceitar |
| `OBLIGATION_PARTIAL` | −1 | Admin aprovou revisão parcial |

Não há limite de pontos nem multiplicadores. O total pode ficar negativo.

### Detalhes das regras decididas pelo servidor

- **Primeiro no Reviradão:** vai para o **primeiro registro aprovado** daquele jogo na edição
  (ordem de aprovação). **Todos os membros do grupo coop** que fechou primeiro recebem o bônus,
  mesmo que outro registro seja aprovado entre eles.
- **Lista rotativa:** vale se o jogo estiver na lista ativa no momento da aprovação; a entrada é
  consumida. **Todos os membros do mesmo grupo coop** recebem o bônus.
- **Café com leite:** +3 se, **no momento da aprovação**, o jogador estiver 20 pontos ou mais
  atrás do líder da edição. Fica gravado no registro (não é recalculado depois).
- **Tempo valioso:** `blocos = parte inteira de (horas ÷ 25)`. Ex.: 74h → 2 blocos → +4.

### Exemplo

Zerou pela primeira vez, foi o primeiro da edição, 30h, sem platina:
`1 (jogo) + 1 (primeira vez) + 1 (primeiro) + 2 (um bloco de 25h) = 5 pontos`.

---

## 3. Ranking

- Soma de todos os eventos de pontuação do jogador na edição, calculada **em tempo real**.
- Ordenado do maior para o menor total. **Não há critério de desempate.**
- Só aparece quem tem pelo menos um evento de pontuação.
- **Recálculo** (botão do admin, e automático ao aprovar uma atualização ou excluir um registro):
  apaga e regenera os pontos de conclusão da edição. Pode mover o "Primeiro no Reviradão" de dono.
  Café com leite e lista rotativa ficam como foram gravados; pontos de obrigação não são mexidos.

---

## 4. Decisões registradas

| Data | Decisão |
|---|---|
| 28/09/2026 | Em coop, "Primeiro no Reviradão" e "Lista rotativa" valem para **todo o grupo**. |
| 28/09/2026 | A data da conclusão deve estar **dentro da edição e não pode ser futura**. |
| 28/09/2026 | Pedido **cancelado** não impede reenviar o mesmo jogo. |
| 28/09/2026 | Excluir um registro que concluiu obrigação **reabre a obrigação** (volta para ACEITA, sem o +3). |
| 28/09/2026 | Pedido de atualização **não altera coop nem lista rotativa**. |
| 28/09/2026 | Ano de lançamento dos jogos é opcional e **definido apenas por admin**. |

## Regras ainda não definidas

Precisam de decisão do grupo antes de mudar o código:

1. **Desempate** no ranking.
2. "Primeiro no Reviradão": deve ser o primeiro **aprovado** (atual) ou o primeiro a **zerar** (data)?
3. Café com leite: avaliar na **aprovação** (atual) ou quando o jogador **começa** o jogo, como diz o texto do site?
4. Pode registrar o mesmo jogo em **edições diferentes**? Hoje não pode.
5. "Em dia": zerou no **ano de lançamento** do jogo, ou é um jogo **lançado no ano da edição**?
6. **Hype**: qual jogo é o Hype e quem define?
7. Obrigação **parcial ("25%")**: 25% de quê? Hoje não é validado.
8. **Prazo** para obrigações.

---

## 5. Modelo de dados (resumo)

```
users ─┬─< completions >── games >──< genres
       │        │  └── platinum_proofs (1 comprovante por registro)
       │        └──< completion_update_requests
       ├─< obligations (quem enviou / quem recebeu / jogo / registro vinculado)
       └─< score_events (pontos; ligados à conclusão e/ou obrigação)

editions ─< completions, obligations, score_events, rotative_list_entries, rotative_source_games
admin_audit_logs  (histórico de ações)
```

As tabelas `global_goals` e `global_goal_contributions` existem no banco mas ainda não são usadas.
