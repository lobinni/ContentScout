#!/bin/bash
# ═══════════════════════════════════════════════════════════
# ContentScout — GitHub Push & Vercel Deploy Script
# ═══════════════════════════════════════════════════════════

set -e

REPO_NAME="ContentScout"
GITHUB_USER="lobinni"

echo "🚀 ContentScout — Deploy Script"
echo "================================"
echo ""

# Step 1: Initialize git
if [ ! -d ".git" ]; then
  echo "📦 Initializing Git repository..."
  git init
  git branch -M main
else
  echo "✓ Git already initialized"
fi

# Step 2: Add all files
echo ""
echo "📁 Adding files..."
git add -A

# Step 3: Commit
echo ""
echo "💾 Committing..."
git commit -m "ContentScout v2.0 — Contract-Authoritative, Fail-Closed, No Local Heuristic

- Contract: 0x141666BB3C83D10a2CC0bA2d42aE8973a2B47c22
- Network: GenLayer Studio (Chain ID: 61999)
- All results from on-chain AI consensus only
- Fail-closed: is_original = score >= 40 (always enforced)
- Strengthened validators: checks substantive evidence
- Removed fail-open passing verdict
- No local heuristic or browser-based analysis" || echo "✓ No changes to commit"

# Step 4: Add remote
echo ""
echo "🔗 Setting up remote..."
if git remote get-url origin &>/dev/null; then
  git remote set-url origin "https://github.com/${GITHUB_USER}/${REPO_NAME}.git"
  echo "✓ Remote updated"
else
  git remote add origin "https://github.com/${GITHUB_USER}/${REPO_NAME}.git"
  echo "✓ Remote added"
fi

# Step 5: Push
echo ""
echo "⬆️  Pushing to GitHub..."
git push -u origin main --force

echo ""
echo "✅ Pushed to GitHub!"
echo ""
echo "🌐 Next steps for Vercel:"
echo "   1. Go to https://vercel.com/new"
echo "   2. Import repository: ${GITHUB_USER}/${REPO_NAME}"
echo "   3. Framework Preset: Vite"
echo "   4. Build Command: npm run build"
echo "   5. Output Directory: dist"
echo "   6. Click Deploy!"
echo ""
echo "📋 Direct link:"
echo "   https://github.com/${GITHUB_USER}/${REPO_NAME}"
