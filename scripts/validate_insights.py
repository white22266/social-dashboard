"""Check an insights.json against facts.json.

Every number written in the commentary must be traceable to the computed facts (allowing normal
rounding), to a post caption, or to a small fixed set of constants. Structure is checked too.

Usage: python3 scripts/validate_insights.py facts.json src/data/insights.json [src/data/social-data.json]
Exit 0 = valid; exit 1 = problems printed one per line.
"""
import json
import math
import re
import sys

KINDS = {"observation", "hypothesis", "general"}
QUADS = {"reach-engage", "reach-only", "engage-only", "neither"}
PATTERNS = {"day", "time", "duration", "topic", "frequency"}
STRENGTH = {"moderate", "weak", "insufficient"}
# thresholds and bucket edges used by the dashboard itself (time buckets, duration buckets,
# min sample, clustering window, view thresholds)
CONSTANTS = {0, 1, 3, 5, 6, 12, 17, 20, 21, 39, 40, 59, 60, 100, 1000}


def numbers_in(text):
    out = []
    for m in re.finditer(r"(?<![A-Za-z_.\d])(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?", text):
        whole, frac = m.group(1).replace(",", ""), m.group(2) or ""
        out.append((m.group(0), float(whole + frac), len(frac) - 1 if frac else 0))
    return out


def collect_numbers(obj, acc):
    if isinstance(obj, bool) or obj is None:
        return
    if isinstance(obj, (int, float)):
        acc.add(float(obj))
    elif isinstance(obj, str):
        for _, v, _ in numbers_in(obj):
            acc.add(v)
    elif isinstance(obj, dict):
        for k, v in obj.items():
            collect_numbers(v, acc)
    elif isinstance(obj, list):
        for v in obj:
            collect_numbers(v, acc)


def allowed_index(facts, extra=None):
    vals = set(float(c) for c in CONSTANTS)
    collect_numbers(facts, vals)
    collect_numbers(extra, vals)  # e.g. full captions: "77% of Fortune 500" is quoting the post
    # dates in facts (years, days of month) come through ISO strings above
    idx = {0: set(), 1: set(), 2: set()}
    for v in vals:
        for d in idx:
            q = 10 ** d
            idx[d].add(round(v, d))                     # banker's rounding
            idx[d].add(math.floor(v * q + 0.5) / q)     # half-up rounding (372.5 -> 373)
        idx[0].add(float(int(v)))  # "about 4x" from 4.4 is fine; truncation also accepted
    return vals, idx


def texts(ins):
    """Yield (path, text) for every human-readable string."""
    def walk(o, path):
        if isinstance(o, str):
            yield path, o
        elif isinstance(o, dict):
            for k, v in o.items():
                if k in ("kind", "strength"):
                    continue
                yield from walk(v, f"{path}.{k}")
        elif isinstance(o, list):
            for i, v in enumerate(o):
                yield from walk(v, f"{path}[{i}]")
    for k, v in ins.items():
        if k in ("basedOnCollectedAt", "generatedBy"):
            continue
        yield from walk(v, k)


def structure_problems(ins, facts):
    p = []
    need = ["headline", "executiveSummary", "platformNarrative", "postNotes", "topicNotes",
            "quadrantNotes", "patternNotes", "hookNotes", "recommendations"]
    for k in need:
        if k not in ins:
            p.append(f"missing key: {k}")
    if p:
        return p
    h = ins["headline"]
    for k in ("title", "platformTitle", "platformIntro"):
        if not isinstance(h.get(k), str) or not h.get(k):
            p.append(f"headline.{k} missing")
    if not (3 <= len(ins["executiveSummary"]) <= 6):
        p.append("executiveSummary must have 3-6 items")

    def lines(arr, path):
        if not isinstance(arr, list):
            p.append(f"{path} must be a list"); return
        for i, l in enumerate(arr):
            if not isinstance(l, dict) or l.get("kind") not in KINDS or not isinstance(l.get("text"), str):
                p.append(f"{path}[{i}] needs kind in {sorted(KINDS)} and text")

    for k in ("instagram", "tiktok", "differences"):
        lines(ins["platformNarrative"].get(k), f"platformNarrative.{k}")
    post_ids = {x["id"] for x in facts["posts"]}
    for pid, arr in ins["postNotes"].items():
        if pid not in post_ids:
            p.append(f"postNotes key {pid} is not a post id")
        lines(arr, f"postNotes.{pid}")
    topic_ids = {t["id"] for t in facts["categories"]["topics"]}
    for tid in ins["topicNotes"]:
        if tid not in topic_ids:
            p.append(f"topicNotes key {tid} is not a topic id")
    if set(ins["quadrantNotes"]) != QUADS:
        p.append(f"quadrantNotes keys must be exactly {sorted(QUADS)}")
    for q, v in ins["quadrantNotes"].items():
        if not isinstance(v, dict) or not v.get("interpretation") or not v.get("action"):
            p.append(f"quadrantNotes.{q} needs interpretation and action")
    if set(ins["patternNotes"]) != PATTERNS:
        p.append(f"patternNotes keys must be exactly {sorted(PATTERNS)}")
    for k, v in ins["patternNotes"].items():
        if v.get("strength") not in STRENGTH:
            p.append(f"patternNotes.{k}.strength must be one of {sorted(STRENGTH)}")
        lines(v.get("lines"), f"patternNotes.{k}.lines")
    lines(ins["hookNotes"], "hookNotes")
    r = ins["recommendations"]

    def recs(arr, path):
        if isinstance(arr, dict):
            arr = [arr]
        if not isinstance(arr, list) or not arr:
            p.append(f"{path} must be a non-empty list"); return
        for i, x in enumerate(arr):
            if x.get("kind") not in KINDS or not x.get("title") or not x.get("detail"):
                p.append(f"{path}[{i}] needs kind, title, detail")

    for k in ("more", "less", "experiment", "hooks", "posting"):
        recs(r.get(k), f"recommendations.{k}")
    recs(r.get("duration"), "recommendations.duration")
    recs((r.get("platformStrategy") or {}).get("instagram"), "recommendations.platformStrategy.instagram")
    recs((r.get("platformStrategy") or {}).get("tiktok"), "recommendations.platformStrategy.tiktok")
    nf = r.get("nextFive")
    if not isinstance(nf, list) or len(nf) != 5:
        p.append("recommendations.nextFive must have exactly 5 items")
    else:
        for i, x in enumerate(nf):
            for k in ("platform", "topic", "hook", "format", "brief", "measure"):
                if not isinstance(x.get(k), str) or not x.get(k):
                    p.append(f"recommendations.nextFive[{i}].{k} missing")
    return p


def number_problems(ins, facts, captions=None):
    _, idx = allowed_index(facts, captions)
    bad = []
    for path, text in texts(ins):
        for raw, v, dec in numbers_in(text):
            d = min(dec, 2)
            if round(v, d) in idx[d]:
                continue
            if dec == 0 and 2020 <= v <= 2035:  # years
                continue
            if dec == 0 and v <= 31 and re.search(rf"\b{re.escape(raw)}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)", text):
                continue  # day of month in a date
            bad.append(f"{path}: number {raw} is not in the facts")
    return bad


def validate(ins, facts, captions=None):
    probs = structure_problems(ins, facts)
    if not probs:
        probs += number_problems(ins, facts, captions)
    return probs


if __name__ == "__main__":
    facts = json.load(open(sys.argv[1]))
    ins = json.load(open(sys.argv[2]))
    caps = [p["caption"] for p in json.load(open(sys.argv[3]))["posts"]] if len(sys.argv) > 3 else None
    problems = validate(ins, facts, caps)
    for x in problems:
        print(x)
    print(f"{len(problems)} problem(s)", file=sys.stderr)
    sys.exit(1 if problems else 0)
