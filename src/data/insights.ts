/**
 * Written analysis (headline, commentary, recommendations).
 *
 * The content lives in insights.json so the refresh pipeline can regenerate it:
 * scripts/ai_refresh.py asks the local Ollama model to rewrite it from the freshly computed metrics
 * and rejects any version that contains a number not found in those metrics.
 * All numbers in charts and stat cards are computed live from social-data.json, not taken from here.
 */
import type { QuadrantId } from '../lib/types'
import raw from './insights.json'

type Kind = 'observation' | 'hypothesis' | 'general'
export interface Line { kind: Kind; text: string }
export interface Rec { title: string; detail: string; kind: Kind }
type Strength = 'moderate' | 'weak' | 'insufficient'

export interface Insights {
  basedOnCollectedAt: string
  generatedBy: string
  headline: { title: string; platformTitle: string; platformIntro: string }
  executiveSummary: string[]
  platformNarrative: { instagram: Line[]; tiktok: Line[]; differences: Line[] }
  postNotes: Record<string, Line[]>
  topicNotes: Record<string, string>
  quadrantNotes: Record<QuadrantId, { interpretation: string; action: string }>
  patternNotes: Record<'day' | 'time' | 'duration' | 'topic' | 'frequency', { strength: Strength; lines: Line[] }>
  hookNotes: Line[]
  recommendations: {
    more: Rec[]
    less: Rec[]
    experiment: Rec[]
    hooks: Rec[]
    duration: Rec
    posting: Rec[]
    platformStrategy: { instagram: Rec[]; tiktok: Rec[] }
    nextFive: { n: number; platform: string; topic: string; hook: string; format: string; brief: string; measure: string }[]
  }
}

const insights = raw as Insights

export const BASED_ON_COLLECTED_AT = insights.basedOnCollectedAt
export const GENERATED_BY = insights.generatedBy
export const headline = insights.headline
export const executiveSummary = insights.executiveSummary
export const platformNarrative = insights.platformNarrative
export const postNotes = insights.postNotes
export const topicNotes = insights.topicNotes
export const quadrantNotes = insights.quadrantNotes
export const patternNotes = insights.patternNotes
export const hookNotes = insights.hookNotes
export const recommendations = insights.recommendations
