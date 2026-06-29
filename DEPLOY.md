# 🚀 Deployment Guide for ContentScout

This guide walks you through deploying the ContentScout Intelligent Contract on GenLayer and connecting it to the frontend.

---

## Prerequisites

1. **Node.js 18+** installed
2. **MetaMask** browser extension
3. **GenLayer CLI** installed:
   ```bash
   npm install -g genlayer
   ```

---

## Step 1: Get Testnet Tokens

1. Visit the [GenLayer Faucet](https://faucet.genlayer.com)
2. Enter your MetaMask wallet address
3. Request GEN tokens
4. Wait for tokens to arrive (~1-2 minutes)

---

## Step 2: Configure GenLayer CLI

```bash
# Check available networks
genlayer network list

# Set network to testnet-asimov (recommended)
genlayer network testnet-asimov

# Or use testnet-bradbury
# genlayer network testnet-bradbury

# Verify configuration
genlayer config get
```

---

## Step 3: Deploy the Contract

```bash
# Navigate to project root
cd ContentScout

# Deploy the contract
genlayer deploy --contract contract/content_scout.py

# Expected output:
# ✓ Contract deployed successfully!
# Contract Address: 0x1234567890abcdef...
# Transaction Hash: 0xabcdef...
```

**⚠️ IMPORTANT: Copy the Contract Address!**

---

## Step 4: Update Frontend Configuration

Edit `src/lib/genlayer.ts`:

```typescript
// Line ~22 - Replace with YOUR contract address
export const CONTRACT_ADDRESS = '0xYOUR_CONTRACT_ADDRESS_HERE';
```

If using testnet-bradbury, also update:

```typescript
// Line ~25-27
export const CHAIN_ID = 4221; // bradbury
import { testnetBradbury } from 'genlayer-js/chains';
export const CHAIN = testnetBradbury;
```

---

## Step 5: Build and Test

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173
```

### Test the Integration:

1. Click **"CONNECT"** to connect MetaMask
2. Approve network switch to GenLayer
3. Submit some test content
4. Verify transaction appears in [GenLayer Explorer](https://explorer.genlayer.com)

---

## Step 6: Deploy Frontend

### Cloudflare Pages

1. Push code to GitHub
2. Connect repo to Cloudflare Pages
3. Configure:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Node version: `20`

### Vercel

1. Import project from GitHub
2. Auto-detected as Vite project
3. Deploy

### Netlify

1. Connect GitHub repo
2. Build command: `npm run build`
3. Publish directory: `dist`

---

## Verification Checklist

Before submitting to GenLayer Builders Portal:

- [ ] Contract deployed on testnet-asimov or testnet-bradbury
- [ ] Contract address updated in `src/lib/genlayer.ts`
- [ ] Frontend can connect to MetaMask
- [ ] Submissions create real on-chain transactions
- [ ] Transaction hashes visible in GenLayer Explorer
- [ ] Frontend deployed to public URL

---

## Troubleshooting

### "Contract not found" error
- Verify CONTRACT_ADDRESS is correctly set
- Ensure you're on the correct network (asimov vs bradbury)

### Transaction fails
- Check you have enough GEN for gas
- Verify content is at least 50 characters

### MetaMask network error
- The app will auto-add GenLayer network
- If fails, manually add:
  - Network Name: GenLayer Testnet
  - RPC URL: https://rpc.genlayer.com
  - Chain ID: 4220 (asimov) or 4221 (bradbury)
  - Symbol: GEN

---

## Contract Explorer

After deployment, view your contract at:

```
https://explorer.genlayer.com/contract/YOUR_CONTRACT_ADDRESS
```

---

## Support

- [GenLayer Documentation](https://docs.genlayer.com)
- [GenLayer Discord](https://discord.gg/genlayer)
- [GitHub Issues](https://github.com/YOUR_USERNAME/ContentScout/issues)
