/**
 * Written analysis for the dataset collected on 2026-09-28.
 *
 * All numbers on the dashboard are computed live from social-data.json. The prose below is not:
 * it was written after reading that specific dataset. If you refresh the data, the dashboard shows
 * a banner reminding you that this narrative describes the older snapshot.
 */
import type { QuadrantId } from '../lib/types'

export const BASED_ON_COLLECTED_AT = '2026-09-28'

type Kind = 'observation' | 'hypothesis' | 'general'
export interface Line { kind: Kind; text: string }

export const executiveSummary: string[] = [
  'Instagram is the only channel producing reach today. It generated 99% of all views; TikTok videos have a median of 1 view.',
  'Instagram reach is concentrated: 4 reels delivered 71% of Instagram views, and one reel ("Your boss is using AI…") collected 70% of all Instagram likes.',
  'Since the June 2026 shift to AI-skills content, a typical Instagram post earns about 4× more engagement per 1,000 views than the 2025 lifestyle and mindset posts (26.9 vs 6.1).',
  'The same 13 scripts that reached a median of 409 views on Instagram reached a median of 1 view on TikTok, so the TikTok gap is not explained by the content itself.',
]

export const platformNarrative: { instagram: Line[]; tiktok: Line[]; differences: Line[] } = {
  instagram: [
    { kind: 'observation', text: 'This is a reach-and-occasional-breakout channel. A typical post gets about 300 views, but 12 of 58 reels passed 1,000 views and 4 passed 13,000. Those spikes carry the account.' },
    { kind: 'observation', text: 'Engagement is thin in absolute terms: the median post has 4.5 likes and 0 comments. Share counts are not public on Instagram, so engagement here is likes plus comments only.' },
    { kind: 'observation', text: 'Posting has been bursty: 60 posts across 17 active weeks out of 56, with a 178-day silence between December 2025 and June 2026.' },
  ],
  tiktok: [
    { kind: 'observation', text: 'This is a channel that has not started distributing. All 20 videos went out within 3.3 days (17–20 Aug 2026) to an account with 2 followers, 8 videos reported 0 views, and nothing has been posted in the 39 days since.' },
    { kind: 'observation', text: 'The last day of posting (20 Aug) was different: 4 of its 5 videos reached 148–223 views and earned all 23 likes and 3 saves the account has received.' },
    { kind: 'hypothesis', text: 'Twenty uploads in three days from a brand-new account, with 13 captions reused from Instagram, may have limited early distribution. Public data cannot confirm how TikTok treated these uploads. Check TikTok Studio for any "restricted" or "ineligible for For You" notices.' },
  ],
  differences: [
    { kind: 'observation', text: "TikTok's pooled engagement rate (24.5 per 1,000 views) is higher than Instagram's (15.4), but it rests on 938 total views and 23 likes. It is a small-number artefact, not evidence that TikTok audiences engage more." },
    { kind: 'observation', text: 'Where TikTok did get views, the strongest videos were an AI tool-choice script (223 views, 9 likes, 2 saves), a "stop using AI like a search engine" how-to (219) and an ROI story about investing $80 in skills (208). These are the same themes that engage best on Instagram.' },
    { kind: 'hypothesis', text: 'The platforms are at different stages rather than one being "better". Instagram has an audience of 2,254 followers and an algorithm history; TikTok has neither yet.' },
  ],
}

/** Per-post commentary for the stand-out list. Keys are post ids. */
export const postNotes: Record<string, Line[]> = {
  ig_DbX5MjSpBJq: [
    { kind: 'observation', text: 'Highest views (37,463) and by far the highest engagement: 1,736 likes, 46 per 1,000 views, about 3.5× the Instagram median rate.' },
    { kind: 'observation', text: 'It combines a second-person question hook, a statistic ("77% of Fortune 500…") and a career-gap stakes line.' },
    { kind: 'hypothesis', text: 'The like count is so far above every other post (the next best has 114) that an external push, such as a boost, a share by a large account or a feature, is plausible. Public data cannot confirm whether it was boosted, so check Instagram Insights → "Reach from ads".' },
  ],
  ig_DaRlBaKJboP: [
    { kind: 'observation', text: 'Second-highest reach (37,449 views) but only 84 engagements, or 2.2 per 1,000 views. That is well below the Instagram median.' },
    { kind: 'hypothesis', text: 'The "Imagine an AI that…" hook earns the watch, but the caption gives no reason to respond. There is no question, poll or save prompt. That fits the pattern across curiosity hooks: high reach, low response.' },
  ],
  ig_DbeIUn4zOmf: [
    { kind: 'observation', text: 'The caption is only hashtags ("#movitation #success #businesswomen"), yet the post reached 28,517 views. That is 140× the median of other mindset posts.' },
    { kind: 'hypothesis', text: 'The caption cannot explain this result. Whatever worked is in the video itself (visual, audio or on-screen text), which this dataset does not capture. Review the video directly before trying to repeat it.' },
  ],
  ig_DZrioHUpxkY: [
    { kind: 'observation', text: 'A 64-second reel with a 7-word caption ("AI isn\'t coming. Is already here") reached 13,954 views, 22× the median for its topic.' },
    { kind: 'hypothesis', text: 'As with the hashtag-only reel, the video content rather than the caption probably drove reach.' },
  ],
  ig_Dahb9AMJXry: [
    { kind: 'observation', text: 'The quiz hook reached 6,805 views but earned only 6 likes and 0 comments. At 0.9 per 1,000 views, it is among the lowest engagement rates of any post above the median.' },
    { kind: 'hypothesis', text: 'A quiz invites an answer, but the caption answers it immediately. Asking viewers to comment their answer first might convert this reach.' },
  ],
  ig_DahbtfnJsdT: [
    { kind: 'observation', text: 'Problem-plus-fix format ("The one AI mistake costing you hours… and the 30-second fix") reached 6,179 views and earned 64 engagements (10.4 per 1,000).' },
  ],
  ig_DZrwCzEpUB3: [
    { kind: 'observation', text: 'Best engagement rate among above-median posts: 58.7 per 1,000 views, with 11 comments. That is the most comments on any post in the dataset.' },
    { kind: 'hypothesis', text: 'It promotes a specific in-person class (day, place, format). Concrete, local offers may prompt questions in a way that generic course promotion does not.' },
  ],
  ig_DPIpgoQDkN7: [
    { kind: 'observation', text: '5,941 views, 29× the median for work-life-balance posts, but only 6 engagements.' },
  ],
  ig_DObNQmAkieu: [
    { kind: 'observation', text: 'A 21-second quote reel on growth reached 2,437 views, 12× other mindset posts, with 8 likes.' },
  ],
  ig_DPhKqwrE7N4: [
    { kind: 'observation', text: 'Lowest-reach reel (74 views, 0 engagement). It was one of 4 posts published within 21 minutes in the early hours of 8 Oct 2025 (Kuala Lumpur time).' },
    { kind: 'hypothesis', text: 'Stacking several near-identical quote reels in minutes may split the same small audience between them.' },
  ],
  ig_DbcsbITpyVi: [
    { kind: 'observation', text: 'Instagram reports 276 plays but 15,519 legacy "video views" for this reel, and 66 likes. The two view fields normally move together, so treat its engagement rate with caution.' },
  ],
  tt_7675200156626849044: [
    { kind: 'observation', text: 'Same script as the top Instagram reel (37,463 views there), but 1 view on TikTok.' },
    { kind: 'hypothesis', text: 'This is the clearest evidence that TikTok\'s problem is distribution rather than content quality.' },
  ],
  tt_7674907785682750740: [
    { kind: 'observation', text: 'Same script as the #2 Instagram reel (37,449 views there), but 0 views on TikTok.' },
  ],
  tt_7675946301724314898: [
    { kind: 'observation', text: 'Best TikTok video: 223 views, 9 likes and 2 saves, 40 engagements per 1,000 views. The same script also beat the Instagram median (409 views there).' },
  ],
  tt_7676032862415506695: [
    { kind: 'observation', text: 'A TikTok-only script framing a course as a better return than an $80 dinner: 208 views and 5 likes.' },
  ],
  tt_7676052264208928018: [
    { kind: 'observation', text: 'A TikTok-only how-to ("Stop using AI like a search engine") reached 219 views, 6 likes and 1 save.' },
  ],
}

export const topicNotes: Record<string, string> = {
  'ai-how-to': 'Highest median reach on Instagram (6,492 views, 4 posts) but the lowest engagement rate (2.2 per 1,000). This content attracts viewers but does not get them to respond.',
  'ai-future-of-work': 'Holds the #1 post. A typical post gets 621 views and 27 engagements per 1,000 on Instagram. On TikTok, all 5 posts had 5 views or fewer.',
  'ai-tool-choice': 'The most consistent performer: 387 median views and 30.9 engagements per 1,000 views on Instagram, plus the best TikTok video.',
  'course-promo': 'The most-used topic (19 posts). It engages well per view (29.4 per 1,000) but reach is capped at about 300 views.',
  'corporate-escape': 'The 2025 topic with the most reach: median 2,256 views over 5 posts. Engagement rate is low (5.5 per 1,000).',
  'work-life-balance': 'Median 203 views; one outlier (5,941) came from a question-led lifestyle post.',
  mindset: 'The largest topic in 2025 (13 posts) and the weakest typical result: 203 median views, 4.9 per 1,000. The exception is a hashtag-only reel at 28,517 views.',
  'travel-bts': 'Steady but modest: 319 median views. Two captions (Riyadh posts) read like production notes rather than audience-facing copy.',
  'personal-seasonal': 'Only 2 posts, both image or carousel posts with no public view count, so they cannot be ranked on reach.',
}

export const quadrantNotes: Record<QuadrantId, { interpretation: string; action: string }> = {
  'reach-engage': {
    interpretation: 'Posts that both travelled and got a response. 17 of 22 are from the 2026 AI period: future-of-work, how-to, tool-choice and class posts. Note that the Instagram engagement benchmark is only 6 likes plus comments.',
    action: 'Treat these as templates. Re-cut the winning scripts with new examples rather than inventing new formats.',
  },
  'reach-only': {
    interpretation: 'Seen but not acted on. Mostly the December 2025 Riyadh behind-the-scenes posts and two question-led 9-to-5 posts from 2025 that reached 2,000+ views but earned 1–4 engagements.',
    action: 'Keep the format and give the viewer something to do: a point of view to agree or disagree with, a save-worthy takeaway, or a direct question at the end.',
  },
  'engage-only': {
    interpretation: 'A small audience that liked what it saw. Five of nine are 2026 course-promotion posts: people who already follow respond (6–15 engagements), but the posts rarely travel past about 300 views.',
    action: 'Do not expect reach from promotion. Pair each promotional post with a reach post (a question or curiosity hook on AI and careers), and re-post the strongest promotional post with an outcome-led first line.',
  },
  neither: {
    interpretation: 'Mostly the September–October 2025 mindset and work-life-balance reels. Many were posted 3–5 on the same day, and several share near-identical scripts.',
    action: 'Retire short aphorism reels as a stand-alone format, and never stack posts minutes apart.',
  },
}

export const patternNotes: Record<'day' | 'time' | 'duration' | 'topic' | 'frequency', { strength: 'moderate' | 'weak' | 'insufficient'; lines: Line[] }> = {
  day: {
    strength: 'weak',
    lines: [
      { kind: 'observation', text: 'Wednesday has the highest median views among well-sampled days (511, 14 posts). Monday and Friday posts earned the most engagement per 1,000 views (about 29–30).' },
      { kind: 'observation', text: 'Weekday medians swing on a handful of posts, with only 3 to 14 posts per day. Day of week is not a reliable lever in this dataset.' },
    ],
  },
  time: {
    strength: 'moderate',
    lines: [
      { kind: 'observation', text: 'Evening posts (17:00–21:00 Kuala Lumpur time) have the highest median reach on Instagram: 402 views vs 297 in the afternoon and 212 at night. Evening also beats afternoon and night in 2025, and beats afternoon in 2026, so the result is not only a side-effect of topic. In 2026 only 5 posts went out in the morning or at night, too few to compare.' },
      { kind: 'observation', text: "TikTok's time-of-day differences are confounded with the day the account started getting views (20 Aug), so they are not used." },
    ],
  },
  duration: {
    strength: 'moderate',
    lines: [
      { kind: 'observation', text: 'On Instagram, 40–59s reels have the best balance: 373 median views and the highest engagement rate (25.9 per 1,000, 16 posts). Under-20s reels are weakest (206 views, 8.9 per 1,000). Most under-20s reels are 2025 quote reels, so topic and length overlap.' },
      { kind: 'observation', text: 'In 2026, 3 of the 5 reels over 60 seconds passed 13,000 views, but at a lower engagement rate (8 per 1,000). That is a promising but small sample.' },
    ],
  },
  topic: {
    strength: 'moderate',
    lines: [
      { kind: 'observation', text: 'AI-related Instagram posts have a median of 366 views and 26.9 engagements per 1,000; non-AI posts have 222 and 6.1. AI topics and the 2026 period coincide almost perfectly, so part of this gap may reflect account growth over time.' },
    ],
  },
  frequency: {
    strength: 'weak',
    lines: [
      { kind: 'observation', text: 'Instagram posts published within 3 hours of another post have a median of 274 views and 10.4 per 1,000, vs 318 and 13.8 for stand-alone posts. The gap is small and the direction is consistent, but it is not conclusive.' },
      { kind: 'observation', text: 'Several days had 3–4 posts, often within minutes (for example, 3 reels in 2 minutes on 8 Aug 2026). Two reels on 25 Sep 2025 reused the same caption one minute apart.' },
    ],
  },
}

export const hookNotes: Line[] = [
  { kind: 'observation', text: 'On Instagram, hooks sort into reach hooks and response hooks. Curiosity (median 3,603 views) and question (2,256) openers reach furthest but earn little (3.6 and 1.8 per 1,000). Problem (29.2) and benefit (21.4) openers earn the most engagement per view but reach about 270–345 views.' },
  { kind: 'observation', text: 'Bold claims are the house style (18 of 60 Instagram posts) and land in the middle: 232 median views, 18.7 per 1,000. Inspirational quotes are weakest on both measures (203 views, 3.3 per 1,000).' },
  { kind: 'hypothesis', text: 'Pairing a reach hook with a response ending, such as a question hook followed by a "comment your answer" prompt, may capture both. The top post already does something similar: a question plus a statistic plus stakes.' },
  { kind: 'observation', text: 'Hooks were classified from the caption\'s first line. The spoken or on-screen opening of each video may differ.' },
]

export interface Rec { title: string; detail: string; kind: Kind }

export const recommendations: {
  more: Rec[]
  less: Rec[]
  experiment: Rec[]
  hooks: Rec[]
  duration: Rec
  posting: Rec[]
  platformStrategy: { instagram: Rec[]; tiktok: Rec[] }
  nextFive: { n: number; platform: string; topic: string; hook: string; format: string; brief: string; measure: string }[]
} = {
  more: [
    { kind: 'observation', title: 'AI career-stakes posts built like the top reel', detail: '"Your boss is using AI…" combined a question, a statistic and a career-gap stakes line, and reached 37,463 views with 46 engagements per 1,000. Future-of-work posts have the #1 result and a 27.3 median rate on Instagram.' },
    { kind: 'observation', title: 'AI tool-choice comparisons', detail: 'Most consistent topic: 5 of 5 Instagram posts reached 187+ views at a 30.9 median rate, and it produced the best TikTok video (223 views, 2 saves).' },
    { kind: 'observation', title: 'Concrete, local class offers', detail: 'The Wisma Mont Kiara class post earned 11 comments, the most of any post, and 58.7 engagements per 1,000 views.' },
  ],
  less: [
    { kind: 'observation', title: 'Stand-alone quote and aphorism reels', detail: 'Quote hooks: 203 median views, 3.3 per 1,000 (7 posts). The October 2025 mindset series produced the four lowest-reach reels.' },
    { kind: 'observation', title: 'Stacking posts minutes apart', detail: 'Several days had 3–4 posts clustered together. Posts close to another post under-performed stand-alone posts on both reach and engagement.' },
    { kind: 'observation', title: 'Generic course promotion as the default post', detail: 'Course promotion is 19 of 80 posts. It engages per view, but a typical post is capped at about 300 views. Keep it as a minority of the mix.' },
    { kind: 'observation', title: 'Captions that are production notes', detail: 'Two Riyadh posts carry internal copy ("Vivid language that mirrors your stunning night visuals…", "Left side: Corporate you…"). Audit captions before publishing.' },
  ],
  experiment: [
    { kind: 'observation', title: 'Job security in the AI era', detail: 'The 2025 layoff and corporate-exit topic had the highest median reach of any Instagram topic with 5+ posts (2,256 views) but was dropped. Test it again with an AI-skills angle.' },
    { kind: 'observation', title: 'Longer AI explainers (60s+)', detail: '3 of 5 reels over 60 seconds in 2026 passed 13,000 views, but only 5 posts is not enough to be sure. Worth 2–3 more tests.' },
    { kind: 'hypothesis', title: 'Converting curiosity reach into response', detail: 'The quiz (6,805 views, 6 likes) and "Imagine an AI…" (37,449 views, 84 engagements) reels had the reach but not the response. Test the same hooks with an answer-in-comments ending.' },
  ],
  hooks: [
    { kind: 'observation', title: 'For reach: question or curiosity opener', detail: 'Median 2,256–3,603 views on Instagram (7 and 4 posts).' },
    { kind: 'observation', title: 'For response: problem or benefit opener', detail: '21–29 engagements per 1,000 views on Instagram (5 and 7 posts).' },
    { kind: 'hypothesis', title: 'Combine them', detail: 'Open with the question or curiosity line, name the cost in line 2, and end with a direct prompt.' },
  ],
  duration: { kind: 'observation', title: '40–59 seconds as the default; test 60–80s for explainers', detail: '40–59s had the best engagement rate (25.9 per 1,000) with solid reach. Under 20s was the weakest length on both measures.' },
  posting: [
    { kind: 'observation', title: 'Post in the evening (17:00–21:00 KL time)', detail: 'Highest median Instagram reach (402 views, 15 posts), and ahead of afternoon posts in both the 2025 and 2026 periods.' },
    { kind: 'observation', title: 'Space posts and keep a steady rhythm', detail: 'Only 17 of 56 weeks had any Instagram post. One post per slot, no same-hour stacking.' },
    { kind: 'general', title: 'Aim for 3–4 posts per week', detail: 'This is general practice, not derived from this dataset, which has too few steady weeks to identify an optimal frequency.' },
  ],
  platformStrategy: {
    instagram: [
      { kind: 'observation', title: 'Role: reach and lead generation', detail: 'It has the audience (2,254 followers) and the breakouts. Optimise for the reach-plus-engagement group by copying winner structures and adding response endings to curiosity hooks.' },
      { kind: 'observation', title: 'Measure the right thing', detail: 'Shares and saves are not visible publicly. Export them from Instagram Insights to complete the engagement picture.' },
    ],
    tiktok: [
      { kind: 'observation', title: 'Role: not yet established, so treat it as a restart', detail: '20 videos in 3 days, then 39 days of silence. The only traction came on the final day.' },
      { kind: 'hypothesis', title: 'Post natively and on a steady rhythm', detail: 'One video a day for 3 weeks, filmed or edited in TikTok, starting with the topics that already worked there (tool choice, the ROI story, "stop using AI like a search engine").' },
      { kind: 'general', title: 'Check account health first', detail: 'In TikTok Studio, confirm the zero-view videos are not flagged or restricted before posting more.' },
    ],
  },
  nextFive: [
    { n: 1, platform: 'Instagram', topic: 'AI & the future of work', hook: 'Question + statistic', format: '45–55s reel, evening KL', brief: 'Reuse the top-post structure: "Your team lead just automated half their week. Are you still doing it manually?" Then give one statistic, the career-gap stakes, and one concrete skill.', measure: 'Beat 300 views (median) and 13 engagements per 1,000.' },
    { n: 2, platform: 'Instagram', topic: 'Choosing the right AI tool', hook: 'Bold claim', format: '40–50s reel, save-worthy list', brief: '"ChatGPT is the wrong tool for 3 of these 5 jobs." Show a side-by-side for each job and end with "save this for your next project".', measure: 'Engagement per 1,000 views above 30.9 (the topic median).' },
    { n: 3, platform: 'Instagram', topic: 'AI how-to', hook: 'Curiosity + answer-first CTA', format: '50–60s quiz reel', brief: 'Rerun the AI vs agent vs agentic-AI quiz but hold the answer: "Comment A, B or C before the reveal."', measure: 'At least 10 comments. The original earned 0 on 6,805 views.' },
    { n: 4, platform: 'Instagram + TikTok', topic: 'Job security (retest)', hook: 'News / problem', format: '45–60s talking-head', brief: 'Bring back the 2025 layoff angle with AI: "Banks cut 3,500 jobs by email. Here is the one skill that makes you the person they keep."', measure: 'Instagram views vs the 2,256 median from the 2025 layoff posts; any TikTok view above 200.' },
    { n: 5, platform: 'TikTok', topic: 'Choosing the right AI tool', hook: 'Bold claim', format: 'Native TikTok upload, ~45s', brief: 'A new version of the best TikTok video ("Not all AI is built equal"), filmed natively, posted alone on a quiet day and followed by one post a day for a week.', measure: 'Median TikTok views for the week above 100 (currently 1).' },
  ],
}
