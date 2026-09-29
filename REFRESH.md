# Refresh playbook: data + AI analysis

There are two ways to refresh https://dashboard.angiefoong.com:

1. **Website button (normal path, fully automatic).** "Refresh data & AI analysis" on the site asks for
   the password (checked by the Cloudflare Worker in `worker/`). Within a minute the Mac's launchd watcher
   (`scripts/refresh_watcher.sh`) sees the request and runs `scripts/refresh.sh`: Apify scrape → Ollama
   (Kimi K3, thinking) rewrites `src/data/insights.json` → `scripts/validate_insights.py` rejects any number
   not found in the computed facts → build → push. Log: `~/Library/Logs/social-dashboard-refresh.log`.
2. **Claude review (this playbook).** The "Refresh social dashboard" task in the Claude app, for a
   deeper hand-checked rewrite. Follow the steps below.

## 0. Start clean

```bash
cd ~/Services/social-dashboard
git status --short          # must be empty; if not, stop and report what is uncommitted
git pull --ff-only
npm ci --silent             # only if node_modules is missing
```

## 1. Collect data

```bash
bash scripts/fetch_apify.sh --full
```

- Uses the token in `.apify_token` (never print it, never commit it).
- If it exits non-zero (Apify quota, empty result, network), **stop**: do not edit or push anything,
  and report the error. `social-data.json` is left unchanged by design.
- Note the "new posts:" line it prints.

## 2. Read the numbers

```bash
npx tsx scripts/report.ts > /tmp/social-report.txt
```

Read the whole report. It is the only source of truth for numbers. Also compare with the
previous version: `git diff --stat src/data/social-data.json`.

## 3. Classify new posts

For every post id in `src/data/social-data.json` that is missing from `src/data/annotations.json` → `posts`:
read its caption and add `{ "topic": ..., "hook": ... }` using the existing topic and hook ids.
Create a new topic only if at least 3 posts clearly fit none of the existing ones. Keep each
post's existing labels unchanged.

Re-run `npx tsx scripts/report.ts > /tmp/social-report.txt` afterwards.

## 4. Rewrite the analysis: `src/data/insights.json`

Keep the JSON structure exactly as it is (typed in `src/data/insights.ts`). Update the content:

- Set `basedOnCollectedAt` to the date part of `meta.collectedAt` in `social-data.json`, and
  `generatedBy` to `"Claude (manual review)"`.
- **Every number in the file must match the fresh report.** Go through the file line by line and
  re-check each figure (views, medians, rates, counts, percentages, dates, day counts).
- Re-evaluate every claim. Delete claims that are no longer true and add new findings the data
  now supports: new top posts, a topic that moved, TikTok activity resuming, and so on.
- `kind: 'observation'` = directly shown by the numbers. `kind: 'hypothesis'` = a possible
  explanation. `kind: 'general'` = advice not derived from this dataset. Never state a cause as fact.
- Mark small samples (fewer than 5 posts) as indicative, and never build a recommendation on one post.
- `postNotes` keys must be ids of posts that still exist. Add notes for new stand-out posts.
- `recommendations.nextFive`: if posts were published since the previous analysis, check them
  against the previous plan's pass marks and mention the result in the relevant recommendation.
  Then write a fresh 5-post plan with pass marks taken from the current benchmarks.
- `headline.title` should state the single most important finding in one sentence.
- Match the current tone: plain, specific, no hype.

Also scan the components for hard-coded wording that may have become false and fix it if so:
section intros and details in `src/components/*.tsx`, for example "TikTok medians sit at 0–1
views" in TopicPerformance and ContentPatterns, and the zero-view TikTok paragraph in BestWorstPosts.

## 5. Verify

```bash
npx tsx scripts/facts.ts > /tmp/facts.json
python3 scripts/validate_insights.py /tmp/facts.json src/data/insights.json src/data/social-data.json
npx tsc -b && npm run lint && npm run build
```

All must pass (the validator lists every number it cannot trace to the facts).

## 6. Publish

```bash
git add -A
git commit -m "Refresh data and analysis ($(date +%Y-%m-%d))"
git push
```

GitHub Pages deploys automatically in about a minute. Confirm with
`curl -s https://dashboard.angiefoong.com/ | grep -o '<title>.*</title>'`. The page's
"Collected" date should show today.

## 7. Report back (short)

- Posts collected per platform, new posts since the last refresh, and the Apify cost of this run
  (see `https://api.apify.com/v2/actor-runs?desc=1&limit=3`, `usageTotalUsd`).
- The 3 most important changes in the analysis.
- Anything that failed or needs the owner's attention.
