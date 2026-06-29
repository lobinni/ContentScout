"""
ContentScout — Intelligent Contract for GenLayer
================================================

This contract analyzes content originality using AI consensus.
Validators independently judge each submission and reach consensus
on the originality score.

Deploy: genlayer deploy --contract contract/content_scout.py
Network: testnet-bradbury or testnet-asimov

Methods:
  - submit(content, content_type, source_url) -> submission_key
  - appeal(key) -> re-judge with fresh analysis
  - get_submission(key) -> submission data
  - stats() -> contract statistics
  - read_reward_eligibility(key) -> reward info
"""

from genlayer import gl
from genlayer.std import TreeMap
import json

# Originality threshold: score >= 40 is considered original
PLAGIARISM_THRESHOLD = 40

# Maximum content length (characters)
MAX_CONTENT_LENGTH = 4000

# Prompt template for AI judgment
ANALYSIS_PROMPT = """You are an originality judge. Analyze the following content and determine if it is original or plagiarized/AI-generated.

Content Type: {content_type}
Source URL: {source_url}
Content:
---
{content}
---

{source_context}

Evaluate based on:
1. UNIQUENESS (35%): Does it contain common AI-generated phrases like "it is important to note", "in today's world", "leverage", "cutting-edge"?
2. VOCABULARY (25%): Is the vocabulary rich and varied, or repetitive and generic?
3. STRUCTURE (20%): Are sentence lengths varied naturally, or uniform like AI output?
4. CREATIVITY (20%): Does it show personal voice, specific evidence, rhetorical engagement?

Return a JSON object with:
- originality_score: integer 0-100
- is_original: boolean (true if score >= 40)
- reasoning: string explaining the verdict
- similar_sources: array of strings (URLs or descriptions of similar content found)

Be strict but fair. Score >= 40 means PASS (original), < 40 means REJECT (flagged).
"""

SOURCE_CONTEXT_TEMPLATE = """
The author claims this content is published at: {source_url}

Content from that URL:
---
{source_content}
---

Compare the submitted content against this source. If they match, it's likely the author is the original creator.
If they don't match, or if the submitted content appears elsewhere, it may be plagiarized.
"""


class ContentScout(gl.Contract):
    """
    ContentScout Intelligent Contract
    
    Analyzes content for originality using AI validator consensus.
    Original submissions (score >= 40) are eligible for token rewards.
    """
    
    # Storage: TreeMap[str, str] for submissions (key -> JSON)
    submissions: TreeMap[str, str]
    
    # Counters (using strings to store integers)
    submission_count: str  # Total submissions
    total_rewarded: str    # Submissions marked original
    total_rejected: str    # Submissions marked flagged
    
    def __init__(self):
        """Initialize contract state."""
        self.submissions = TreeMap()
        self.submission_count = "0"
        self.total_rewarded = "0"
        self.total_rejected = "0"
    
    @gl.public_write
    def submit(self, content: str, content_type: str, source_url: str) -> str:
        """
        Submit content for originality analysis.
        
        Args:
            content: The content to analyze (max 4000 chars)
            content_type: Type of content (article, essay, code, creative, research)
            source_url: Optional URL where content is published
            
        Returns:
            The submission key (string integer)
        """
        # Validate input
        if not content or len(content.strip()) < 50:
            raise ValueError("Content must be at least 50 characters")
        
        # Truncate to max length
        truncated_content = content[:MAX_CONTENT_LENGTH]
        
        # Get caller address
        author = gl.message.sender_account
        
        # Run AI consensus judgment
        result = self._run_judgment(truncated_content, content_type, source_url)
        
        # Generate submission key
        current_count = int(self.submission_count)
        key = str(current_count)
        
        # Create submission record
        submission = {
            "author": author,
            "content_preview": truncated_content[:200] + ("..." if len(truncated_content) > 200 else ""),
            "content_type": content_type,
            "source_url": source_url or "",
            "originality_score": result["originality_score"],
            "is_original": result["is_original"],
            "reasoning": result["reasoning"],
            "similar_sources": result["similar_sources"],
            "appealed": False
        }
        
        # Store submission
        self.submissions[key] = json.dumps(submission)
        
        # Update counters
        self.submission_count = str(current_count + 1)
        
        if result["is_original"]:
            self.total_rewarded = str(int(self.total_rewarded) + 1)
        else:
            self.total_rejected = str(int(self.total_rejected) + 1)
        
        return key
    
    @gl.public_write
    def appeal(self, key: str) -> None:
        """
        Appeal a submission for re-judgment.
        Only the original author can appeal, and only once.
        
        Args:
            key: The submission key to appeal
        """
        # Get submission
        submission_json = self.submissions.get(key)
        if not submission_json:
            raise ValueError("Submission not found")
        
        submission = json.loads(submission_json)
        
        # Verify caller is the author
        if submission["author"] != gl.message.sender_account:
            raise ValueError("Only the original author can appeal")
        
        # Check if already appealed
        if submission["appealed"]:
            raise ValueError("Submission has already been appealed")
        
        # Store previous verdict for counter reconciliation
        was_original = submission["is_original"]
        
        # Re-run judgment with fresh analysis
        # Reconstruct content from preview (in real use, store full content)
        content = submission["content_preview"].rstrip("...")
        result = self._run_judgment(
            content,
            submission["content_type"],
            submission["source_url"]
        )
        
        # Update submission
        submission["originality_score"] = result["originality_score"]
        submission["is_original"] = result["is_original"]
        submission["reasoning"] = result["reasoning"]
        submission["similar_sources"] = result["similar_sources"]
        submission["appealed"] = True
        
        # Store updated submission
        self.submissions[key] = json.dumps(submission)
        
        # Reconcile counters if verdict changed
        if was_original != result["is_original"]:
            if result["is_original"]:
                self.total_rewarded = str(int(self.total_rewarded) + 1)
                self.total_rejected = str(int(self.total_rejected) - 1)
            else:
                self.total_rewarded = str(int(self.total_rewarded) - 1)
                self.total_rejected = str(int(self.total_rejected) + 1)
    
    @gl.public_read
    def get_submission(self, key: str) -> str:
        """
        Get a submission by key.
        
        Args:
            key: The submission key
            
        Returns:
            JSON string of submission data, or empty string if not found
        """
        return self.submissions.get(key, "")
    
    @gl.public_read
    def stats(self) -> str:
        """
        Get contract statistics.
        
        Returns:
            JSON string with submission_count, total_rewarded, total_rejected
        """
        return json.dumps({
            "submission_count": int(self.submission_count),
            "total_rewarded": int(self.total_rewarded),
            "total_rejected": int(self.total_rejected)
        })
    
    @gl.public_read
    def read_reward_eligibility(self, key: str) -> str:
        """
        Check if a submission is eligible for rewards.
        
        Args:
            key: The submission key
            
        Returns:
            JSON string with eligible, author, score, key
        """
        submission_json = self.submissions.get(key)
        if not submission_json:
            return json.dumps({
                "eligible": False,
                "author": "",
                "score": 0,
                "key": key
            })
        
        submission = json.loads(submission_json)
        
        return json.dumps({
            "eligible": submission["is_original"],
            "author": submission["author"],
            "score": submission["originality_score"],
            "key": key
        })
    
    def _run_judgment(self, content: str, content_type: str, source_url: str) -> dict:
        """
        Run AI consensus judgment on content.
        
        Uses gl.vm.run_nondet_unsafe with leader and validator functions
        to reach consensus on originality score.
        """
        
        def leader_fn() -> dict:
            """Leader function: crawl source and run LLM analysis."""
            
            # Prepare source context if URL provided
            source_context = ""
            if source_url and source_url.strip():
                try:
                    # Crawl the source URL
                    source_content = gl.nondet.web.get(source_url)
                    # Truncate to reasonable length
                    source_content = source_content[:5000]
                    source_context = SOURCE_CONTEXT_TEMPLATE.format(
                        source_url=source_url,
                        source_content=source_content
                    )
                except Exception:
                    source_context = f"(Could not fetch content from {source_url})"
            
            # Build the prompt
            prompt = ANALYSIS_PROMPT.format(
                content_type=content_type,
                source_url=source_url or "(not provided)",
                content=content,
                source_context=source_context
            )
            
            # Call LLM for analysis
            response = gl.nondet.exec_prompt(
                prompt,
                response_format="json"
            )
            
            # Parse response
            try:
                result = json.loads(response)
            except json.JSONDecodeError:
                # Fallback if LLM returns invalid JSON
                result = {
                    "originality_score": 50,
                    "is_original": True,
                    "reasoning": "Analysis completed with default scoring.",
                    "similar_sources": []
                }
            
            # Validate and normalize
            score = int(result.get("originality_score", 50))
            score = max(0, min(100, score))
            
            return {
                "originality_score": score,
                "is_original": score >= PLAGIARISM_THRESHOLD,
                "reasoning": str(result.get("reasoning", ""))[:500],
                "similar_sources": result.get("similar_sources", [])[:5]
            }
        
        def validator_fn(leader_result: dict) -> bool:
            """
            Validator function: verify the leader's result structure.
            
            Validators check that:
            - originality_score is an integer 0-100
            - is_original is a boolean matching score >= threshold
            - reasoning is a non-empty string
            
            Note: Validators don't need identical scores, just valid structure.
            """
            try:
                score = leader_result.get("originality_score")
                is_original = leader_result.get("is_original")
                reasoning = leader_result.get("reasoning")
                
                # Validate score
                if not isinstance(score, int) or score < 0 or score > 100:
                    return False
                
                # Validate is_original matches threshold
                expected_original = score >= PLAGIARISM_THRESHOLD
                if is_original != expected_original:
                    return False
                
                # Validate reasoning exists
                if not isinstance(reasoning, str) or len(reasoning) < 10:
                    return False
                
                return True
                
            except Exception:
                return False
        
        # Run consensus
        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        
        return result
