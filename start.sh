#!/bin/sh
set -e

echo "Starting deployment script..."

# 1. Run Migrations
echo "Running Prisma Migrations..."
npx prisma migrate deploy

# 2. Start the Server
echo "Starting Node.js Server..."
exec node dist-server/server.js