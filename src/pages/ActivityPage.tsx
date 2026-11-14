import { useMemo, useState } from 'react'
import { Activity, CalendarDays, Filter } from 'lucide-react'
import { PageHeading, useDashboard } from '../App'
import { EventIcon } from '../components/Badges'
import { formatDate, timeAgo } from '../lib/format'

const labels: Record<string, string> = {
  capture: 'Lead captured', validation: 'Validation completed', ai_scoring: 'AI scoring',
  status_changed: 'Status changed', sales_stage_changed: 'Pipeline stage changed', follow_up: 'Follow-up',
}

export function ActivityPage() {
  const { organization, activities, leads, activitiesLoading, openLead } = useDashboard()
  const [filter, setFilter] = useState('all')
  const list = useMemo(() => filter === 'all' ? activities : activities.filter((item) => item.event_type === filter), [activities, filter])

  return <>
    <PageHeading eyebrow="WORKSPACE HISTORY" title="Activity" description="A chronological view of lead capture, qualification, pipeline changes, and follow-ups." actions={<div className="heading-count"><strong>{activities.length}</strong><span>events</span></div>} />
    <div className="activity-filter-bar"><div className="activity-filter-title"><Filter size={15} /><span>Filter activity</span></div><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter activity"><option value="all">All events</option><option value="capture">Lead captured</option><option value="validation">Validation</option><option value="ai_scoring">AI scoring</option><option value="sales_stage_changed">Stage changes</option><option value="follow_up">Follow-ups</option></select><span className="activity-scope">{organization.name} workspace</span></div>
    <div className="timeline-panel">
      {activitiesLoading ? <div className="feed-skeleton">{[0, 1, 2, 3, 4].map((item) => <div className="skeleton-row" key={item} />)}</div> : list.length === 0 ? <div className="table-empty"><div className="empty-icon"><Activity size={20} /></div><strong>No activity to show</strong><p>Events will appear here as the automation and sales team work leads.</p></div> : <div className="timeline-list">{list.map((activity, index) => {
        const lead = leads.find((candidate) => candidate.lead_id === activity.lead_id && candidate.source_table === activity.source_table)
        const detail = activity.details ?? {}
        return <div className="timeline-item" key={activity.id}>
          <div className="timeline-rail"><EventIcon eventType={activity.event_type} />{index < list.length - 1 && <span />}</div>
          <div className="timeline-content"><div className="timeline-line"><strong>{labels[activity.event_type] ?? activity.event_type}</strong><span title={formatDate(activity.created_at, 'MMM d, yyyy h:mm a')}>{timeAgo(activity.created_at)}</span></div><p><button className="inline-lead-link" disabled={!lead} onClick={() => lead && openLead(lead)}>{lead?.name ?? 'Lead'}{lead?.business ? ` · ${lead.business}` : ''}</button> {activity.event_type === 'sales_stage_changed' ? <span className="timeline-detail">{String(detail.from ?? 'New')} <b>→</b> {String(detail.to ?? '')}</span> : activity.event_type === 'ai_scoring' ? <span className="timeline-detail">Score {String(detail.score ?? '—')}/100 · {String(detail.category ?? 'AI reviewed')}</span> : activity.event_type === 'validation' ? <span className="timeline-detail">{detail.result === 'failed' ? `${String(detail.validation_error_count ?? 0)} validation issue(s)` : 'Passed validation'}</span> : activity.event_type === 'follow_up' ? <span className="timeline-detail">{String(detail.note ?? 'Follow-up recorded')}</span> : null}</p><div className="timeline-meta"><CalendarDays size={12} />{formatDate(activity.created_at, 'EEEE, MMM d · h:mm a')}<span>·</span><span>{activity.source_table.replace('_leads', '')}</span></div></div>
        </div>
      })}</div>}
    </div>
  </>
}
