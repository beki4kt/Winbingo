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
CMD ["node", "dist-server/server.js"]