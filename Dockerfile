FROM node:20-alpine

# Install OpenSSL (Required for Prisma)
RUN apk -U add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Generate Prisma Client
RUN npx prisma generate --schema ./prisma/schema.prisma

# Build the project
RUN npm run build

# Copy and setup the startup script
COPY start.sh .
RUN chmod +x start.sh

EXPOSE 8080

# Use the script to start
CMD ["./start.sh"]