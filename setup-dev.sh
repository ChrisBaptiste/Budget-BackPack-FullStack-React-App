#!/bin/bash

# BudgetBackPack Development Setup Script
# This script sets up the development environment for both frontend and backend

echo "🚀 Setting up BudgetBackPack React App Development Environment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in WSL
if [[ $(uname -r) == *microsoft* ]]; then
    print_status "Detected WSL environment ✓"
else
    print_error "This script is designed for WSL environment"
    exit 1
fi

# Check if Node.js is installed
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_status "Node.js version: $NODE_VERSION"
else
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_status "npm version: $NPM_VERSION"
else
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

# Navigate to project root
cd "$(dirname "$0")"
PROJECT_ROOT=$(pwd)
print_status "Project root: $PROJECT_ROOT"

# Install Frontend Dependencies
print_status "Installing Frontend dependencies..."
cd "$PROJECT_ROOT/Budget-BackPack-FrontEnd-Server"
if npm install; then
    print_success "Frontend dependencies installed successfully"
else
    print_error "Failed to install frontend dependencies"
    exit 1
fi

# Install Backend Dependencies
print_status "Installing Backend dependencies..."
cd "$PROJECT_ROOT/Budget-BackPack-BackEnd-Server"
if npm install; then
    print_success "Backend dependencies installed successfully"
else
    print_error "Failed to install backend dependencies"
    exit 1
fi

# Create .env template for backend if it doesn't exist
cd "$PROJECT_ROOT/Budget-BackPack-BackEnd-Server"
if [[ ! -f .env ]]; then
    print_status "Creating .env template..."
    cat > .env << EOF
# Database Configuration
MONGO_URI=mongodb://localhost:27017/budgetbackpack

# JWT Secret (change this to a secure random string)
JWT_SECRET=your_jwt_secret_here

# API Keys (add your actual API keys here)
GOOGLE_PLACES_API_KEY=your_google_places_api_key
AMADEUS_API_KEY=your_amadeus_api_key
AMADEUS_API_SECRET=your_amadeus_api_secret

# Server Configuration
PORT=5000
NODE_ENV=development
EOF
    print_success "Created .env template. Please update it with your actual API keys."
else
    print_status ".env file already exists"
fi

# Check if Claude Code is available
if command -v /usr/local/bin/claude &> /dev/null; then
    print_success "Claude Code CLI is available at /usr/local/bin/claude"
else
    print_error "Claude Code CLI is not installed. Install it with: sudo npm install -g @anthropic-ai/claude-code"
fi

# Final instructions
cd "$PROJECT_ROOT"
echo ""
print_success "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Open VS Code with: code BudgetBackPack.code-workspace"
echo "2. Install recommended extensions when prompted"
echo "3. Configure your .env file with actual API keys"
echo "4. Start development servers:"
echo "   - Frontend: npm run dev (in Budget-BackPack-FrontEnd-Server)"
echo "   - Backend: npm run dev (in Budget-BackPack-BackEnd-Server)"
echo ""
echo "🔧 VS Code Tasks available:"
echo "   - Ctrl+Shift+P → 'Tasks: Run Task' → 'Start Full Stack'"
echo "   - Or use individual tasks for frontend/backend"
echo ""
echo "🤖 Claude Code usage:"
echo "   - Terminal: /usr/local/bin/claude"
echo "   - VS Code: Use Cline extension in sidebar"
echo ""
echo "Happy coding! 🚀"
