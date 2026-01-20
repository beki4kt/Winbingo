# Use Node image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the React frontend
RUN npm run build

# Expose the port Fly.io uses (usually 8080)
EXPOSE 8080

# Start the server (using ts-node for simplicity, or node if you compiled it)
CMD ["npx", "ts-node", "server.ts"]