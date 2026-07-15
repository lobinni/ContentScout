# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""
ContentScout — AI Content Originality Scanner for GenLayer Studio
=================================================================
Strengthened validators, fail-closed, contract-authoritative.
Deployed: 0x3E5a8398d07915871080A072241a4D71F652D97a
"""

from genlayer import *
import json
import typing


THRESHOLD = 40
MAX_LEN = 4000
SCORE_TOL = 15

PROMPT = """You are a strict originality judge. Analyze the following content and determine if it is original or plagiarized/AI-generated.

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
- You MUST be strict. Default assumption: content is UNORIGINAL unless proven otherwise.
- Score >= 40 means PASS (original), < 40 means REJECT (flagged).
- If is_original is true, reasoning MUST cite specific evidence of originality.
- If is_original is false, reasoning MUST cite specific evidence AND similar_sources MUST contain at least one entry.
- Reasoning MUST be at least 50 characters and reference SPECIFIC aspects.
- Do NOT give high scores to generic, formulaic, or placeholder content.

Return JSON:
- originality_score: integer 0-100
- is_original: boolean (true ONLY if score >= 40 AND clear evidence)
- reasoning: string (>=50 chars, cite specific evidence)
- similar_sources: array of strings (REQUIRED when is_original is false)
"""

SRC_CTX = """
The author claims this content is published at: {source_url}
Content from that URL:
---
{source_content}
---
"""


class ContentScout(gl.Contract):
    """AI-Powered Content Originality Scanner. Fail-closed: is_original = score >= 40 always."""

    submissions: TreeMap[str, str]
    submission_count: str
    total_rewarded: str
    total_rejected: str

    def __init__(self):
        self.submissions = TreeMap()
        self.submission_count = "0"
        self.total_rewarded = "0"
        self.total_rejected = "0"

    @gl.public.write
    def submit(self, content: str, content_type: str, source_url: str) -> str:
        if not content or len(content.strip()) < 50:
            raise gl.vm.UserError("Content must be at least 50 characters")

        truncated = content[:MAX_LEN]
        author = str(gl.message.sender_address)
        _url = source_url

        def leader_fn():
            src_content = ""
            if _url:
                try:
                    resp = gl.nondet.web.get(_url)
                    src_content = resp.text if hasattr(resp, 'text') else str(resp)
                except Exception:
                    src_content = ""
            actual_ctx = ""
            if src_content:
                actual_ctx = SRC_CTX.format(source_url=_url, source_content=src_content[:3000])
            actual_prompt = PROMPT.format(
                content_type=content_type, source_url=_url or "N/A",
                content=truncated, source_context=actual_ctx,
            )
            return gl.nondet.exec_prompt(actual_prompt, response_format="json")

        def validator_fn(leaders_result) -> bool:
            if not isinstance(leaders_result, gl.vm.Return):
                return False
            data = leaders_result.calldata
            if not isinstance(data, dict):
                return False
            for k in ["originality_score", "is_original", "reasoning", "similar_sources"]:
                if k not in data:
                    return False
            score = data.get("originality_score")
            if not isinstance(score, (int, float)):
                return False
            if score < 0 or score > 100:
                return False
            expected = score >= THRESHOLD
            if data["is_original"] != expected:
                return False
            if not isinstance(data["is_original"], bool):
                return False
            reasoning = data.get("reasoning", "")
            if not isinstance(reasoning, str) or len(reasoning.strip()) < 50:
                return False
            if not data["is_original"]:
                sources = data.get("similar_sources", [])
                if not isinstance(sources, list) or len(sources) < 1:
                    return False
            sources = data.get("similar_sources", [])
            if not isinstance(sources, list):
                return False
            for s in sources:
                if not isinstance(s, str):
                    return False
            try:
                my_result = leader_fn()
                if not isinstance(my_result, dict):
                    return False
                my_score = my_result.get("originality_score")
                if not isinstance(my_score, (int, float)):
                    return False
                if (my_score >= THRESHOLD) != (score >= THRESHOLD):
                    return False
                if abs(my_score - score) > SCORE_TOL:
                    return False
            except Exception:
                return False
            return True

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        is_original_enforced = result["originality_score"] >= THRESHOLD
        current_count = int(self.submission_count)
        key = str(current_count)
        submission = {
            "author": author,
            "content_preview": truncated[:200] + ("..." if len(truncated) > 200 else ""),
            "content_type": content_type,
            "source_url": source_url or "",
            "originality_score": result["originality_score"],
            "is_original": is_original_enforced,
            "reasoning": result["reasoning"],
            "similar_sources": result["similar_sources"],
            "appealed": False,
        }
        self.submissions[key] = json.dumps(submission)
        self.submission_count = str(current_count + 1)
        if is_original_enforced:
            self.total_rewarded = str(int(self.total_rewarded) + 1)
        else:
            self.total_rejected = str(int(self.total_rejected) + 1)
        return key

    @gl.public.write
    def appeal(self, key: str) -> None:
        submission_json = self.submissions.get(key)
        if not submission_json:
            raise gl.vm.UserError("Submission not found")
        submission = json.loads(submission_json)
        sender_addr = str(gl.message.sender_address)
        if submission["author"].lower() != sender_addr.lower():
            raise gl.vm.UserError("Only the original author can appeal")
        if submission["appealed"]:
            raise gl.vm.UserError("Submission has already been appealed")
        was_original = submission["is_original"]
        _content = submission["content_preview"].rstrip(".")
        _ctype = submission["content_type"]
        _surl = submission["source_url"]

        def leader_fn():
            src_content = ""
            if _surl:
                try:
                    resp = gl.nondet.web.get(_surl)
                    src_content = resp.text if hasattr(resp, 'text') else str(resp)
                except Exception:
                    src_content = ""
            actual_ctx = ""
            if src_content:
                actual_ctx = SRC_CTX.format(source_url=_surl, source_content=src_content[:3000])
            actual_prompt = PROMPT.format(
                content_type=_ctype, source_url=_surl or "N/A",
                content=_content, source_context=actual_ctx,
            )
            return gl.nondet.exec_prompt(actual_prompt, response_format="json")

        def validator_fn(leaders_result) -> bool:
            if not isinstance(leaders_result, gl.vm.Return):
                return False
            data = leaders_result.calldata
            if not isinstance(data, dict):
                return False
            for k in ["originality_score", "is_original", "reasoning", "similar_sources"]:
                if k not in data:
                    return False
            score = data.get("originality_score")
            if not isinstance(score, (int, float)):
                return False
            if score < 0 or score > 100:
                return False
            expected = score >= THRESHOLD
            if data["is_original"] != expected:
                return False
            if not isinstance(data["is_original"], bool):
                return False
            reasoning = data.get("reasoning", "")
            if not isinstance(reasoning, str) or len(reasoning.strip()) < 50:
                return False
            if not data["is_original"]:
                sources = data.get("similar_sources", [])
                if not isinstance(sources, list) or len(sources) < 1:
                    return False
            sources = data.get("similar_sources", [])
            if not isinstance(sources, list):
                return False
            for s in sources:
                if not isinstance(s, str):
                    return False
            try:
                my_result = leader_fn()
                if not isinstance(my_result, dict):
                    return False
                my_score = my_result.get("originality_score")
                if not isinstance(my_score, (int, float)):
                    return False
                if (my_score >= THRESHOLD) != (score >= THRESHOLD):
                    return False
                if abs(my_score - score) > SCORE_TOL:
                    return False
            except Exception:
                return False
            return True

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        is_original_enforced = result["originality_score"] >= THRESHOLD
        submission["originality_score"] = result["originality_score"]
        submission["is_original"] = is_original_enforced
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

    @gl.public.view
    def get_submission(self, key: str) -> str:
        return self.submissions.get(key, "")

    @gl.public.view
    def stats(self) -> str:
        return json.dumps({
            "submission_count": int(self.submission_count),
            "total_rewarded": int(self.total_rewarded),
            "total_rejected": int(self.total_rejected),
        })

    @gl.public.view
    def read_reward_eligibility(self, key: str) -> str:
        submission_json = self.submissions.get(key)
        if not submission_json:
            return json.dumps({"eligible": False, "error": "Not found"})
        submission = json.loads(submission_json)
        return json.dumps({
            "eligible": submission["is_original"],
            "author": submission["author"],
            "score": submission["originality_score"],
            "key": key,
        })
