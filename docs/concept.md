# Reviradão — Regras e Conceitos

Este documento descreve **como o sistema funciona hoje** (conforme o código) e as decisões
tomadas pelo grupo. Se o código e este documento divergirem, trate como bug e corrija um dos dois.

> Última revisão: 28/09/2026.

---

## 1. Conceitos

### Usuários
- Qualquer pessoa pode se cadastrar pelo site; todo cadastro nasce como **`USER`** (jogador).
  Na versão publicada na nuvem, o cadastro exige o **código de convite** definido pelo admin.
- **Cargos**, do maior para o menor: **Fundador > Co-fundador > Admin > Jogador** (`USER`).
  Admin, Co-fundador e Fundador formam a **equipe**: aprovam pedidos, revisam obrigações,
  geram a lista rotativa, excluem registros e recalculam a edição.
- Quem pode o quê (tela **Usuários** do painel Admin; regras em `UserPermissions.java`):

  | Cargo | Mudar cargos | Editar nome de | Código de senha para |
  |---|---|---|---|
  | **Fundador** | dá/tira Co-fundador, Admin e Jogador | si mesmo e cargos abaixo | cargos abaixo |
  | **Co-fundador** | dá/tira Admin e Jogador | si mesmo e cargos abaixo | cargos abaixo |
  | **Admin** | não | si mesmo e Jogadores | Jogadores |
  | **Jogador** | não | não | não |

  Ninguém altera o próprio cargo, nem o de quem está no mesmo nível ou acima.
  **Fundador só é definido direto no banco de dados**, nunca pelo site. Toda alteração vai para o log.
- Qualquer jogador troca a **própria senha** em *Menu → Alterar senha*.
- **Esqueci minha senha** (sem e-mail): o jogador pede em *Login → Esqueci minha senha*;
  o pedido aparece em *Admin → Usuários → Pedidos de senha*; um admin com cargo acima
  gera um **código** (ex.: `ABCD-1234`) e passa para ele (WhatsApp etc.). O jogador volta em
  *Esqueci minha senha → Já tenho um código* e escolhe a senha nova.
  - O código vale **30 minutos**, é de **uso único** e é guardado só como hash.
  - **5 tentativas erradas** cancelam o código; gerar um código novo invalida o anterior.
  - No máximo **3 pedidos por hora** por usuário; a tela responde igual exista ou não o e-mail.
  - O admin também pode gerar o código direto (botão *Código de senha*), sem pedido.
  - Tudo vai para o log (`PASSWORD_RESET_*`). Não há envio de e-mail: o Render gratuito bloqueia SMTP.
- Usuários desativados (`active = false`) perdem o acesso imediatamente.
- **Conta Steam (opcional):** em *Menu → Conectar Steam* o jogador entra **no site oficial da Steam**
  e a Steam informa ao Reviradão apenas o **SteamID** (número público do perfil). O Reviradão não
  recebe senha nem nenhum acesso à conta Steam, e o vínculo **não serve para entrar** no site.
  - O perfil vinculado é **visível para todo o grupo** (link "Perfil na Steam" nos jogos do jogador, no Ranking).
  - Um perfil Steam só pode estar ligado a uma conta. O jogador pode desconectar quando quiser.
  - Cada tentativa vale **10 minutos** e **uma única vez**; o servidor confirma cada resposta
    direto com a Steam antes de aceitar. Conectar e desconectar vão para o log (`STEAM_*`).
  - Só funciona pelo endereço configurado em `app.public-url` (por túnel, troque esse endereço).

### Edição
- É a competição do ano. Hoje existe apenas **"Reviradao 2026"** (01/01/2026 a 31/12/2026),
  criada pela migration V1. Não há tela para criar edições.
- Tudo acontece na **edição ativa**; só pode haver uma ativa.

### Jogos
- Catálogo compartilhado. Quando alguém digita um jogo que não existe, ele é criado na hora.
- **Um nome = um jogo**, sem diferenciar maiúsculas/minúsculas nem ano. Remakes precisam de
  nome diferente (ex.: "Resident Evil 4 Remake").
- O **ano de lançamento é opcional** e só pode ser definido por um admin.
- **Sugestões da Steam:** ao digitar o nome, o site também sugere jogos da loja Steam. Escolhendo
  uma delas, o jogo é cadastrado com o **nome oficial e o ano de lançamento da Steam** (o servidor
  consulta a Steam; por isso o ano vale mesmo quando quem cadastra é jogador). Se o jogo já existia
  pelo nome, ele ganha o vínculo com a Steam e o ano, se ainda não tinha; um ano definido por admin
  nunca é trocado. Se a Steam estiver fora do ar, o cadastro segue pelo nome digitado, sem ano.
- O ano de lançamento é **informativo**: aparece na tela de Solicitações para o admin conferir o
  bônus "Em dia", mas não muda nenhum ponto sozinho.

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
- **Conferência na Steam:** se o jogo está ligado à Steam e o jogador conectou a conta Steam, o
  servidor consulta as **horas** e as **conquistas** do jogo no perfil dele ao enviar o registro,
  ao editar um pedido pendente e ao pedir atualização. O resultado aparece no pedido, na tela de
  Solicitações, com avisos quando:
  - as horas declaradas passam das registradas na Steam (folga de 2h ou 20%, o que for maior);
  - marcou platina, mas a Steam não mostra 100% das conquistas;
  - marcou platina num jogo com menos de 9 conquistas (não conta como platina).
  É **só evidência**: não muda pontos sozinha, e a decisão continua com o admin. A Steam registra o
  tempo total desde sempre (não só o da edição) e não sabe se o jogo foi "zerado"; o comprovante
  continua obrigatório. Perfil privado, jogo fora da biblioteca ou Steam fora do ar aparecem como
  aviso, sem travar o registro. O dono do registro e a equipe podem "Conferir de novo".
  Exige a chave da Steam Web API no servidor (`app.steam.api-key` / `STEAM_API_KEY`).

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
| `IN_RELEASE_YEAR` | Em dia | +1 | sistema sugere pelo ano de lançamento; jogador pode mudar; admin confere (ver abaixo) |
| `TIME_VALUABLE_BLOCK` | Tempo valioso | +2 **a cada 25h** completas | horas informadas (máx. 1000h) |
| `PLATINUM` | Platina | +3 | sistema sugere pelas conquistas da Steam; jogador pode mudar; admin confere (ver abaixo) |
| `COOP_RIGHT_HAND` | Braço direito | +2 | coop com até 4 jogadores |
| `HYPE_PARTICIPATION` | Participação no Hype | +1 | jogador marca, admin confere |
| `HYPE_COMPLETION_BONUS` | Hype concluído | +2 | jogador marca, admin confere |
| `ROTATIVE_LIST_BONUS` | Lista rotativa | +3 | servidor (ver abaixo) |
| `UNDERDOG_BONUS` | Café com leite | +3 | servidor (ver abaixo) |

Registro de **"só participação no Hype"** gera apenas `HYPE_PARTICIPATION`.

**"Em dia" (`IN_RELEASE_YEAR`):** vale para jogo **lançado no ano da edição**. Quando o ano de
lançamento é conhecido (veio da Steam ou foi definido por um admin), a tela de registro (e a
conclusão de obrigação) **já marca ou desmarca** o bônus sozinha e mostra de onde veio o ano. O
jogador ainda pode mudar, porque a data da Steam às vezes é a do PC e não a original (ports de
console, acesso antecipado). Se ele marcar "Em dia" num jogo de outro ano, a tela de Solicitações
mostra o alerta *"Marcou Em dia, mas o jogo foi lançado em ..."* para o admin conferir. Sem ano
conhecido, segue como antes: o jogador marca e o admin confere.

**"Platina" (`PLATINUM`):** em jogo da Steam, se o jogador conectou a conta Steam, a tela de
registro (e a conclusão de obrigação) consulta as conquistas **dele** e **já marca a platina**
quando ele tem **100% das conquistas**, **não importa quando** foram desbloqueadas.
- **Mínimo de 9 conquistas:** jogo com menos de 9 conquistas no total **não conta como platina**,
  mesmo com 100% (5/5 não conta; 9/9 conta). O número fica em
  `SteamPlatinumPreviewService.MIN_ACHIEVEMENTS_FOR_PLATINUM`.
- Faltando conquista, ou com menos de 9 no total, a opção vem desmarcada.
- Não marca nem desmarca sozinha quando não dá para afirmar: sem conta Steam conectada, perfil
  privado ou jogo sem conquistas na Steam (pode ser platina de console, que a Steam não conhece).

O jogador pode mudar, e a conferência na Steam do pedido mostra ao admin qualquer divergência. O
anexo continua obrigatório.

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
| 17/10/2026 | "Em dia" = jogo **lançado no ano da edição**. |
| 17/10/2026 | Platina = **100% das conquistas**, não importa quando; jogo com **menos de 9 conquistas** não conta. |
| 28/09/2026 | Ano de lançamento dos jogos é opcional e **definido apenas por admin**. |
| 15/10/2026 | Cargos **Fundador > Co-fundador > Admin > Jogador**; Fundador só pelo banco. |
| 15/10/2026 | Nome de exibição só é alterado pela equipe; senha, pelo próprio jogador (Menu). |

## Regras ainda não definidas

Precisam de decisão do grupo antes de mudar o código:

1. **Desempate** no ranking.
2. "Primeiro no Reviradão": deve ser o primeiro **aprovado** (atual) ou o primeiro a **zerar** (data)?
3. Café com leite: avaliar na **aprovação** (atual) ou quando o jogador **começa** o jogo, como diz o texto do site?
4. Pode registrar o mesmo jogo em **edições diferentes**? Hoje não pode.
5. ~~"Em dia": zerou no ano de lançamento ou é lançado no ano da edição?~~ **Decidido em 17/10/2026:**
   jogo **lançado no ano da edição** (como a conclusão sempre fica dentro da edição, dá no mesmo). Ver a regra `IN_RELEASE_YEAR` acima.
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
