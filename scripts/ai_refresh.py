"""Regenerate the AI commentary with the local Ollama daemon.

1. New posts (in social-data.json but not annotations.json) get a topic + hook from the existing lists.
2. scripts/facts.ts computes every metric; the model rewrites src/data/insights.json from those facts.
3. validate_insights.py rejects any draft with structural errors or numbers not found in the facts.
   Failed drafts are retried with the problems fed back; then the next model is tried.
4. If every attempt fails, the previous insights.json is kept (the page then shows its
   "commentary describes an older snapshot" banner) and the script exits 3.

Usage: python3 scripts/ai_refresh.py            (models: $OLLAMA_MODELS, comma-separated)
Exit: 0 = new commentary written, 3 = kept previous commentary, 1 = hard error.
"""
import json
import os
import subprocess
import sys
import time
import urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from validate_insights import validate  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "src", "data")
OLLAMA = os.environ.get("OLLAMA_HOST", "http://localhost:11434").rstrip("/")
# Strongest reasoning model first (Kimi K3, 2.8T params, thinking); the others are thinking-capable fallbacks.
MODELS = [m.strip() for m in os.environ.get("OLLAMA_MODELS", "kimi-k3:cloud,deepseek-v4-pro:cloud,glm-5.3:cloud").split(",") if m.strip()]
THINK = os.environ.get("OLLAMA_THINK", "1") != "0"
DEBUG_DIR = os.environ.get("AI_DEBUG_DIR")  # set to keep every raw draft for inspection
ATTEMPTS_PER_MODEL = 2


def log(*a):
    print("[ai]", *a, flush=True)


def load(name):
    with open(os.path.join(DATA, name)) as f:
        return json.load(f)


def save(name, obj):
    path = os.path.join(DATA, name)
    with open(path + ".tmp", "w") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
        f.write("\n")
    os.replace(path + ".tmp", path)


def chat(model, system, user, schema, timeout=900):
    body = {
        "model": model,
        "stream": False,
        "think": THINK,
        "format": schema,
        "options": {"temperature": 0.3},
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
    }
    req = urllib.request.Request(f"{OLLAMA}/api/chat", data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        content = json.load(r)["message"]["content"].strip()
    if content.startswith("```"):  # some models wrap JSON in a fence despite `format`
        content = content.split("\n", 1)[1].rsplit("```", 1)[0]
    return json.loads(content)


# ------------------------------------------------------------------ 1. classify new posts

def classify_new_posts():
    data, ann = load("social-data.json"), load("annotations.json")
    new = [p for p in data["posts"] if p["id"] not in ann["posts"]]
    if not new:
        log("no new posts to classify")
        return 0
    topics, hooks = [t["id"] for t in ann["topics"]], [h["id"] for h in ann["hooks"]]
    schema = {"type": "object", "required": ["assignments"], "properties": {"assignments": {"type": "array", "items": {
        "type": "object", "required": ["id", "topic", "hook"],
        "properties": {"id": {"type": "string"}, "topic": {"type": "string", "enum": topics}, "hook": {"type": "string", "enum": hooks}}}}}}
    system = ("You label social media posts for a content analysis. For each post choose exactly one primary topic and one "
              "hook type from the given lists, based on the caption. The hook is the style of the caption's first line. "
              "Reply with JSON only.")
    user = json.dumps({
        "topics": ann["topics"], "hooks": ann["hooks"],
        "examples": [{"caption": p["caption"][:300], **ann["posts"][p["id"]]} for p in data["posts"][:12] if p["id"] in ann["posts"]],
        "posts": [{"id": p["id"], "platform": p["platform"], "caption": p["caption"][:800]} for p in new],
    }, ensure_ascii=False)
    for model in MODELS:
        try:
            out = chat(model, system, user, schema, timeout=300)
            got = {a["id"]: a for a in out.get("assignments", []) if a.get("topic") in topics and a.get("hook") in hooks}
            n = 0
            for p in new:
                if p["id"] in got:
                    ann["posts"][p["id"]] = {"topic": got[p["id"]]["topic"], "hook": got[p["id"]]["hook"]}
                    n += 1
            save("annotations.json", ann)
            log(f"classified {n}/{len(new)} new posts with {model}")
            return n
        except Exception as e:  # noqa: BLE001
            log(f"classification with {model} failed: {e}")
    log("classification failed; new posts fall back to keyword rules")
    return 0


# ------------------------------------------------------------------ 2-3. commentary

LINE = {"type": "object", "required": ["kind", "text"], "properties": {
    "kind": {"type": "string", "enum": ["observation", "hypothesis", "general"]}, "text": {"type": "string"}}}
REC = {"type": "object", "required": ["kind", "title", "detail"], "properties": {
    "kind": {"type": "string", "enum": ["observation", "hypothesis", "general"]}, "title": {"type": "string"}, "detail": {"type": "string"}}}
LINES = {"type": "array", "items": LINE}
RECS = {"type": "array", "items": REC}
PATTERN = {"type": "object", "required": ["strength", "lines"], "properties": {
    "strength": {"type": "string", "enum": ["moderate", "weak", "insufficient"]}, "lines": LINES}}
QUAD = {"type": "object", "required": ["interpretation", "action"], "properties": {"interpretation": {"type": "string"}, "action": {"type": "string"}}}
SCHEMA = {
    "type": "object",
    "required": ["headline", "executiveSummary", "platformNarrative", "postNotes", "topicNotes", "quadrantNotes", "patternNotes", "hookNotes", "recommendations"],
    "properties": {
        "headline": {"type": "object", "required": ["title", "platformTitle", "platformIntro"], "properties": {
            "title": {"type": "string"}, "platformTitle": {"type": "string"}, "platformIntro": {"type": "string"}}},
        "executiveSummary": {"type": "array", "items": {"type": "string"}, "minItems": 3, "maxItems": 5},
        "platformNarrative": {"type": "object", "required": ["instagram", "tiktok", "differences"], "properties": {
            "instagram": LINES, "tiktok": LINES, "differences": LINES}},
        "postNotes": {"type": "object", "additionalProperties": LINES},
        "topicNotes": {"type": "object", "additionalProperties": {"type": "string"}},
        "quadrantNotes": {"type": "object", "required": ["reach-engage", "reach-only", "engage-only", "neither"], "properties": {
            "reach-engage": QUAD, "reach-only": QUAD, "engage-only": QUAD, "neither": QUAD}},
        "patternNotes": {"type": "object", "required": ["day", "time", "duration", "topic", "frequency"], "properties": {
            k: PATTERN for k in ["day", "time", "duration", "topic", "frequency"]}},
        "hookNotes": LINES,
        "recommendations": {"type": "object", "required": ["more", "less", "experiment", "hooks", "duration", "posting", "platformStrategy", "nextFive"], "properties": {
            "more": RECS, "less": RECS, "experiment": RECS, "hooks": RECS, "duration": REC, "posting": RECS,
            "platformStrategy": {"type": "object", "required": ["instagram", "tiktok"], "properties": {"instagram": RECS, "tiktok": RECS}},
            "nextFive": {"type": "array", "minItems": 5, "maxItems": 5, "items": {"type": "object",
                "required": ["n", "platform", "topic", "hook", "format", "brief", "measure"],
                "properties": {"n": {"type": "integer"}, "platform": {"type": "string"}, "topic": {"type": "string"}, "hook": {"type": "string"},
                               "format": {"type": "string"}, "brief": {"type": "string"}, "measure": {"type": "string"}}}}}},
    },
}

SYSTEM = """You are a senior content strategist writing the commentary for a social media performance dashboard
(Instagram + TikTok) for AINCHORS, an AI-skills training company. Write in clear, plain English, like a
premium consulting report: specific, calm, no hype, no emojis.

HARD RULES
1. Use ONLY numbers that appear in FACTS (or in a post's own caption). Do not compute new ratios, averages,
   percentages or totals. If a number you want is not in FACTS, describe it in words instead. Every draft is
   machine-checked and any number not found in FACTS is rejected. Write numbers exactly as in FACTS, rounded
   to at most one decimal place, with thousands separators (e.g. 37,463). Never write "13k" or "2,000+".
   Round day counts, durations in seconds and view counts to whole numbers (39 days, not 38.9 days).
2. kind="observation": directly shown by FACTS. kind="hypothesis": a possible explanation that the data
   cannot prove. kind="general": advice not derived from this dataset. Never present a cause as fact.
3. Groups with fewer than 5 posts are low-sample: say so, and do not base a recommendation on one post.
4. Prefer medians over averages. "Typical post" = median. Engagement per 1,000 views = per1000.
5. Instagram share counts are not public (null), so Instagram engagement = likes + comments.
6. postNotes keys must be real post ids from FACTS.posts. Write notes for 8-14 stand-out posts: top views,
   best engagement rate, unexpected highs and lows, and notable TikTok videos. topicNotes keys must be
   topic ids from FACTS.categories.topics.
7. Compare with PREVIOUS commentary: keep what is still true (with updated numbers), drop what is no longer
   true, and add what is new (new posts, a change in the top performers, TikTok resuming, and so on).
   If posts were published after PREVIOUS.basedOnCollectedAt, judge them against PREVIOUS
   recommendations.nextFive pass marks and mention the result.
8. headline.title: the single most important finding, one sentence of at most 12 words.
9. nextFive: exactly 5 concrete post ideas with a pass mark based on current FACTS benchmarks.
Return ONLY the JSON object."""


SCHEMA_ANALYSIS = {**SCHEMA, "required": [k for k in SCHEMA["required"] if k != "recommendations"],
                   "properties": {k: v for k, v in SCHEMA["properties"].items() if k != "recommendations"}}
SCHEMA_RECS = SCHEMA["properties"]["recommendations"]

TASK_ANALYSIS = ("\n\nTASK (part 1 of 2): write headline, executiveSummary, platformNarrative, postNotes, topicNotes, "
                 "quadrantNotes, patternNotes and hookNotes. Do NOT write recommendations yet.")
TASK_RECS = ("\n\nTASK (part 2 of 2): write the recommendations object ONLY, with keys more, less, experiment, hooks, "
             "duration (a single object), posting, platformStrategy {instagram, tiktok} and nextFive (EXACTLY 5 items, "
             "n = 1..5). Base every recommendation on FACTS and on the ANALYSIS you already wrote.")


def compact(o):
    return json.dumps(o, ensure_ascii=False, separators=(",", ":"))


def attempt_loop(model, label, make_user, schema, check):
    """Call the model until `check(draft)` returns no problems; feed problems back between attempts."""
    feedback = ""
    for attempt in range(1, ATTEMPTS_PER_MODEL + 1):
        t = time.time()
        try:
            draft = chat(model, SYSTEM, make_user() + feedback, schema)
        except Exception as e:  # noqa: BLE001
            log(f"{model} {label} attempt {attempt}: request failed: {e}")
            return None
        if DEBUG_DIR:
            os.makedirs(DEBUG_DIR, exist_ok=True)
            with open(os.path.join(DEBUG_DIR, f"{label}-{model.replace(':', '_')}-{attempt}.json"), "w") as f:
                json.dump(draft, f, ensure_ascii=False, indent=1)
        problems = check(draft)
        log(f"{model} {label} attempt {attempt}: {len(problems)} problem(s) in {time.time() - t:.0f}s")
        if not problems:
            return draft
        for p in problems[:10]:
            log("   ", p)
        feedback = ("\n\nYOUR PREVIOUS DRAFT WAS REJECTED. Fix every problem below and return the full JSON again. "
                    "For numbers that are not in FACTS, remove them or use the exact FACTS value:\n- " + "\n- ".join(problems[:40]))
    return None


def generate(facts, previous, captions):
    base = ("FACTS (computed from the data; the only allowed source of numbers):\n" + compact(facts)
            + "\n\nPREVIOUS commentary (structure and tone reference; its numbers may be out of date):\n"
            + compact({k: v for k, v in previous.items() if k != "generatedBy"}))
    stamp = {"basedOnCollectedAt": facts["collectedAt"][:10]}
    for model in MODELS:
        stamp["generatedBy"] = f"Ollama · {model}" + (" (thinking)" if THINK else "")

        def check_analysis(d):
            full = {**d, **stamp, "recommendations": previous["recommendations"]}
            return [p for p in validate(full, facts, captions) if not p.startswith("recommendations")]

        analysis = attempt_loop(model, "analysis", lambda: base + TASK_ANALYSIS, SCHEMA_ANALYSIS, check_analysis)
        if analysis is None:
            continue

        def check_recs(r):
            return validate({**analysis, **stamp, "recommendations": r}, facts, captions)

        recs = attempt_loop(model, "recommendations", lambda: base + "\n\nANALYSIS (already written and verified):\n"
                            + compact(analysis) + TASK_RECS, SCHEMA_RECS, check_recs)
        if recs is not None:
            return {**stamp, **analysis, "recommendations": recs}
    return None


def main():
    classify_new_posts()
    facts = json.loads(subprocess.run(["npx", "tsx", "scripts/facts.ts"], cwd=ROOT, check=True,
                                      capture_output=True, text=True, stdin=subprocess.DEVNULL).stdout)
    previous = load("insights.json")
    captions = [p["caption"] for p in load("social-data.json")["posts"]]
    draft = generate(facts, previous, captions)
    if draft is None:
        log("all attempts failed validation; keeping the previous commentary")
        sys.exit(3)
    ordered = {"basedOnCollectedAt": draft["basedOnCollectedAt"], "generatedBy": draft["generatedBy"],
               **{k: draft[k] for k in SCHEMA["required"]}}
    save("insights.json", ordered)
    log(f"wrote insights.json ({ordered['generatedBy']})")


if __name__ == "__main__":
    main()
