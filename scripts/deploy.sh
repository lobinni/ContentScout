#!/bin/bash

# ContentScout Deployment Script
# Usage: ./scripts/deploy.sh [network]
# Networks: testnet-asimov (default), testnet-bradbury

set -e

NETWORK=${1:-testnet-asimov}

echo "🚀 ContentScout Deployment Script"
echo "=================================="
echo ""

# Check if genlayer CLI is installed
if ! command -v genlayer &> /dev/null; then
    echo "❌ GenLayer CLI not found. Installing..."
    npm install -g genlayer
fi

echo "📡 Setting network to: $NETWORK"
genlayer network $NETWORK

echo ""
echo "📜 Deploying contract..."
echo ""

# Deploy contract
DEPLOY_OUTPUT=$(genlayer deploy --contract contract/content_scout.py 2>&1)
echo "$DEPLOY_OUTPUT"

# Extract contract address (this is a simplified extraction)
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oE '0x[a-fA-F0-9]{40}' | head -1)

if [ -n "$CONTRACT_ADDRESS" ]; then
    echo ""
    echo "✅ Contract deployed successfully!"
    echo ""
    echo "📋 Contract Address: $CONTRACT_ADDRESS"
    echo ""
    echo "Next steps:"
    echo "1. Update src/lib/genlayer.ts with your contract address:"
    echo "   export const CONTRACT_ADDRESS = '$CONTRACT_ADDRESS';"
    echo ""
    echo "2. Or create .env.local file:"
    echo "   echo 'VITE_CONTRACT_ADDRESS=$CONTRACT_ADDRESS' > .env.local"
    echo ""
    echo "3. Rebuild the frontend:"
    echo "   npm run build"
    echo ""
    echo "🔗 View on Explorer:"
    echo "   https://explorer.genlayer.com/contract/$CONTRACT_ADDRESS"
else
    echo ""
    echo "⚠️  Could not extract contract address from output."
    echo "Please check the deployment output above and manually update the contract address."
fi
