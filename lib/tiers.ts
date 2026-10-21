export type EducatorTier = 'bronze' | 'silver' | 'gold' | 'diamond' | 'legendary'

export const TIER_META: Record<
  EducatorTier,
  { label: string; range: string; blurb: string; min: number; max: number }
> = {
  bronze: {
    label: 'Bronze',
    range: '0 – 49',
    blurb: 'Starting recognition',
    min: 0,
    max: 49,
  },
  silver: {
    label: 'Silver',
    range: '50 – 69',
    blurb: 'Growing student support',
    min: 50,
    max: 69,
  },
  gold: {
    label: 'Gold',
    range: '70 – 84',
    blurb: 'Strong recognition',
    min: 70,
    max: 84,
  },
  diamond: {
    label: 'Diamond',
    range: '85 – 94',
    blurb: 'Exceptional student support',
    min: 85,
    max: 94,
  },
  legendary: {
    label: 'Legendary',
    range: '95 – 100',
    blurb: 'Elite recognition',
    min: 95,
    max: 100,
  },
}

/** Tier from the 0–100 Student Support score. */
export function assignTier(rtg: number): EducatorTier {
  const score = Math.max(0, Math.min(100, rtg))
  if (score >= 95) return 'legendary'
  if (score >= 85) return 'diamond'
  if (score >= 70) return 'gold'
  if (score >= 50) return 'silver'
  return 'bronze'
}

/** Overall RTG from the four performance pillars. */
export function computeRtg(metrics: {
  content: number
  teaching: number
  impact: number
  engagement: number
}): number {
  const avg =
    (clamp(metrics.content) +
      clamp(metrics.teaching) +
      clamp(metrics.impact) +
      clamp(metrics.engagement)) /
    4
  return Math.round(avg)
}

export function clamp(n: number, min = 0, max = 99): number {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : 0))
}

/** After a student vote, nudge engagement (+impact lightly) and recompute RTG. */
export function bumpMetricsAfterVote(input: {
  content: number
  teaching: number
  impact: number
  engagement: number
}): {
  content: number
  teaching: number
  impact: number
  engagement: number
  score: number
  tier: EducatorTier
} {
  const engagement = clamp(input.engagement + 0.35)
  const impact = clamp(input.impact + 0.12)
  const content = clamp(input.content)
  const teaching = clamp(input.teaching)
  const score = computeRtg({ content, teaching, impact, engagement })
  return {
    content: Number(content.toFixed(1)),
    teaching: Number(teaching.toFixed(1)),
    impact: Number(impact.toFixed(1)),
    engagement: Number(engagement.toFixed(1)),
    score,
    tier: assignTier(score),
  }
}
