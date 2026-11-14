import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Building2, CalendarDays, ChevronRight, CircleDollarSign, ExternalLink, Mail, MessageSquareText, Pencil, Phone, Sparkles, Trash2, X } from 'lucide-react'
import { ActivityMeta } from './ActivityFeed'
import { EventIcon } from './Badges'
import { StageSelect } from './StageSelect'
import { addFollowUp, deleteOrganizationLead, setLeadStage } from '../lib/data'
import { formatCurrency, formatDate } from '../lib/format'
import { leadMutationError } from '../lib/errors'
import { supabase } from '../lib/supabase'
import type { Lead, LeadActivity, Organization, SalesStage } from '../types'
import { DeleteLeadDialog, LeadFormDialog } from './LeadManagementDialogs'

export function LeadDetailDrawer({ lead, organization, activities, leads, onClose }: {
  lead: Lead
  organization: Organization
  activities: LeadActivity[]
  leads: Lead[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const canManageLeads = ['owner', 'admin'].includes(organization.role)

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.classList.add('drawer-open')
    return () => { window.removeEventListener('keydown', onKey); document.body.classList.remove('drawer-open') }
  }, [onClose])

  const leadActivities = useMemo(() => activities.filter((item) => item.lead_id === lead.lead_id && item.source_table === lead.source_table), [activities, lead])
  const followupMutation = useMutation({
    mutationFn: (message: string) => addFollowUp(lead, organization.id, message),
    onSuccess: () => {
      setNote(''); setNotice('Follow-up added to the timeline.'); setNoteError('')
      void queryClient.invalidateQueries({ queryKey: ['activities', organization.id] })
    },
    onError: (error) => setNoteError(error instanceof Error ? error.message : 'Could not add follow-up.'),
  })
  const stageMutation = useMutation({
    mutationFn: (stage: SalesStage) => setLeadStage(lead, organization.id, stage),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['leads', organization.id] }),
        queryClient.invalidateQueries({ queryKey: ['activities', organization.id] }),
      ])
      setNotice('Sales stage updated.')
    },
  })
  const deleteMutation = useMutation({
    mutationFn: () => deleteOrganizationLead(lead),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['leads', organization.id] }),
        queryClient.invalidateQueries({ queryKey: ['activities', organization.id] }),
      ])
      setConfirmDelete(false)
      onClose()
    },
    onError: (cause) => setDeleteError(leadMutationError(cause, 'deleted')),
  })

  const diagnostics = useQuery({
    queryKey: ['failed-diagnostics', organization.id, lead.lead_id],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase configuration is missing.')
      const { data, error } = await supabase.rpc('get_failed_lead_diagnostics', { target_org_id: organization.id })
      if (error) throw error
      return (data ?? []).find((row: { lead_id: string }) => row.lead_id === lead.lead_id) as { validation_errors: unknown } | undefined
    },
    enabled: lead.qualification_outcome === 'failed' && ['owner', 'admin'].includes(organization.role),
    retry: false,
  })

  const sortedActivities = [...leadActivities].sort((a, b) => b.created_at.localeCompare(a.created_at))

  return <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <aside className="lead-drawer" role="dialog" aria-modal="true" aria-labelledby="lead-detail-title">
      <header className="drawer-header"><div><div className="eyebrow">LEAD PROFILE</div><span className="drawer-record-id">{lead.source_table.replace('_leads', '').toUpperCase()} · {lead.lead_id.slice(0, 8)}</span></div><div className="drawer-header-actions">{canManageLeads && <><button className="button button-secondary button-small" onClick={() => setEditing(true)}><Pencil size={14} />Edit</button><button className="icon-button danger-icon-button" onClick={() => { setDeleteError(''); setConfirmDelete(true) }} aria-label="Delete lead"><Trash2 size={16} /></button></>}<button className="icon-button" onClick={onClose} aria-label="Close lead details"><X size={19} /></button></div></header>
      <div className="drawer-scroll">
        <section className="detail-hero"><div className="detail-avatar">{(lead.name?.[0] ?? '?').toUpperCase()}</div><div><h2 id="lead-detail-title">{lead.name || 'Unnamed lead'}</h2><div className="detail-company"><Building2 size={14} />{lead.business || 'Business not provided'}</div></div></section>
        <div className="detail-badges"><span className={`status-badge badge-${lead.qualification_outcome}`}>{lead.qualification_outcome}</span>{lead.ai_score != null && <span className="score-pill score-neutral"><Sparkles size={12} />AI score {lead.ai_score}/100</span>}</div>

        <section className="detail-section"><div className="detail-section-title"><span>Sales pipeline</span><span className="detail-section-hint">Independent of AI qualification</span></div><StageSelect value={lead.sales_stage} onChange={(stage) => stageMutation.mutateAsync(stage)} /></section>

        <section className="detail-section"><h3>Contact information</h3><div className="contact-list">
          {lead.email ? <a href={`mailto:${lead.email}`}><span className="contact-icon"><Mail size={14} /></span><span><small>Email</small><strong>{lead.email}</strong></span><ExternalLink size={13} /></a> : <div className="contact-missing"><Mail size={14} />Email not provided</div>}
          {lead.phone ? <a href={`tel:${lead.phone}`}><span className="contact-icon"><Phone size={14} /></span><span><small>Phone</small><strong>{lead.phone}</strong></span><ExternalLink size={13} /></a> : <div className="contact-missing"><Phone size={14} />Phone not provided</div>}
          <div className="contact-data-row"><span className="contact-icon"><CircleDollarSign size={14} /></span><span><small>Budget</small><strong>{formatCurrency(lead.budget)}</strong></span></div>
          <div className="contact-data-row"><span className="contact-icon"><CalendarDays size={14} /></span><span><small>Captured</small><strong>{formatDate(lead.created_at, 'MMM d, yyyy · h:mm a')}</strong></span></div>
        </div></section>

        {lead.ai_reason && <section className="ai-reason-card"><div className="ai-card-heading"><span><Sparkles size={15} /></span><div><h3>AI qualification</h3><small>{lead.ai_category ? `${lead.ai_category} lead` : 'Reasoning'}</small></div>{lead.ai_score != null && <strong>{lead.ai_score}<small>/100</small></strong>}</div><p>{lead.ai_reason}</p>{lead.recommended_action && <div className="recommended-action"><strong>Recommended next step</strong><span>{lead.recommended_action}</span></div>}</section>}

        {lead.error_message && <section className="failed-reason-card"><div><AlertTriangle size={16} /><strong>Processing error</strong></div><p>{lead.error_message}</p></section>}

        {lead.qualification_outcome === 'failed' && ['owner', 'admin'].includes(organization.role) && <section className="detail-section diagnostics-section"><h3>Validation diagnostics <span className="admin-only-tag">Admin only</span></h3>{diagnostics.isLoading ? <p className="muted">Loading restricted diagnostics…</p> : diagnostics.isError ? <p className="diagnostic-error">{diagnostics.error.message}</p> : <ValidationErrors value={diagnostics.data?.validation_errors} />}</section>}

        {lead.message && <section className="detail-section"><h3>Lead message</h3><div className="lead-message"><MessageSquareText size={15} /><p>{lead.message}</p></div></section>}

        <section className="detail-section timeline-section"><div className="detail-section-title"><h3>Activity timeline</h3><span className="timeline-count">{sortedActivities.length}</span></div>
          {sortedActivities.length ? <div className="lead-timeline">{sortedActivities.map((activity, index) => <div className="lead-timeline-item" key={activity.id}><div className="timeline-rail"><EventIcon eventType={activity.event_type} />{index < sortedActivities.length - 1 && <span />}</div><div className="lead-timeline-copy"><strong>{activityLabel(activity)}</strong><p>{activityDescription(activity)}</p><ActivityMeta activity={activity} /></div></div>)}</div> : <p className="muted">No timeline events are available for this lead yet.</p>}
        </section>

        <section className="followup-box"><h3>Add a follow-up</h3><textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} placeholder="Add a note about your next action…" rows={3} /><div className="followup-footer"><span>{notice || noteError || 'Visible to members of this workspace'}</span><button className="button button-primary button-small" disabled={!note.trim() || followupMutation.isPending} onClick={() => followupMutation.mutate(note.trim())}>{followupMutation.isPending ? 'Saving…' : 'Add note'}</button></div></section>
      </div>
    </aside>
    {editing && <LeadFormDialog organization={organization} leads={leads} lead={lead} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); void queryClient.invalidateQueries({ queryKey: ['leads', organization.id] }); void queryClient.invalidateQueries({ queryKey: ['activities', organization.id] }); onClose() }} />}
    {confirmDelete && <DeleteLeadDialog lead={lead} organizationName={organization.name} busy={deleteMutation.isPending} error={deleteError} onCancel={() => setConfirmDelete(false)} onConfirm={() => { setDeleteError(''); deleteMutation.mutate() }} />}
  </div>
}

function ValidationErrors({ value }: { value: unknown }) {
  if (!Array.isArray(value) || value.length === 0) return <p className="muted">No validation details available.</p>
  return <ul className="validation-list">{value.map((error, index) => <li key={index}><ChevronRight size={13} />{String(error)}</li>)}</ul>
}

function activityLabel(activity: LeadActivity) {
  const labels: Record<string, string> = {
    capture: 'Lead captured', validation: 'Validation completed', ai_scoring: 'AI scoring completed',
    status_changed: 'Status changed', sales_stage_changed: 'Sales stage updated', follow_up: 'Follow-up added',
  }
  return labels[activity.event_type] ?? activity.event_type
}

function activityDescription(activity: LeadActivity) {
  const details = activity.details ?? {}
  if (activity.event_type === 'sales_stage_changed' || activity.event_type === 'status_changed') return `${String(details.from ?? '—')} → ${String(details.to ?? '')}`
  if (activity.event_type === 'validation') return details.result === 'failed' ? `${String(details.validation_error_count ?? 0)} issue(s) found` : 'Passed validation checks'
  if (activity.event_type === 'ai_scoring') return `Score ${String(details.score ?? '—')}/100 · ${String(details.category ?? 'reviewed')}`
  if (activity.event_type === 'follow_up') return String(details.note ?? 'Follow-up recorded')
  return 'Added to the organization workspace'
}
