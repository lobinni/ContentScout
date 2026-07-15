# ContentScout — AI Content Originality Scanner

> **Contract-Authoritative · Fail-Closed · No Local Heuristic**

AI-Powered Content Originality Scanner deployed on **GenLayer Studio Blockchain**. Every score, verdict, and reasoning displayed in the UI comes **exclusively** from the on-chain AI consensus judgment — no browser-based heuristic is ever substituted.

## 🔗 Live Demo

**[contentscout-umber.vercel.app](https://contentscout-umber.vercel.app/)**

## 📜 Contract

| Field | Value |
|---|---|
| **Address** | `0x3E5a8398d07915871080A072241a4D71F652D97a` |
| **Network** | GenLayer Studio (Chain ID: 61999) |
| **RPC** | `https://studio.genlayer.com/api` |
| **Explorer** | [View Contract](https://explorer-studio.genlayer.com/address/0x3E5a8398d07915871080A072241a4D71F652D97a) |

---

## 📖 How to Use the DApp

### Step 1: Install MetaMask
Install the [MetaMask](https://metamask.io) browser extension. This wallet manages your account, signs transactions, and pays gas fees in GEN tokens on the GenLayer blockchain.

### Step 2: Connect Wallet
Click **"CONNECT WALLET"** in the top-right corner. MetaMask will prompt you to:
- Approve the connection
- Switch to GenLayer Studio network (Chain ID: 61999, auto-added)

> 💡 Need GEN tokens? Get free testnet tokens from [GenLayer Studio](https://studio.genlayer.com).

### Step 3: Submit Content
1. **Select content type**: Article, Essay, Code, Creative, or Research
2. **Paste your text** (minimum 50 characters, max 4000)
3. **Add source URL** (optional) — lets AI validators compare against the published version
4. Click **"SUBMIT FOR AI ANALYSIS"**
5. MetaMask will pop up showing the **gas fee** — confirm the transaction

### Step 4: Wait for AI Consensus
After confirming, the DApp shows a live progress indicator:
- **SUBMITTING TRANSACTION** → Broadcasting to GenLayer
- **AI CONSENSUS IN PROGRESS** → Multiple AI validators independently analyze your content (30s – several minutes)
- **READING CONTRACT JUDGMENT** → Fetching the finalized result from the contract

> ⚠️ **Important**: No browser-based score is ever shown during this wait. You only see the contract's finalized result.

### Step 5: View the Contract Judgment
The result panel displays:
- **Score** (0–100) — determined by on-chain AI consensus
- **Verdict** (ORIGINAL / FLAGGED) — always derived from score ≥ 40
- **AI Reasoning** — substantive evidence from the contract
- **Similar Sources** — URLs/descriptions of similar content found
- **Authority Badge** — confirms the result is "ON-CHAIN · FROM CONTRACT get_submission()"
- **Explorer Link** — verify the transaction on-chain

### Step 6: Appeal (Optional)
If your content is **FLAGGED** and you disagree:
1. Click **"↻ APPEAL FOR RE-JUDGMENT (ON-CHAIN)"** on the result panel
2. MetaMask will prompt for gas fee
3. A fresh AI consensus round runs with new analysis
4. The updated judgment replaces the original

> Only the original author can appeal, and only once per submission.

---

## 📊 Scoring System

| Score | Verdict | Description |
|---|---|---|
| 70 – 100 | ✅ **ORIGINAL** | Strong evidence of originality |
| 40 – 69 | ⚠️ **BORDERLINE** | Passes but with common patterns |
| 0 – 39 | 🚫 **FLAGGED** | Significant unoriginality detected |

**Threshold**: `score ≥ 40` = PASS (fail-closed — the verdict is always derived from the score)

---

## ✨ Features

| Feature | Implementation |
|---|---|
| 🤖 **AI Analysis** | On-chain AI consensus via `gl.nondet.exec_prompt()` |
| 🌐 **Web Crawling** | Source comparison via `gl.nondet.web.get()` |
| 🔄 **Validator Consensus** | `gl.vm.run_nondet_unsafe()` with strengthened validators |
| 📜 **Contract-Authoritative** | Every result read from `get_submission()` |
| 🔒 **Fail-Closed** | `is_original = score ≥ 40` — always enforced |
| 🚫 **No Local Heuristic** | Browser never computes a score |

---

## 🏗 Architecture

```
User → MetaMask → writeContract("submit") → GenLayer Studio
                                                  ↓
                                        AI Validator Consensus
                                        (independent LLM analysis)
                                                  ↓
User ← readContract("get_submission") ← Finalized On-Chain Judgment
```

---

## 🚀 Quick Start

```bash
git clone https://github.com/lobinni/ContentScout.git
cd ContentScout
npm install
npm run dev       # Local development
npm run build     # Production build
```

## 📁 Project Structure

```
ContentScout/
├── contract/
│   └── content_scout.py           # GenLayer Intelligent Contract
├── src/
│   ├── components/
│   │   ├── Header.tsx              # Navigation + wallet
│   │   ├── SubmitForm.tsx          # Content input form
│   │   ├── AnalysisResult.tsx      # Contract judgment display
│   │   ├── PendingJudgment.tsx     # Consensus waiting animation
│   │   ├── SubmissionList.tsx      # On-chain submissions
│   │   ├── StatsBar.tsx            # Contract statistics
│   │   ├── WalletModal.tsx         # Wallet connection
│   │   └── HowToUse.tsx            # Usage guide modal
│   ├── lib/
│   │   └── genlayer.ts             # Contract integration (NO local heuristic)
│   ├── types/index.ts
│   ├── App.tsx
│   └── index.css
├── vercel.json
└── package.json
```

## 🌐 Deploy to Vercel

1. Push to GitHub: `git push -u origin main`
2. Go to [vercel.com/new](https://vercel.com/new) → Import repository
3. Framework: **Vite** · Build: `npm run build` · Output: `dist`
4. Click **Deploy**

## 📄 License

MIT License
