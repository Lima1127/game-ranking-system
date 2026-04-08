# Game Ranking Frontend

React + Vite frontend para o sistema de ranking de jogos.

## 🚀 Início Rápido

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Backend rodando em `http://localhost:8080`

### Setup

```bash
# Instalar dependências (se não estiverem)
npm install

# Rodar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview
```

O frontend abrirá em `http://localhost:5173`

## 📁 Estrutura do Projeto

```
src/
├── pages/              # Páginas (Login, Ranking, etc)
├── components/         # Componentes reutilizáveis
├── services/           # API calls (axios)
├── contexts/           # Context API (Auth)
├── hooks/              # Custom hooks
├── utils/              # Utilitários
├── styles/             # CSS global
├── App.jsx             # Component raiz
└── main.jsx            # Entry point
```

## 🔐 Variáveis de Ambiente

Criar `.env.local`:

```
VITE_API_URL=http://localhost:8080/api/v1
```

## 📋 Features

- ✅ Autenticação com JWT
- ✅ Visualizar Ranking
- ✅ Registrar Conclusões de Jogos
- ✅ Dashboard Pessoal
- ✅ Responsividade com Tailwind CSS

## 🔌 Integração com Backend

- API Base: `http://localhost:8080/api/v1`
- Autenticação: JWT Token (localStorage)
- CORS: Configurado para `localhost:5173`

### Endpoints Utilizados

```
POST   /auth/register       - Registrar novo usuário
POST   /auth/login          - Fazer login
GET    /games               - Listar jogos
GET    /ranking             - Obter ranking
POST   /completions         - Registrar conclusão
```

## 🛠️ Tecnologias

- **React 18** - UI Framework
- **Vite** - Build tool
- **React Router v6** - Roteamento
- **Axios** - HTTP Client
- **TanStack Query** - State management / Data fetching
- **Tailwind CSS** - Styling
- **Context API** - Global state

## 📝 Notas de Desenvolvimento

### Adicionar Nova Page

1. Criar arquivo em `src/pages/NovaPage.jsx`
2. Importar em `src/App.jsx`
3. Adicionar rota em `<Routes>`

### Chamar API

```javascript
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

const { data, isLoading, error } = useQuery({
  queryKey: ['meusDados'],
  queryFn: async () => {
    const response = await api.get('/endpoint');
    return response.data;
  }
});
```

### Usar Autenticação

```javascript
import { useAuth } from '../contexts/AuthContext';

const { user, login, logout } = useAuth();
```

## 🐛 Troubleshooting

### CORS Error
Certifique-se que o backend está com CORS configurado para `http://localhost:5173`

### 401 Unauthorized
Token expirou ou inválido. Será redirecionado automaticamente para login.

### Componente não renderiza
Verifique se está dentro de `AuthProvider` ou `ProtectedRoute` se necessário.

## 📦 Build & Deploy

```bash
# Gerar bundle otimizado
npm run build

# Arquivo de saída: dist/

# Deploy (exemplo Vercel)
npm install -g vercel
vercel
```

## 📚 Documentação Adicional

Veja a documentação técnica em `../docs/frontend-roadmap.html`

## 👥 Contribuindo

1. Fork o repositório
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

---

**Status:** Em Desenvolvimento 🚀
