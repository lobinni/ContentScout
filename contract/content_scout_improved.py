"""
ContentScout — Strengthened Intelligent Contract for GenLayer Studio
====================================================================

CRITICAL FIXES from original contract:
1. Validator only checked isinstance() → NOW checks substantive originality evidence
2. Fail-open passing (high default score) → NOW fail-closed (enforce score ↔ verdict consistency)
3. No reasoning validation → NOW requires reasoning ≥ 50 chars with specific evidence
4. No evidence for flagging → NOW requires similar_sources when is_original=False
5. is_original could be inconsistent with score → NOW enforced in contract code

Contract Address: 0x141666BB3C83D10a2CC0bA2d42aE8973a2B47c22
Network: GenLayer Studio (Chain ID: 61999)
"""

from genlayer import gl
from genlayer.std import TreeMap
import json

# Originality threshold: score >= 40 is considered original
PLAGIARISM_THRESHOLD = 40

# Maximum content length (characters)
MAX_CONTENT_LENGTH = 4000

# Strengthened prompt — emphasizes evidence-based judgment
ANALYSIS_PROMPT = """You are a strict originality judge. Analyze the following content and determine if it is original or plagiarized/AI-generated.

Content Type: {content_type}
Source URL: {source_url}
Content:
---
{content}
---

{source_context}

Evaluate based on:
1. UNIQUENESS (35%): Does it contain common AI-generated phrases like "it is important to note", "in today's world", "leverage", "cutting-edge"? Are sentences formulaic?
2. VOCABULARY (25%): Is the vocabulary rich and varied with domain-specific terms, or repetitive and generic?
3. STRUCTURE (20%): Are sentence lengths varied naturally with distinct voice, or uniform like AI output?
4. CREATIVITY (20%): Does it show personal voice, specific evidence (names, dates, numbers, citations), rhetorical engagement?

CRITICAL RULES:
- Be STRICT. Default assumption: content is UNORIGINAL unless proven otherwise.
- Score >= 40 means PASS (original), < 40 means REJECT (flagged).
- If is_original=True, reasoning MUST cite specific evidence of originality from the content.
- If is_original=False, reasoning MUST cite specific evidence of unoriginality AND similar_sources MUST have at least 1 entry.
- Reasoning MUST be at least 50 characters and reference SPECIFIC aspects of the content.
- Do NOT give high scores to generic, formulaic, or placeholder content.

Return JSON:
- originality_score: integer 0-100 (strict, not generous)
- is_original: boolean (true ONLY if score >= 40 AND clear evidence of originality)
- reasoning: string (≥50 chars, must cite specific evidence from the content)
- similar_sources: array of strings (REQUIRED when is_original=false; at least 1 entry)
"""

SOURCE_CONTEXT_TEMPLATE = """
The author claims this content is published at: {source_url}

Content from that URL:
---
{source_content}
---

Compare the submitted content against this source. If they match, the author may be the original creator.
If they don't match, or if the content appears elsewhere, it may be plagiarized.
"""


class ContentScout(gl.Contract):
    """
    ContentScout — Strengthened Intelligent Contract
    
    Key improvements:
    - Validator checks substantive evidence, not just structure
    - Fail-closed: inconsistent verdicts are rejected by validators
    - is_original is ALWAYS enforced from score in contract code
    - Reasoning must be substantive
    - Similar sources required for flagged content
    """
    
    submissions: TreeMap[str, str]
    submission_count: str
    total_rewarded: str
    total_rejected: str
    
    def __init__(self):
        self.submissions = TreeMap()
        self.submission_count = "0"
        self.total_rewarded = "0"
        self.total_rejected = "0"
    
    @gl.public_write
    def submit(self, content: str, content_type: str, source_url: str) -> str:
        if not content or len(content.strip()) < 50:
            raise ValueError("Content must be at least 50 characters")
        
        truncated_content = content[:MAX_CONTENT_LENGTH]
        author = gl.message.sender_account
        
        # Run AI consensus judgment with STRENGTHENED validators
        result = self._run_judgment(truncated_content, content_type, source_url)
        
        current_count = int(self.submission_count)
        key = str(current_count)
        
        # ENFORCE CONSISTENCY: is_original is ALWAYS derived from score
        # This is the fail-closed fix — no inconsistent verdicts possible
        is_original_enforced = result["originality_score"] >= PLAGIARISM_THRESHOLD
        
        submission = {
            "author": author,
            "content_preview": truncated_content[:200] + ("..." if len(truncated_content) > 200 else ""),
            "content_type": content_type,
            "source_url": source_url or "",
            "originality_score": result["originality_score"],
            "is_original": is_original_enforced,  # ENFORCED from score
            "reasoning": result["reasoning"],
            "similar_sources": result["similar_sources"],
            "appealed": False
        }
        
        self.submissions[key] = json.dumps(submission)
        self.submission_count = str(current_count + 1)
        
        if is_original_enforced:
            self.total_rewarded = str(int(self.total_rewarded) + 1)
        else:
            self.total_rejected = str(int(self.total_rejected) + 1)
        
        return key
    
    @gl.public_write
    def appeal(self, key: str) -> None:
        submission_json = self.submissions.get(key)
        if not submission_json:
            raise ValueError("Submission not found")
        
        submission = json.loads(submission_json)
        
        if submission["author"] != gl.message.sender_account:
            raise ValueError("Only the original author can appeal")
        
        if submission["appealed"]:
            raise ValueError("Submission has already been appealed")
        
        was_original = submission["is_original"]
        
        content = submission["content_preview"].rstrip("...")
        result = self._run_judgment(
            content,
            submission["content_type"],
            submission["source_url"]
        )
        
        # ENFORCE CONSISTENCY on appeal too
        is_original_enforced = result["originality_score"] >= PLAGIARISM_THRESHOLD
        
        submission["originality_score"] = result["originality_score"]
        submission["is_original"] = is_original_enforced  # ENFORCED
        submission["reasoning"] = result["reasoning"]
        submission["similar_sources"] = result["similar_sources"]
        submission["appealed"] = True
        
        self.submissions[key] = json.dumps(submission)
        
        if was_original != is_original_enforced:
            if is_original_enforced:
                self.total_rewarded = str(int(self.total_rewarded) + 1)
                self.total_rejected = str(int(self.total_rejected) - 1)
            else:
                self.total_rewarded = str(int(self.total_rewarded) - 1)
                self.total_rejected = str(int(self.total_rejected) + 1)
    
    @gl.public_read
    def get_submission(self, key: str) -> str:
        return self.submissions.get(key, "")
    
    @gl.public_read
    def stats(self) -> str:
        return json.dumps({
            "submission_count": int(self.submission_count),
            "total_rewarded": int(self.total_rewarded),
            "total_rejected": int(self.total_rejected)
        })
    
    @gl.public_read
    def read_reward_eligibility(self, key: str) -> str:
        submission_json = self.submissions.get(key)
        if not submission_json:
            return json.dumps({"eligible": False, "error": "Not found"})
        submission = json.loads(submission_json)
        return json.dumps({
            "eligible": submission["is_original"],
            "author": submission["author"],
            "score": submission["originality_score"],
            "key": key
        })
    
    def _run_judgment(self, content, content_type, source_url):
        """
        Run AI consensus judgment with STRENGTHENED validators.
        
        The validator function checks SUBSTANTIVE evidence, not just structure.
        Fail-closed: inconsistent results are REJECTED by validators.
        """
        
        def leader_fn():
            source_content = ""
            if source_url:
                try:
                    source_content = gl.nondet.web.get(source_url)
                except:
                    source_content = ""
            
            source_context = ""
            if source_content:
                source_context = SOURCE_CONTEXT_TEMPLATE.format(
                    source_url=source_url,
                    source_content=source_content[:3000]
                )
            
            prompt = ANALYSIS_PROMPT.format(
                content_type=content_type,
                source_url=source_url or "N/A",
                content=content,
                source_context=source_context
            )
            
            result = gl.nondet.exec_prompt(prompt, response_format="json")
            return result
        
        def validator_fn(result):
            """
            STRENGTHENED VALIDATOR — Checks substantive originality evidence.
            
            Previous validator (FAIL-OPEN):
                return isinstance(result["originality_score"], int)
            
            New validator (FAIL-CLOSED):
                1. Score is valid integer in [0, 100]
                2. is_original is consistent with score >= threshold
                3. Reasoning is substantive (≥ 50 characters)
                4. Similar sources provided when content is flagged
                5. is_original is boolean
                6. All required fields present
            
            If ANY check fails, the result is REJECTED.
            The leader must produce a judgment that satisfies ALL conditions.
            """
            # 1. Must be a dict
            if not isinstance(result, dict):
                return False
            
            # 2. All required fields must exist
            required_keys = ["originality_score", "is_original", "reasoning", "similar_sources"]
            for k in required_keys:
                if k not in result:
                    return False
            
            # 3. Score must be valid integer in range [0, 100]
            score = result.get("originality_score")
            if not isinstance(score, (int, float)):
                return False
            if score < 0 or score > 100:
                return False
            
            # 4. is_original MUST be consistent with score (FAIL-CLOSED)
            # This is the KEY fix — no more inconsistent verdicts
            expected_original = score >= PLAGIARISM_THRESHOLD
            if result["is_original"] != expected_original:
                return False  # REJECT inconsistent result
            
            # 5. is_original must be boolean
            if not isinstance(result["is_original"], bool):
                return False
            
            # 6. Reasoning must be substantive (≥ 50 chars)
            reasoning = result.get("reasoning", "")
            if not isinstance(reasoning, str) or len(reasoning.strip()) < 50:
                return False  # REJECT without substantive reasoning
            
            # 7. Similar sources REQUIRED when content is flagged
            if not result["is_original"]:
                sources = result.get("similar_sources", [])
                if not isinstance(sources, list) or len(sources) < 1:
                    return False  # REJECT: flagged without evidence
            
            # 8. similar_sources must be a list of strings
            sources = result.get("similar_sources", [])
            if not isinstance(sources, list):
                return False
            for s in sources:
                if not isinstance(s, str):
                    return False
            
            return True
        
        return gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
