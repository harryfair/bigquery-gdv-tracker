#!/bin/bash

# Setup script for project dependencies on macOS
# This script installs all necessary tools for the Google Apps Script/BigQuery project

echo "🚀 Starting macOS setup for Google Apps Script & BigQuery project..."
echo ""

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "📦 Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    echo "✅ Homebrew is already installed"
fi

echo ""
echo "📦 Installing core development tools..."

# Install Node.js and npm
echo "→ Installing Node.js..."
brew install node

# Install Git (if not already installed)
echo "→ Installing Git..."
brew install git

# Install GitHub CLI
echo "→ Installing GitHub CLI..."
brew install gh

# Install Google Cloud SDK
echo "→ Installing Google Cloud SDK..."
brew install --cask google-cloud-sdk

# Install Python 3.12
echo "→ Installing Python 3.12..."
brew install python@3.12

echo ""
echo "📦 Installing Node.js global packages..."

# Install Google Clasp for Apps Script development
npm install -g @google/clasp

# Install TypeScript (useful for Apps Script development)
npm install -g typescript

echo ""
echo "🔧 Setting up Python virtual environment..."

# Create Python virtual environment
python3.12 -m venv ~/bq-venv
echo "✅ Python virtual environment created at ~/bq-venv"

echo ""
echo "📋 Next steps to complete setup:"
echo ""
echo "1. Authenticate with Google Cloud:"
echo "   gcloud auth login"
echo "   gcloud auth application-default login"
echo ""
echo "2. Authenticate with Google Clasp:"
echo "   clasp login"
echo ""
echo "3. Authenticate with GitHub CLI:"
echo "   gh auth login"
echo ""
echo "4. Clone your repository:"
echo "   git clone <your-repo-url>"
echo ""
echo "5. Activate Python virtual environment when needed:"
echo "   source ~/bq-venv/bin/activate"
echo ""
echo "6. Install Python dependencies (if you have requirements.txt):"
echo "   pip install -r requirements.txt"
echo ""
echo "✅ Installation complete! All tools have been installed."
echo ""
echo "📝 Installed tools summary:"
echo "- Node.js & npm"
echo "- Git"
echo "- GitHub CLI"
echo "- Google Cloud SDK (gcloud, bq, gsutil)"
echo "- Python 3.12 with virtual environment"
echo "- Google Clasp (for Apps Script)"
echo "- TypeScript"