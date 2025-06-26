#!/bin/bash

# Setup script for first-time installation

echo "🔧 Setting up Revo Backend..."

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "🐍 Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
echo "⚡ Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "📦 Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📚 Installing dependencies..."
pip install -r requirements.txt

# Install development dependencies
echo "🛠️  Installing development dependencies..."
pip install -e ".[dev]"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please update the .env file with your configuration"
fi

# Initialize Alembic if not already done
if [ ! -d "alembic/versions" ]; then
    echo "🗄️  Initializing database migrations..."
    mkdir -p alembic/versions
fi

echo "✅ Setup completed successfully!"
echo "📖 Next steps:"
echo "   1. Update your .env file with the correct database credentials"
echo "   2. Run 'docker-compose up -d' to start PostgreSQL"
echo "   3. Run 'alembic revision --autogenerate -m \"initial\"' to create your first migration"
echo "   4. Run 'alembic upgrade head' to apply migrations"
echo "   5. Run 'uvicorn app.main:app --reload' to start the application" 