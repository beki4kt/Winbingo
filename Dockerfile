# Use Node image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code (including prisma folder and tsconfig files)
COPY . .

# -----------------------------------------------------------
# ✅ CRITICAL FIX: Generate Prisma Client BEFORE building
# This creates the types needed for server.ts to compile
# -----------------------------------------------------------
RUN npx prisma generate

# Build Frontend (Vite) and Backend (TypeScript)
RUN npm run build

# Expose the port Fly.io uses
EXPOSE 8080

# Start the server
# We run migrate deploy to ensure the database file is created/updated on startup
CMD npx prisma migrate deploy && node dist-server/server.js