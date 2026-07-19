#!/bin/bash

# BCL Portal Environment Setup Script
# version: 1.0

# 1. Node.js check
echo "🔍 Checking Node.js..."
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node -v)
    echo "✅ Node.js is installed: $NODE_VERSION"
else
    echo "❌ Node.js is not installed. Please install Node.js v18 or later."
    exit 1
fi

# 2. NPM check
echo "🔍 Checking npm..."
if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm -v)
    echo "✅ npm is installed: $NPM_VERSION"
else
    echo "❌ npm is not installed."
    exit 1
fi

# 3. Python 3 check
echo "🔍 Checking Python 3..."
if command -v python3 >/dev/null 2>&1; then
    PYTHON_VERSION=$(python3 --version)
    echo "✅ Python 3 is installed: $PYTHON_VERSION"
else
    echo "⚠️ Python 3 is not installed. Python is required for specialized modules (e.g., Race system)."
fi

# 4. Pip check
echo "🔍 Checking pip3..."
if command -v pip3 >/dev/null 2>&1; then
    PIP_VERSION=$(pip3 --version | awk '{print $2}')
    echo "✅ pip3 is installed: $PIP_VERSION"
else
    echo "⚠️ pip3 is not installed. Required to install Python dependencies."
fi

# 5. Docker check
echo "🔍 Checking Docker..."
if command -v docker >/dev/null 2>&1; then
    DOCKER_VERSION=$(docker --version)
    echo "✅ Docker is installed: $DOCKER_VERSION"
else
    echo "⚠️ Docker is not installed. Required for containerized deployment."
fi

# 6. Docker Compose check
echo "🔍 Checking Docker Compose..."
if command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE_VERSION=$(docker-compose --version)
    echo "✅ Docker Compose is installed: $DOCKER_COMPOSE_VERSION"
else
    echo "⚠️ Docker Compose is not installed. Required for running multi-service environment."
fi

# 7. Supabase CLI check (Optional but recommended)
echo "🔍 Checking Supabase CLI..."
if command -v supabase >/dev/null 2>&1; then
    SUPABASE_VERSION=$(supabase -v)
    echo "✅ Supabase CLI is installed: $SUPABASE_VERSION"
else
    echo "⚠️ Supabase CLI is not installed. You may need it for local DB development."
fi

# 4. Environment Variables check
echo "🔍 Checking .env files..."
if [ -f ".env.local" ]; then
    echo "✅ .env.local found."
elif [ -f ".env" ]; then
    echo "✅ .env found."
else
    echo "⚠️ .env file not found. Creating from .env.example if exists..."
    if [ -f ".env.example" ]; then
        cp .env.example .env.local
        echo "✅ .env.local created from .env.example."
    else
        echo "❌ .env.example not found. Please create .env.local manually."
    fi
fi

# 5. Dependency installation
echo "📦 Installing project dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Node.js dependencies installed successfully."
else
    echo "❌ Node.js dependency installation failed."
    exit 1
fi

# 8. Python Dependency installation
if [ -f "race/requirements.txt" ]; then
    echo "📦 Installing Python dependencies from race/requirements.txt..."
    pip3 install -r race/requirements.txt
    if [ $? -eq 0 ]; then
        echo "✅ Python dependencies installed successfully."
    else
        echo "⚠️ Python dependency installation failed (possibly due to PEP 668)."
        echo "💡 Hint: Try 'pip3 install -r race/requirements.txt --break-system-packages' if you are in a managed environment."
    fi
fi

echo "🚀 Environment setup complete! You are ready to start coding BCL Portal."
