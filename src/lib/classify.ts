/**
 * Fallback keyword rules for posts that are not in annotations.json (e.g. after a data refresh).
 * The existing 80 posts were classified by hand; these rules only keep new posts from going unlabelled.
 */

const TOPIC_RULES: [string, RegExp][] = [
  ['course-promo', /\b(ainchors (courses?|teaches|delivers|shows)|class|course|corporate training|dm ["“]?team|link in bio)\b/i],
  ['ai-tool-choice', /\b(right (ai|one|stack)|free ai|wrong ai|not all ai|which ai|chatgpt vs|tool(s)? for)\b/i],
  ['ai-how-to', /\b(prompt|habit|agent|how to|framework|quiz|difference between|techniques?)\b/i],
  ['ai-future-of-work', /\b(ai (literacy|skills?)|your job|future of work|2026|career|highest-paid|already here)\b/i],
  ['corporate-escape', /\b(9-?5|redundan|laid off|layoff|retrench|corporate job|boss)\b/i],
  ['work-life-balance', /\b(balance|busy|lifestyle|burn ?out)\b/i],
  ['travel-bts', /\b(gitex|riyadh|dubai|abu dhabi|trip|travel|behind the scenes|pov)\b/i],
  ['personal-seasonal', /\b(festival|christmas|new year|ramadan|eid|my (dad|mum|mom|family))\b/i],
  ['mindset', /\b(comfort zone|growth|dream|mindset|motivat|inspir|future self|success)\b/i],
]

export function classifyTopic(caption: string): string {
  for (const [id, re] of TOPIC_RULES) if (re.test(caption)) return id
  return /\bai\b/i.test(caption) ? 'ai-future-of-work' : 'mindset'
}

export function firstLine(caption: string): string {
  return caption.trim().split('\n')[0].replace(/^["“”']+|["“”']+$/g, '').trim()
}

export function classifyHook(caption: string): string {
  const line = firstLine(caption)
  if (!line || /^#/.test(line)) return 'no-hook'
  if (/^(imagine|pov|quick quiz)/i.test(line)) return 'curiosity'
  if (/^(i |i'm|my |today,? i|walking)/i.test(line)) return 'personal-story'
  if (/\b\d+(\.\d+)?%|\b(recently|reports?|in 20\d\d)\b/i.test(line)) return 'news-trend'
  if (/\b(wasting|mistake|costing|still spending|struggl|stressed|anxious)\b/i.test(line)) return 'problem'
  if (/^\d+ |\b\d+x\b|\bwill make you\b|\bcan help\b/i.test(line)) return 'benefit'
  if (/\?\s*$/.test(line) || /^(do|are|is|what|why|how|can|would)\b/i.test(line)) return 'question'
  if (/\b(most people|not|isn't|stop|never|wrong|truth)\b/i.test(line)) return 'bold-claim'
  return 'quote'
}
