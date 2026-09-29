# Refresh playbook: data + AI analysis

Run this when the owner presses **Run now** on the "Refresh social dashboard" task in the Claude app.
Goal: fresh Apify data, a re-written analysis that matches the new numbers, and the live site
(https://dashboard.angiefoong.com) updated. Work in `~/Services/social-dashboard`.

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

## 4. Rewrite the analysis: `src/data/insights.ts`

Keep every export name and type exactly as they are (`BASED_ON_COLLECTED_AT`, `headline`,
`executiveSummary`, `platformNarrative`, `postNotes`, `topicNotes`, `quadrantNotes`,
`patternNotes`, `hookNotes`, `recommendations`). Update the content:

- Set `BASED_ON_COLLECTED_AT` to the date part of `meta.collectedAt` in `social-data.json`.
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
npx tsc -b && npm run lint && npm run build
```

All three must pass. Then do a final read of `insights.ts` against `/tmp/social-report.txt`.

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
