#!/bin/bash

# BCL Portal - Ubuntu Docker Deployment Script

echo "🚀 Starting BCL Portal Deployment..."

# 1. Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# 2. Check for .env.local
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local file not found! Please create it before deploying."
    exit 1
fi

# 3. Build and Start Containers
echo "🏗️  Building and starting Docker containers..."
docker-compose up --build -d

# 4. Clean up unused images
echo "🧹 Cleaning up old Docker images..."
docker image prune -f

echo "✅ Deployment complete! Service is running on port 8080."
echo "🔗 Check logs with: docker-compose logs -f portal"
