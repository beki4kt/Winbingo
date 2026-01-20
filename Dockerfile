# Use Node image
FROM node:20-alpine

# 1. INSTALL OPENSSL (Required for Prisma on Alpine Linux)
RUN apk -U add --no-cache openssl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# 2. GENERATE PRISMA CLIENT
# We explicitly point to the schema location to be safe
RUN npx prisma generate --schema ./prisma/schema.prisma

# Build the project
RUN npm run build

# Expose port
EXPOSE 8080

# Start server
CMD npx prisma migrate deploy && node dist-server/server.js