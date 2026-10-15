# Imagem unica do Reviradao: o backend (Spring Boot) tambem entrega o site (React).
# Usada pela hospedagem (Render), que monta a imagem a partir do GitHub. Passo a passo em docs/deploy.md.

# 1) Site: gera os arquivos estaticos do React
FROM node:20-alpine AS frontend
WORKDIR /app/reviradao
COPY reviradao/package.json reviradao/package-lock.json ./
RUN npm ci
COPY reviradao/ ./
RUN npm run build

# 2) Backend: empacota o .jar ja com o site dentro (pasta static)
FROM maven:3.9-eclipse-temurin-21 AS backend
WORKDIR /app/backend
COPY backend/pom.xml ./
RUN mvn -q -B dependency:go-offline
COPY backend/src ./src
COPY --from=frontend /app/reviradao/dist ./src/main/resources/static
# Os testes rodam no computador de quem desenvolve (mvn test); aqui so empacota.
RUN mvn -q -B -DskipTests package

# 3) Imagem final: so o Java e o .jar
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=backend /app/backend/target/*.jar /app/app.jar
USER app
ENV SPRING_PROFILES_ACTIVE=prod
EXPOSE 8080
# Ajustes para servidores pequenos (512 MB no plano gratis) e partida mais rapida.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=70", "-XX:+UseSerialGC", "-Xss512k", "-XX:TieredStopAtLevel=1", "-jar", "/app/app.jar"]
