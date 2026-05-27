# Game Ranking System

A full-stack application for tracking and ranking game completions with sophisticated scoring mechanics. Built with **Spring Boot** backend and **React + Vite** frontend.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Overview

**Game Ranking System** is a platform designed to:

- **Track game completions** across users
- **Rank players** based on customizable scoring mechanics
- **Manage user profiles** with authentication and authorization
- **Provide real-time rankings** and statistics

### Key Features

✅ JWT-based authentication  
✅ PostgreSQL data persistence  
✅ Responsive React UI with Tailwind CSS  
✅ RESTful API with Spring Boot  
✅ Role-based access control (RBAC)  
✅ Game completion tracking  
✅ Dynamic ranking calculations  

---

## Architecture

```
┌─────────────────────────────────────────┐
│         Frontend (React + Vite)         │
│  Port: 5173 | http://localhost:5173     │
│  ├─ Authentication Context              │
│  ├─ Game Ranking Pages                  │
│  └─ User Dashboard                      │
└────────────────┬────────────────────────┘
                 │ HTTP/REST (CORS enabled)
                 │
┌────────────────▼────────────────────────┐
│      Backend (Spring Boot)              │
│  Port: 8080 | http://localhost:8080     │
│  ├─ Authentication Service (JWT)        │
│  ├─ Game Management API                 │
│  ├─ Ranking Engine                      │
│  └─ User Management                     │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│      PostgreSQL Database                │
│  Database: game_ranking                 │
│  ├─ Users Table                         │
│  ├─ Games Table                         │
│  ├─ Completions Table                   │
│  └─ Rankings View                       │
└─────────────────────────────────────────┘
```

---

## Tech Stack

### Backend

| Layer | Technologies |
|-------|--------------|
| **Framework** | Spring Boot 3.x |
| **Language** | Java 21 |
| **Build Tool** | Maven 3.9+ |
| **Database** | PostgreSQL |
| **Authentication** | JWT (JSON Web Tokens) |
| **ORM** | Spring Data JPA / Hibernate |
| **API** | Spring Web MVC (REST) |

### Frontend

| Layer | Technologies |
|-------|--------------|
| **Framework** | React 18 |
| **Build Tool** | Vite |
| **Routing** | React Router v6 |
| **HTTP Client** | Axios |
| **State Management** | Context API + TanStack Query |
| **Styling** | Tailwind CSS |
| **Type Checking** | JavaScript (JSX) |

---

## Prerequisites

### System Requirements

#### Backend
- **Java Development Kit (JDK) 21+**
  - Download: [Eclipse Adoptium](https://adoptium.net/)
  - Verify: `java -version`

- **Maven 3.9+**
  - Download: [Apache Maven](https://maven.apache.org/)
  - Verify: `mvn -version`

- **PostgreSQL 12+**
  - Download: [PostgreSQL](https://www.postgresql.org/download/)
  - Verify: `psql --version`

#### Frontend
- **Node.js 18+**
  - Download: [Node.js](https://nodejs.org/)
  - Verify: `node --version` and `npm --version`

### Database Setup

```bash
# Create database
createdb game_ranking

# Verify database was created
psql -l | grep game_ranking
```

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Lima1127/game-ranking-system.git
cd game-ranking-system
```

### 2. Backend Setup

#### Step 1: Configure Database Credentials

```bash
cd backend

# Copy the example configuration file
cp src/main/resources/application.yml.example src/main/resources/application.yml

# Edit the configuration with your database credentials
# ⚠️ application.yml is .gitignore'd for security
```

**Edit `application.yml`:**

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/game_ranking
    username: postgres          # Your PostgreSQL username
    password: your_password     # Your PostgreSQL password
    driver-class-name: org.postgresql.Driver
  
  jpa:
    hibernate:
      ddl-auto: update
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQL10Dialect

server:
  port: 8080
  servlet:
    context-path: /api/v1
```

#### Step 2: Run the Backend

**On Windows (PowerShell):**

```powershell
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot'
$env:Path="$env:JAVA_HOME\bin;C:\Tools\apache-maven-3.9.9\bin;$env:Path"
mvn.cmd spring-boot:run
```

**On macOS/Linux:**

```bash
export JAVA_HOME=/path/to/jdk-21
export PATH=$JAVA_HOME/bin:$PATH
mvn spring-boot:run
```

**Verify the backend is running:**

```bash
curl http://localhost:8080/api/v1/ranking
# Expected: HTTP 200 OK
```

### 3. Frontend Setup

#### Step 1: Configure Environment Variables

```bash
cd reviradao

# Copy the example environment file
cp .env.example .env.local

# Edit with your backend URL
```

**Edit `.env.local`:**

```env
VITE_API_URL=http://localhost:8080/api/v1
```

#### Step 2: Install Dependencies

```bash
npm install
```

#### Step 3: Run Development Server

```bash
npm run dev
```

The frontend will be available at: **http://localhost:5173**

---

## Project Structure

```
game-ranking-system/
├── backend/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/gameranking/
│   │   │   │   ├── config/           # Configuration classes (CORS, Security, etc)
│   │   │   │   ├── controller/       # REST API endpoints
│   │   │   │   ├── service/          # Business logic
│   │   │   │   ├── repository/       # Data access layer
│   │   │   │   ├── model/            # Entity classes
│   │   │   │   ├── dto/              # Data transfer objects
│   │   │   │   ├── security/         # JWT & authentication
│   │   │   │   └── GameRankingApplication.java
│   │   │   └── resources/
│   │   │       ├── application.yml.example
│   │   │       └── db/migration/     # Flyway/Liquibase migrations
│   │   └── test/
│   ├── pom.xml                       # Maven configuration
│   └── README.md                     # Backend-specific documentation
│
├── reviradao/                        # Frontend directory (React)
│   ├── src/
│   │   ├── pages/                    # Page components
│   │   ├── components/               # Reusable components
│   │   ├── services/                 # API service layer (axios)
│   │   ├── contexts/                 # React Context (Auth, etc)
│   │   ├── hooks/                    # Custom React hooks
│   │   ├── utils/                    # Utility functions
│   │   ├── styles/                   # Global CSS
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/                       # Static assets
│   ├── .env.example
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── package.json
│   └── README.md                     # Frontend-specific documentation
│
├── docs/
│   ├── integration-runbook.md        # Setup & troubleshooting guide
│   ├── api-documentation.md          # API endpoint details
│   └── architecture-decisions.md     # ADRs (if available)
│
└── README.md                         # This file
```

---

## API Documentation

### Authentication

#### Register New User

```http
POST /auth/register
Content-Type: application/json

{
  "displayName": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (201 Created):**

```json
{
  "id": "uuid-here",
  "displayName": "John Doe",
  "email": "john@example.com",
  "role": "USER"
}
```

#### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 7200,
  "userId": "uuid-here",
  "displayName": "John Doe",
  "role": "USER"
}
```

### Ranking Endpoints

#### Get Ranking

```http
GET /ranking
Authorization: Bearer {accessToken}
```

**Response (200 OK):**

```json
[
  {
    "position": 1,
    "userId": "uuid-1",
    "displayName": "TopPlayer",
    "score": 15000,
    "gamesCompleted": 42
  },
  {
    "position": 2,
    "userId": "uuid-2",
    "displayName": "SecondPlace",
    "score": 12500,
    "gamesCompleted": 38
  }
]
```

#### Get Games

```http
GET /games
Authorization: Bearer {accessToken}
```

#### Register Game Completion

```http
POST /completions
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "gameId": "uuid-game",
  "score": 100,
  "completionDate": "2026-05-27T10:30:00Z"
}
```

### Error Responses

All errors follow this format:

```json
{
  "timestamp": "2026-05-27T10:30:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Invalid email format",
  "path": "/auth/register"
}
```

| Status Code | Description |
|-------------|-------------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request (validation error) |
| `401` | Unauthorized (invalid/expired token) |
| `403` | Forbidden (insufficient permissions) |
| `404` | Not Found |
| `500` | Internal Server Error |

---

## Development

### Running Tests

#### Backend

```bash
cd backend
mvn test
mvn test -Dtest=AuthControllerTest  # Run specific test class
```

#### Frontend

```bash
cd reviradao
npm test
npm run test:watch
```

### Building for Production

#### Backend

```bash
cd backend
mvn clean package
# Output: target/game-ranking-system-{version}.jar
```

#### Frontend

```bash
cd reviradao
npm run build
# Output: dist/
```

### Code Style & Formatting

#### Backend
- Follow [Google Java Style Guide](https://google.github.io/styleguide/javaguide.html)
- Use [Spotless](https://github.com/diffplug/spotless) or similar

#### Frontend
- Use ESLint and Prettier
- Run: `npm run lint` and `npm run format`

---

## Deployment

### Docker (Optional)

#### Build Backend Image

```dockerfile
# Dockerfile (backend root)
FROM eclipse-temurin:21-jre-alpine

COPY target/game-ranking-system-*.jar app.jar

ENTRYPOINT ["java", "-jar", "/app.jar"]
```

```bash
docker build -t game-ranking-system-backend .
docker run -p 8080:8080 \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/game_ranking \
  -e SPRING_DATASOURCE_USERNAME=postgres \
  -e SPRING_DATASOURCE_PASSWORD=password \
  game-ranking-system-backend
```

#### Deploy Frontend

```bash
npm run build

# Option 1: Netlify
netlify deploy --prod --dir=dist

# Option 2: Vercel
vercel

# Option 3: AWS S3 + CloudFront
aws s3 sync dist/ s3://your-bucket-name
```

### Environment Variables (Production)

**Backend (`application.yml`):**

```yaml
spring:
  datasource:
    url: ${DB_URL}
    username: ${DB_USER}
    password: ${DB_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate  # Don't auto-update schema

server:
  port: ${PORT:8080}

# Security
jwt:
  secret: ${JWT_SECRET}
  expiration: 7200
```

**Frontend (`.env.production`):**

```env
VITE_API_URL=https://api.example.com/api/v1
```

---

## Troubleshooting

### Backend Issues

#### Port Already in Use (8080)

```bash
# Windows (PowerShell)
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :8080
kill -9 <PID>

# Alternative: Run on different port
mvn spring-boot:run "-Dspring-boot.run.arguments=--server.port=8081"
```

#### Database Connection Error

```bash
# Verify PostgreSQL is running
psql -U postgres -h localhost

# Check credentials in application.yml
# Verify database exists
psql -l | grep game_ranking

# Reset database (⚠️ deletes all data)
dropdb game_ranking
createdb game_ranking
```

#### JWT Token Errors

- **401 Unauthorized**: Token expired or invalid. Re-login to get new token.
- Verify `jwt.secret` is set correctly in `application.yml`

### Frontend Issues

#### CORS Error

```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution:**
- Verify backend CORS config allows `http://localhost:5173`
- Check `CorsConfig.java` in backend
- Restart backend if config was modified

#### 404 Not Found

```
GET /api/v1/ranking - 404
```

**Causes:**
- Backend not running on port 8080
- Wrong `VITE_API_URL` in `.env.local`
- Endpoint doesn't exist

**Solution:**
```bash
# Test backend directly
curl http://localhost:8080/api/v1/ranking

# Update VITE_API_URL and restart dev server
npm run dev
```

#### Module Not Found

```
npm ERR! code ERESOLVE
```

**Solution:**
```bash
npm install --legacy-peer-deps
# or
npm ci  # Use package-lock.json
```

### Common Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| **"Database does not exist"** | DB not created | `createdb game_ranking` |
| **"Cannot connect to database"** | Wrong credentials | Update `application.yml` |
| **Module resolution error** | Stale node_modules | `rm -rf node_modules && npm install` |
| **Blank page after login** | Auth context not working | Check localStorage in DevTools |
| **API calls fail silently** | No error logging | Check browser console and server logs |

---

## Performance Optimization

### Backend
- Implement caching for ranking calculations (Redis)
- Use database indexing on frequently queried columns
- Implement pagination for large result sets
- Consider async operations for heavy computations

### Frontend
- Lazy load components using React.lazy()
- Enable gzip compression
- Optimize bundle size with tree-shaking
- Cache API responses appropriately

---

## Security Considerations

✅ **JWT tokens** for stateless authentication  
✅ **HTTPS only** in production  
✅ **Password hashing** (bcrypt/Argon2)  
✅ **CORS** properly configured  
✅ **SQL injection** prevention (parameterized queries)  
✅ **XSS protection** via Content Security Policy  
✅ **CSRF tokens** for state-changing operations  

---

## Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Commit Message Convention

```
type(scope): subject

body

footer
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Example:
```
feat(auth): add two-factor authentication

Implement 2FA using TOTP algorithm

Closes #123
```

---

## License

This project is licensed under the **MIT License** — see the `LICENSE` file for details.

---

## Support & Contact

- 📧 **Email**: [Your Email]
- 🐛 **Issues**: [GitHub Issues](https://github.com/Lima1127/game-ranking-system/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/Lima1127/game-ranking-system/discussions)

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history and breaking changes.

---

**Status:** 🚀 In Development

Last Updated: May 27, 2026
