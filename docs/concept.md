# Game Ranking System - Documentação Conceitual

## 📋 Visão Geral

O **Game Ranking System** é uma plataforma de ranking competitivo para jogadores. O sistema permite que usuários registrem a conclusão de jogos dentro de "edições" (competições) e acumula pontos baseado em vários critérios de desempenho, criando um ranking ordenado por pontuação.

---

## 🎮 Conceitos Principais

### 1. **Usuários (Users)**
- São os participantes do sistema
- Possuem dois níveis de acesso: **Admin** e **Usuário Comum**
- Cada usuário tem um nome de exibição e credenciais de login
- Podem participar de múltiplas edições de ranking

### 2. **Edições (Editions)**
- São competições/rodadas de ranking com período definido
- Possuem data de início e fim
- Cada edição contém vários jogadores participando e competindo
- Ao final da edição, gera-se um ranking final

### 3. **Jogos (Games)**
- Representam os títulos que podem ser completados
- Contêm informações como:
  - **Nome e ano de lançamento**
  - **Tempo estimado** para completar a campanha principal
  - **Tempo estimado** para obter platina (100% completude)
  - **Gêneros** associados

### 4. **Conclusões (Completions)**
- Registra quando um usuário completou um jogo
- Fornece detalhes sobre a experiência:
  - Data de conclusão
  - Horas realmente jogadas
  - Se foi **primeira vez do usuário** nesse jogo
  - Se foi **primeiro na edição** a completar
  - Se completou **no ano de lançamento** do jogo
  - Se conquistou **platina** (100%)
  - Tipo de modo de jogo (single/coop)

### 5. **Sistema de Pontuação**
O sistema acumula **pontos de pontuação** com base em várias conquistas durante uma conclusão:

| Critério | Pontos | Descrição |
|----------|--------|-----------|
| Jogo Fechado | 1 | Qualquer conclusão de jogo |
| Primeira Experiência | 1 | Primeira vez na vida completando este jogo |
| Primeiro na Edição | 1 | Primeiro participante a completar este jogo nesta edição |
| Em Dia | 1 | Completou no mesmo ano do lançamento do jogo |
| Tempo Valioso | 2/bloco | A cada 25 horas jogadas (blocos) |
| Platina | 3 | Obteve 100% de completude |
| Braço Direito | 2 | Completou em modo Coop com até 4 jogadores |
| Participação no Hype | 1 | Participou de eventos especiais |

### 6. **Ranking**
- É gerado dinâmica ou periodicamente
- Mostra a posição de cada usuário em uma edição
- Ordenado pelo total de pontos acumulados
- Pode filtrar por edição específica

### 7. **Provas de Platina (PlatinumProof)**
- Upload de evidências (screenshots, vídeos) de conclusões
- Permite validação das conquistas
- Importante para manter integridade competitiva

---

## 🔄 Fluxo Principal

```
1. ADMINISTRAÇÃO
   └─ Admin cria uma nova Edição (data início/fim)
   └─ Admin cadastra/atualiza Jogos no sistema

2. PARTICIPAÇÃO
   └─ Usuários se registram e fazem login
   └─ Usuários navegam catálogo de Jogos
   └─ Usuários completam Jogos

3. REGISTRO DE COMPLETAÇÃO
   └─ Usuário submete uma Conclusão de Jogo
   └─ Sistema valida dados (horas, datas, etc)
   └─ ScoringEngine calcula pontos aplicáveis
   └─ Pontos são acumulados para o usuário

4. UPLOAD DE PROVAS (Opcional)
   └─ Usuário pode fazer upload de provas de platina
   └─ Sistema armazena como evidência

5. VISUALIZAÇÃO DE RANKING
   └─ Usuários consultam ranking da edição atual
   └─ Ranking mostra posição, username e total de pontos
   └─ Usuários podem comparar performance
```

---

## 💡 Mecanismos Especiais

### **Blocos de Tempo Valioso**
- A cada 25 horas jogadas, o usuário ganha +2 pontos
- Exemplo: 75 horas = 3 blocos = 6 pontos
- Incentiva comprometimento com jogos maiores

### **Primeira Em Edição**
- Bônus para quem completar pela primeira vez **naquela edição**
- Cria urgência competitiva
- Pode variar entre próximos jogadores

### **Modo Coop**
- Completar com até 4 jogadores em modo cooperativo
- Ganha bônus especial de "Braço Direito"
- Incentiva jogos cooperativos

### **Hype Events**
- Edições especiais podem ter participação em hype
- Temas ou desafios especiais
- Oferece pontos extras

---

## 🎯 Casos de Uso Principais

### **Caso 1: Registrar Conclusão de Jogo**
1. Usuário completa lê um jogo
2. Navega para "Nova Conclusão"
3. Seleciona o jogo e edição
4. Preenche dados: horas jogadas, se foi primeira vez, se pegou platina
5. Submete
6. Sistema calcula pontos e atualiza ranking

### **Caso 2: Consultar Ranking**
1. Usuário acessa página de ranking
2. Seleciona edição (opcional, padrão é atual)
3. Vê lista de usuários ordenada por pontos
4. Vê sua posição e pontos

### **Caso 3: Participar de Hype**
1. Admin anuncia novo "Hype" (jogo em destaque)
2. Usuários que completam ganham bônus
3. Competição aumenta naquele jogo específico

---

## 📊 Modelo de Dados Simplificado

```
User (1) ──→ (M) Completion
           └─→ (M) PlatinumProof

Completion ──→ (1) Game
           ──→ (1) Edition
           ──→ (1) User

Game ──→ (M) Genre

Edition (1) ──→ (M) ScoreEvent
            └─→ (M) Completion

ScoreEvent ──→ (1) Completion
```

---

## 🔐 Segurança

- **Autenticação JWT**: Tokens temporários com expiração
- **Roles baseado em permissões**: Admin vs Usuário comum
- **Validação de dados**: Todos os inputs validados
- **Auditoria**: Timestamps de criação/atualização em todas as entidades

---

## 📈 Potenciais Extensões

- **Badges/Achievements**: Medalhas por milestones
- **Social Features**: Seguir outros jogadores
- **Análise de Performance**: Estatísticas por gênero
- **Integrações Externas**: PSN, Xbox, Steam
- **Competições Globais**: Rankings internacionais
- **Temporadas**: Resets periódicos com novas métricas
