FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies to run tsc)
RUN npm install

# Copy all source code
COPY . .

# Build Frontend AND Backend
# This runs the "build" script from package.json
RUN npm run build 

EXPOSE 8080

# Start the compiled server
EXPOSE 8080

# ---- CHANGE THE CMD LINE TO THIS ----
# 1. Generate Prisma Client code
# 2. Run migrations to create/update DB tables
# 3. Start server
CMD npx prisma generate && npx prisma migrate deploy && node dist-server/server.js
