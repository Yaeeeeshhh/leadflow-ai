import { ArrowRight, CalendarClock, UserRound } from 'lucide-react'
import { useDashboard } from '../App'
import { formatDate, timeAgo } from '../lib/format'
import type { LeadActivity } from '../types'
import { EventIcon } from './Badges'

const eventCopy: Record<string, string> = {
  capture: 'Lead captured',
  validation: 'Validation completed',
  ai_scoring: 'AI qualification completed',
  status_changed: 'Status updated',
  sales_stage_changed: 'Sales stage changed',
  follow_up: 'Follow-up added',
}

function eventDescription(activity: LeadActivity) {
  const details = activity.details ?? {}
  if (activity.event_type === 'sales_stage_changed') {
    return `${String(details.from ?? 'New lead')} → ${String(details.to ?? '')}`
  }
  if (activity.event_type === 'status_changed') {
    return `${String(details.from ?? '—')} → ${String(details.to ?? '')}`
  }
  if (activity.event_type === 'validation') {
    return details.result === 'failed' ? 'Submission needs attention' : 'Contact details passed validation'
  }
  if (activity.event_type === 'ai_scoring') {
    const score = details.score
    return score == null ? 'Lead evaluated by AI' : `AI assigned a score of ${score}/100`
  }
  if (activity.event_type === 'follow_up') return String(details.note ?? 'Follow-up recorded')
  return 'Added to your workspace'
}

export function ActivityFeed({ items, compact = false, loading = false, limit }: { items: LeadActivity[]; compact?: boolean; loading?: boolean; limit?: number }) {
  const { leads, openLead } = useDashboard()
  const visibleItems = limit ? items.slice(0, limit) : items
  if (loading) return <div className="feed-skeleton">{[0, 1, 2].map((item) => <div className="skeleton-row" key={item} />)}</div>
  if (!visibleItems.length) return <div className="feed-empty"><CalendarClock size={19} /><span>No activity yet. New lead events will show up here.</span></div>

  return <div className={`activity-feed ${compact ? 'activity-feed-compact' : ''}`}>
    {visibleItems.map((item) => {
      const lead = leads.find((candidate) => candidate.lead_id === item.lead_id && candidate.source_table === item.source_table)
      return <button className="activity-row" key={item.id} onClick={() => lead && openLead(lead)} disabled={!lead}>
        <EventIcon eventType={item.event_type} />
        <div className="activity-body"><div className="activity-title"><strong>{eventCopy[item.event_type] ?? item.event_type}</strong><span>{timeAgo(item.created_at)}</span></div><p>{lead?.name ?? 'Lead'} <span className="activity-separator">·</span> {eventDescription(item)}</p></div>
        {!compact && <ArrowRight className="activity-arrow" size={15} />}
      </button>
    })}
  </div>
}

export function ActivityMeta({ activity }: { activity: LeadActivity }) {
  return <div className="activity-meta"><UserRound size={13} /><span>{activity.source_table.replace('_leads', '')}</span><span>·</span><span>{formatDate(activity.created_at, 'MMM d, h:mm a')}</span></div>
}
