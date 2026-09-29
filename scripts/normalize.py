"""Normalize raw Apify exports into src/data/social-data.json.

Inputs (data-raw/):
  instagram.json   apify/instagram-scraper, resultsType=posts
  tiktok.json      clockworks/tiktok-scraper, profileScrapeSections=videos
  ig_profile.json  apify/instagram-scraper, resultsType=details (optional)

Rules:
  - Missing metrics stay null. Nothing is defaulted to 0.
  - Instagram "views" = videoPlayCount (the number Instagram shows as Views on Reels).
    videoViewCount (legacy metric) is kept as altViews for reference only.
  - Instagram shares are not exposed publicly -> null.
  - Duplicates are removed by platform + native post id.
  - Thumbnails are downloaded to public/thumbnails/ because CDN URLs expire.
  - Merge: posts already in social-data.json that were not in this scrape are kept with their
    last known metrics (daily runs only fetch the newest posts). Each post records metricsAsOf.
  - Safety: if a platform returns 0 posts while the dataset already has some, the run aborts
    without touching social-data.json (pass --force to override).

Usage: python3 scripts/normalize.py [--no-thumbs] [--force]
"""
import json
import os
import re
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone
from difflib import SequenceMatcher

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data-raw")
OUT = os.path.join(ROOT, "src", "data", "social-data.json")
THUMBS = os.path.join(ROOT, "public", "thumbnails")


def num(v):
    if v is None or isinstance(v, bool):
        return None
    try:
        n = float(v)
    except (TypeError, ValueError):
        return None
    if n < 0:  # Instagram returns -1 when a count is hidden
        return None
    return int(n) if n == int(n) else round(n, 2)


def load(name):
    path = os.path.join(RAW, name)
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)


def ig_post(x):
    kind = {"Video": "reel", "Image": "image", "Sidecar": "carousel"}.get(x.get("type"), (x.get("type") or "").lower() or None)
    views = num(x.get("videoPlayCount"))
    alt = num(x.get("videoViewCount"))
    flags = []
    if views is not None and alt is not None and alt > views * 5:
        flags.append("views_field_conflict")
    if kind != "reel":
        flags.append("views_not_available_for_format")
    return {
        "id": f"ig_{x['shortCode']}",
        "platform": "instagram",
        "url": x.get("url"),
        "caption": x.get("caption") or "",
        "publishedAt": x.get("timestamp"),
        "contentType": kind,
        "views": views,
        "altViews": alt,
        "likes": num(x.get("likesCount")),
        "comments": num(x.get("commentsCount")),
        "shares": None,
        "saves": None,
        "durationSec": num(x.get("videoDuration")),
        "hashtags": x.get("hashtags") or [],
        "thumbnailSource": x.get("displayUrl"),
        "flags": flags,
    }


def tt_post(x):
    vm = x.get("videoMeta") or {}
    flags = []
    if num(x.get("playCount")) == 0:
        flags.append("zero_views_reported")
    return {
        "id": f"tt_{x['id']}",
        "platform": "tiktok",
        "url": x.get("webVideoUrl"),
        "caption": x.get("text") or "",
        "publishedAt": x.get("createTimeISO"),
        "contentType": "slideshow" if x.get("isSlideshow") else "video",
        "views": num(x.get("playCount")),
        "altViews": None,
        "likes": num(x.get("diggCount")),
        "comments": num(x.get("commentCount")),
        "shares": num(x.get("shareCount")),
        "saves": num(x.get("collectCount")),
        "durationSec": num(vm.get("duration")),
        "hashtags": [h.get("name") for h in (x.get("hashtags") or []) if h.get("name")],
        "thumbnailSource": vm.get("coverUrl") or vm.get("originalCoverUrl"),
        "flags": flags,
    }


def download_thumb(post):
    src = post.pop("thumbnailSource", None)
    post["thumbnail"] = None
    if not src:
        return
    os.makedirs(THUMBS, exist_ok=True)
    name = f"{post['id']}.jpg"
    dest = os.path.join(THUMBS, name)
    if not os.path.exists(dest):
        try:
            req = urllib.request.Request(src, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=30) as r, open(dest, "wb") as f:
                f.write(r.read())
            # shrink + convert to jpeg (TikTok covers may be webp/heic); skipped if no tool exists
            for cmd in (["sips", "-s", "format", "jpeg", "-Z", "480", dest, "--out", dest],
                        ["magick", dest, "-resize", "480x480>", "jpeg:" + dest]):
                try:
                    subprocess.run(cmd, capture_output=True, check=True)
                    break
                except (FileNotFoundError, subprocess.CalledProcessError):
                    continue
        except Exception as e:  # expired URL etc. -> leave thumbnail null
            print(f"  thumbnail failed for {post['id']}: {e}", file=sys.stderr)
            if os.path.exists(dest):
                os.remove(dest)
            return
    post["thumbnail"] = f"thumbnails/{name}"


def hook_key(caption):
    first = caption.strip().split("\n")[0]
    return re.sub(r"[^a-z0-9 ]", "", first.lower())[:90]


def link_cross_posts(posts):
    """Mark TikTok videos that reuse an Instagram caption (same creative, two platforms)."""
    ig = [p for p in posts if p["platform"] == "instagram"]
    for t in (p for p in posts if p["platform"] == "tiktok"):
        best, score = None, 0.0
        for i in ig:
            s = SequenceMatcher(None, hook_key(t["caption"]), hook_key(i["caption"])).ratio()
            if s > score:
                best, score = i, s
        if best and score >= 0.8:
            t["crossPostOf"] = best["id"]
            best.setdefault("crossPostedAs", []).append(t["id"])


def main():
    thumbs = "--no-thumbs" not in sys.argv
    ig_raw = load("instagram.json") or []
    tt_raw = load("tiktok.json") or []
    profile = load("ig_profile.json")
    profile = profile[0] if isinstance(profile, list) and profile else None

    posts, seen = [], set()
    for x in ig_raw:
        if x.get("shortCode") and f"ig_{x['shortCode']}" not in seen:
            p = ig_post(x); seen.add(p["id"]); posts.append(p)
    for x in tt_raw:
        if x.get("id") and f"tt_{x['id']}" not in seen:
            p = tt_post(x); seen.add(p["id"]); posts.append(p)
    duplicates_removed = len(ig_raw) + len(tt_raw) - len(posts)
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    for p in posts:
        p["metricsAsOf"] = now

    # merge with the previous dataset
    previous = json.load(open(OUT)) if os.path.exists(OUT) else {"posts": [], "meta": {}}
    for platform in ("instagram", "tiktok"):
        new_n = sum(p["platform"] == platform for p in posts)
        old_n = sum(p["platform"] == platform for p in previous["posts"])
        if new_n == 0 and old_n > 0 and "--force" not in sys.argv:
            sys.exit(f"ABORT: scrape returned 0 {platform} posts (had {old_n}). social-data.json left unchanged.")
    kept = 0
    for old in previous["posts"]:
        if old["id"] not in seen:
            old.setdefault("metricsAsOf", previous.get("meta", {}).get("collectedAt"))
            old.pop("crossPostOf", None); old.pop("crossPostedAs", None)
            posts.append(old); seen.add(old["id"]); kept += 1

    for p in posts:
        p.setdefault("crossPostOf", None)
        p.setdefault("crossPostedAs", [])
    link_cross_posts(posts)

    for p in posts:
        if "thumbnailSource" not in p:  # carried over from the previous dataset
            continue
        if thumbs:
            download_thumb(p)
        else:
            p.pop("thumbnailSource", None); p["thumbnail"] = None
    posts.sort(key=lambda p: p["publishedAt"] or "", reverse=True)

    tt_author = (tt_raw[0].get("authorMeta") if tt_raw else None) or {}
    prev_acc = previous.get("meta", {}).get("accounts", {})
    prev_ig, prev_tt = prev_acc.get("instagram", {}), prev_acc.get("tiktok", {})
    data = {
        "meta": {
            "collectedAt": now,
            "postsCarriedOver": kept,
            "analysisTimezone": "Asia/Kuala_Lumpur",
            "duplicatesRemoved": duplicates_removed,
            "accounts": {
                "instagram": {
                    "handle": "ainchors.ai.fintech",
                    "profileUrl": "https://www.instagram.com/ainchors.ai.fintech/",
                    "source": "apify/instagram-scraper",
                    "postsOnProfile": num(profile.get("postsCount")) if profile else prev_ig.get("postsOnProfile"),
                    "followers": num(profile.get("followersCount")) if profile else prev_ig.get("followers"),
                    "postsCollected": sum(p["platform"] == "instagram" for p in posts),
                },
                "tiktok": {
                    "handle": "ainchors.ai.fintech",
                    "profileUrl": "https://www.tiktok.com/@ainchors.ai.fintech",
                    "source": "clockworks/tiktok-scraper",
                    "postsOnProfile": num(tt_author.get("video")) if tt_author else prev_tt.get("postsOnProfile"),
                    "followers": num(tt_author.get("fans")) if tt_author else prev_tt.get("followers"),
                    "postsCollected": sum(p["platform"] == "tiktok" for p in posts),
                },
            },
            "fieldNotes": {
                "views": "Instagram: Reel play count (Views). Null for image and carousel posts. TikTok: playCount.",
                "shares": "Instagram does not expose share counts publicly, so they are null. TikTok shares are reported.",
                "saves": "TikTok only (collectCount). Not part of the engagement formula.",
                "engagement": "likes + comments + shares, using only the reported components. Instagram engagement therefore excludes shares.",
            },
        },
        "posts": posts,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    new_ids = sorted(p["id"] for p in posts if p["id"] not in {q["id"] for q in previous["posts"]})
    print(f"wrote {len(posts)} posts ({duplicates_removed} duplicates removed, {kept} carried over from previous data) -> {os.path.relpath(OUT, ROOT)}")
    print("new posts:", ", ".join(new_ids) if new_ids else "none")


if __name__ == "__main__":
    main()
