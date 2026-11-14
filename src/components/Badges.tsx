import { Activity, CheckCircle2, CircleAlert, Flame, Snowflake, Sun } from 'lucide-react'
import type { LeadOutcome, SalesStage } from '../types'

export function OutcomeBadge({ outcome }: { outcome: LeadOutcome }) {
  const meta = {
    qualified: { label: 'Qualified', icon: CheckCircle2, cls: 'badge-qualified' },
    unqualified: { label: 'Unqualified', icon: CircleAlert, cls: 'badge-unqualified' },
    failed: { label: 'Failed', icon: CircleAlert, cls: 'badge-failed' },
  }[outcome]
  const Icon = meta.icon
  return <span className={`status-badge ${meta.cls}`}><Icon size={12} />{meta.label}</span>
}

export function StageBadge({ stage }: { stage: SalesStage }) {
  return <span className={`stage-badge stage-${stage.toLowerCase()}`}>{stage}</span>
}

export function ScoreBadge({ score, category }: { score: number | null; category?: string | null }) {
  if (score == null) return <span className="muted">—</span>
  const Icon = score >= 75 ? Flame : score >= 50 ? Sun : Snowflake
  return <span className={`score-pill ${score >= 75 ? 'score-hot' : score >= 50 ? 'score-warm' : 'score-cold'}`} title={category ?? `AI score ${score}`}><Icon size={12} />{score}<small>/100</small></span>
}

export function EventIcon({ eventType }: { eventType: string }) {
  if (eventType.includes('scoring')) return <span className="event-icon event-ai"><Activity size={14} /></span>
  if (eventType.includes('validation')) return <span className="event-icon event-validate"><CheckCircle2 size={14} /></span>
  if (eventType.includes('stage')) return <span className="event-icon event-stage"><Activity size={14} /></span>
  if (eventType.includes('follow')) return <span className="event-icon event-follow"><Activity size={14} /></span>
  return <span className="event-icon event-capture"><CircleAlert size={14} /></span>
}
