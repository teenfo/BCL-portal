#!/bin/bash

# commit-bot helper: Build and Package Docker Images
# This script ensures the current state is buildable before or after commit.

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "⚠️ Docker command not found. Skipping build verification."
    exit 0
fi

# 1. Base build
echo "🐳 Docker found. Starting build..."
docker compose build

if [ $? -eq 0 ]; then
    echo "✅ Docker build successful! The package is ready for deployment."
else
    echo "❌ Docker build failed. Please fix the build errors before committing for deployment."
    exit 1
fi
