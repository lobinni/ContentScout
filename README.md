# 🔍 ContentScout

<div align="center">

**AI-Powered Content Originality Scanner on GenLayer**

Real Intelligent Contract using `gl.nondet.exec_prompt()` for LLM-based content analysis with validator consensus.

[![GenLayer](https://img.shields.io/badge/GenLayer-Intelligent_Contract-ff00c8?style=for-the-badge)](https://genlayer.com)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)

![Python](https://img.shields.io/badge/Contract-Python-3776ab?style=flat-square&logo=python)
![React](https://img.shields.io/badge/Frontend-React_19-61dafb?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript)

</div>

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        ContentScout                           │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│   ┌──────────────┐          ┌────────────────────────────┐   │
│   │   Frontend   │  ◄────►  │   Intelligent Contract     │   │
│   │   (React)    │          │   (Python / GenLayer)      │   │
│   │              │          │                            │   │
│   │ • MetaMask   │          │ • gl.nondet.exec_prompt()  │   │
│   │ • genlayer-js│          │ • gl.nondet.web.get()      │   │
│   │ • Results UI │          │ • gl.vm.run_nondet_unsafe()│   │
│   └──────────────┘          └────────────────────────────┘   │
│          │                              │                     │
│          └──────────────┬───────────────┘                     │
│                         ▼                                     │
│               ┌──────────────────┐                            │
│               │ GenLayer Network │                            │
│               │ (AI Validators)  │                            │
│               └──────────────────┘                            │
└──────────────────────────────────────────────────────────────┘
```

---

## ✨ Features

| Feature | GenLayer API |
|---------|--------------|
| 🤖 **LLM Analysis** | `gl.nondet.exec_prompt()` |
| 🌐 **Web Crawling** | `gl.nondet.web.get()` |
| 🔄 **Validator Consensus** | `gl.vm.run_nondet_unsafe()` |
| 📦 **On-Chain Storage** | `TreeMap[str, str]` |
| 🔐 **Write Methods** | `@gl.public_write` |
| 📖 **Read Methods** | `@gl.public_read` |

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/ContentScout.git
cd ContentScout
npm install
```

### 2. Deploy Contract

```bash
# Install GenLayer CLI
npm install -g genlayer

# Get testnet tokens from https://faucet.genlayer.com

# Deploy to testnet
genlayer network testnet-asimov
genlayer deploy --contract contract/content_scout.py
```

### 3. Configure Frontend

```bash
# Copy the deployed contract address and create .env.local
echo "VITE_CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS" > .env.local
```

### 4. Run

```bash
npm run dev
```

---

## 📁 Project Structure

```
ContentScout/
├── contract/
│   ├── content_scout.py    # 🔥 GenLayer Intelligent Contract
│   └── README.md           # Contract documentation
├── src/
│   ├── components/         # React UI components
│   ├── hooks/              # React hooks
│   ├── lib/
│   │   ├── genlayer.ts     # GenLayer SDK integration
│   │   └── analyzer.ts     # Local fallback analyzer
│   ├── types/              # TypeScript types
│   ├── App.tsx
│   └── index.css
├── scripts/
│   └── deploy.sh           # Deployment helper script
├── .env.example            # Environment template
├── package.json
└── README.md
```

---

## 📜 Intelligent Contract

### Key Methods

```python
# Write (require gas)
submit(content: str, content_type: str, source_url: str) -> str
appeal(key: str) -> None

# Read (free)
get_submission(key: str) -> str
stats() -> str
read_reward_eligibility(key: str) -> str
```

### AI Judgment Flow

```python
def _run_judgment(self, content, content_type, source_url):
    def leader_fn():
        # 1. Crawl source URL
        source = gl.nondet.web.get(source_url)
        
        # 2. Call LLM
        result = gl.nondet.exec_prompt(prompt, response_format="json")
        
        return {
            "originality_score": 72,
            "is_original": True,
            "reasoning": "...",
            "similar_sources": []
        }
    
    def validator_fn(result):
        # Verify structure
        return isinstance(result["originality_score"], int)
    
    return gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
```

---

## 📊 Scoring System

| Score | Result | Reward Eligible |
|-------|--------|-----------------|
| 70-100 | ✅ Original | Yes |
| 40-69 | ⚠️ Borderline | Yes |
| 0-39 | 🚫 Flagged | No |

**Threshold:** `score >= 40` = PASS

---

## 🔧 Configuration

### Environment Variables

```env
# .env.local
VITE_CONTRACT_ADDRESS=0x...  # Required after deployment
```

### Network Settings

Edit `src/lib/genlayer.ts`:

```typescript
// testnet-asimov (default)
export const CHAIN_ID = 4220;

// testnet-bradbury (alternative)
// export const CHAIN_ID = 4221;
```

---

## 🌐 Deployment

### Contract

```bash
# Option 1: Using script
npm run deploy:contract

# Option 2: Manual
genlayer network testnet-asimov
genlayer deploy --contract contract/content_scout.py
```

### Frontend

**Cloudflare Pages:**
- Build: `npm run build`
- Output: `dist`

**Vercel/Netlify:** Auto-detected

---

## 🔗 Resources

| Resource | URL |
|----------|-----|
| GenLayer Docs | https://docs.genlayer.com |
| Faucet | https://faucet.genlayer.com |
| Explorer | https://explorer.genlayer.com |
| genlayer-js | https://github.com/genlayerlabs/genlayer-js |

---

## 📄 License

MIT License — see [LICENSE](LICENSE)

---

<div align="center">

**Built on GenLayer — The Intelligence Layer of the Internet**

</div>
