# ContentScout — AI Content Originality Scanner

> **Contract-Authoritative · Fail-Closed · No Local Heuristic**

AI-Powered Content Originality Scanner deployed on **GenLayer Studio Blockchain**. Every score, verdict, and reasoning displayed in the UI comes **exclusively** from the on-chain AI consensus judgment — no browser-based heuristic is ever substituted.

## 🔗 Live Demo

**[contentscout-umber.vercel.app](https://contentscout-umber.vercel.app/)**

## 📜 Contract

| Field | Value |
|---|---|
| **Address** | `0x141666BB3C83D10a2CC0bA2d42aE8973a2B47c22` |
| **Network** | GenLayer Studio (Chain ID: 61999) |
| **RPC** | `https://studio.genlayer.com/api` |
| **Explorer** | [View Contract](https://explorer-studio.genlayer.com/address/0x141666BB3C83D10a2CC0bA2d42aE8973a2B47c22) |
| **Studio** | [GenLayer Studio](https://studio.genlayer.com) |

## ✨ Features

| Feature | Implementation |
|---|---|
| 🤖 **AI Analysis** | On-chain AI consensus via `gl.nondet.exec_prompt()` |
| 🌐 **Web Crawling** | Source comparison via `gl.nondet.web.get()` |
| 🔄 **Validator Consensus** | `gl.vm.run_nondet_unsafe()` with strengthened validators |
| 📜 **Contract-Authoritative** | Every result read from `get_submission()` |
| 🔒 **Fail-Closed** | `is_original = score ≥ 40` — always enforced |
| 🚫 **No Local Heuristic** | Browser never computes a score — ever |

## 🏗 Architecture

```
User → MetaMask → writeContract(submit) → GenLayer Studio
                                               ↓
                                     AI Validator Consensus
                                               ↓
User ← readContract(get_submission) ← Finalized Judgment
```

**Critical Design Principle:** The browser NEVER computes a local score. The user sees ONLY the contract's on-chain judgment after FINALIZED consensus.

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/lobinni/ContentScout.git
cd ContentScout

# Install
npm install

# Run locally
npm run dev

# Build for production
npm run build
```

## 📁 Project Structure

```
ContentScout/
├── contract/
│   └── content_scout_improved.py   # Strengthened Intelligent Contract
├── src/
│   ├── components/
│   │   ├── Header.tsx              # Navigation + wallet
│   │   ├── SubmitForm.tsx          # Content input form
│   │   ├── AnalysisResult.tsx      # Contract judgment display
│   │   ├── PendingJudgment.tsx     # Consensus waiting animation
│   │   ├── SubmissionList.tsx      # On-chain submissions
│   │   ├── StatsBar.tsx            # Contract statistics
│   │   └── WalletModal.tsx         # Wallet connection
│   ├── lib/
│   │   └── genlayer.ts             # Contract integration (NO local heuristic)
│   ├── types/
│   │   └── index.ts                # TypeScript types
│   ├── App.tsx                     # Main app
│   ├── main.tsx                    # Entry point
│   └── index.css                   # Styles
├── vercel.json                     # Vercel deployment config
├── index.html                      # HTML entry
└── package.json
```

## 🔒 Fail-Closed Enforcement

The contract's AI consensus may return inconsistent results (e.g., `is_original=true` but `score=30`). The DApp enforces:

```
is_original = originality_score >= 40  // ALWAYS derived from score
```

If an inconsistency is detected, a **validation warning** is displayed in the UI, and the score-based verdict overrides the contract's `is_original` field.

## 🛡 Strengthened Validators

The improved contract (`content_scout_improved.py`) includes validators that check:

1. ✅ Score is valid integer in range [0, 100]
2. ✅ `is_original` is consistent with `score >= threshold` (rejects inconsistent results)
3. ✅ Reasoning is ≥ 50 characters (substantive evidence required)
4. ✅ Similar sources provided when content is flagged (evidence for rejection)
5. ✅ All required fields present and correctly typed

**Previous validator (fail-open):**
```python
return isinstance(result["originality_score"], int)
```

**New validator (fail-closed):**
```python
# Rejects inconsistent verdicts, requires substantive evidence
if result["is_original"] != (score >= PLAGIARISM_THRESHOLD):
    return False  # FAIL-CLOSED
if len(reasoning.strip()) < 50:
    return False  # Requires substantive reasoning
if not result["is_original"] and len(similar_sources) < 1:
    return False  # Requires evidence for flagging
```

## 🌐 Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → Import project
3. Framework: **Vite**
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Click **Deploy**

## 📊 Scoring System

| Score | Verdict | Description |
|---|---|---|
| 70-100 | ✅ ORIGINAL | Strong evidence of originality |
| 40-69 | ⚠️ BORDERLINE | Passes but with common patterns |
| 0-39 | 🚫 FLAGGED | Significant unoriginality indicators |

**Threshold:** `score ≥ 40` = PASS (fail-closed)

## 📄 License

MIT License
