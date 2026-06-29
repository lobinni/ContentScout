# ContentScout Intelligent Contract

This directory contains the GenLayer Intelligent Contract for ContentScout.

## Overview

The `content_scout.py` contract implements AI-powered content originality analysis using GenLayer's validator consensus mechanism.

### How It Works

1. **User submits content** via `submit(content, content_type, source_url)`
2. **Leader validator**:
   - Crawls the source URL (if provided) using `gl.nondet.web.get()`
   - Calls LLM via `gl.nondet.exec_prompt()` to analyze originality
   - Returns score, verdict, reasoning, and similar sources
3. **Other validators** verify the result structure matches expected format
4. **Consensus** is reached via `gl.vm.run_nondet_unsafe()`
5. **Result stored** on-chain in a `TreeMap`

### Scoring Criteria

The LLM evaluates content based on:

| Metric | Weight | Description |
|--------|--------|-------------|
| Uniqueness | 35% | Detects AI-generated phrases |
| Vocabulary | 25% | Lexical richness and variety |
| Structure | 20% | Sentence variation patterns |
| Creativity | 20% | Personal voice and evidence |

**Threshold**: Score ≥ 40 = PASS (Original), Score < 40 = REJECT (Flagged)

## Contract Methods

### Write Methods (require gas)

```python
# Submit content for analysis
submit(content: str, content_type: str, source_url: str) -> str
# Returns: submission key (e.g., "0", "1", "2", ...)

# Appeal a rejected submission (author only, once per submission)
appeal(key: str) -> None
```

### Read Methods (free)

```python
# Get submission data
get_submission(key: str) -> str  # Returns JSON

# Get contract stats
stats() -> str  # Returns {"submission_count": N, "total_rewarded": N, "total_rejected": N}

# Check reward eligibility
read_reward_eligibility(key: str) -> str  # Returns {"eligible": bool, "author": str, "score": int, "key": str}
```

## Deployment

### Prerequisites

1. Install GenLayer CLI:
```bash
npm install -g genlayer
```

2. Configure network:
```bash
genlayer network testnet-asimov
# or
genlayer network testnet-bradbury
```

3. Get testnet tokens from [faucet](https://faucet.genlayer.com)

### Deploy

```bash
# From project root
genlayer deploy --contract contract/content_scout.py

# With constructor args (none needed for this contract)
genlayer deploy --contract contract/content_scout.py --args '[]'
```

### After Deployment

1. Copy the deployed contract address
2. Update `src/lib/genlayer.ts`:
```typescript
export const CONTRACT_ADDRESS = '0xYOUR_NEW_CONTRACT_ADDRESS';
```
3. Rebuild the frontend:
```bash
npm run build
```

## Testing Locally

### Using GenLayer Studio

1. Start GenLayer Studio:
```bash
genlayer studio
```

2. Open http://localhost:8080

3. Deploy contract via Studio UI

4. Test methods interactively

### Example Interactions

```python
# Submit content
contract.submit(
    "This is my original article about machine learning...",
    "article",
    "https://myblog.com/ml-article"
)
# Returns: "0"

# Get submission
contract.get_submission("0")
# Returns: {"author": "0x...", "originality_score": 72, "is_original": true, ...}

# Get stats
contract.stats()
# Returns: {"submission_count": 1, "total_rewarded": 1, "total_rejected": 0}
```

## Contract Storage

| Field | Type | Description |
|-------|------|-------------|
| `submissions` | `TreeMap[str, str]` | Key → JSON submission data |
| `submission_count` | `str` | Total submissions (as string integer) |
| `total_rewarded` | `str` | Count of original submissions |
| `total_rejected` | `str` | Count of flagged submissions |

## Submission Data Structure

```json
{
  "author": "0x1234...5678",
  "content_preview": "First 200 chars of content...",
  "content_type": "article",
  "source_url": "https://example.com/article",
  "originality_score": 72,
  "is_original": true,
  "reasoning": "This article demonstrates strong originality...",
  "similar_sources": ["example.com/related"],
  "appealed": false
}
```

## Security Notes

- Content is truncated to 4000 characters to prevent abuse
- Only the original author can appeal their submission
- Each submission can only be appealed once
- Web crawling is limited to 5000 characters per source

## License

MIT License - see [LICENSE](../LICENSE)
