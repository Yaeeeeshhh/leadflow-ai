import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CalendarClock, Check, CheckCheck, Clipboard, Clock3, LoaderCircle, MessageSquareText, RotateCcw, Sparkles, X } from 'lucide-react'
import { PageHeading, useDashboard } from '../App'
import { getLeadFollowUps, setLeadFollowUpStatus } from '../lib/data'
import { formatDate } from '../lib/format'
import type { Lead, LeadFollowUp, LeadFollowUpStatus } from '../types'

type FollowUpFilter = 'all' | LeadFollowUpStatus
type Notice = { kind: 'success' | 'error'; message: string }
type ReviewVariables = { followUpId: string; status: 'approved' | 'skipped' }
type ReviewResult = Pick<LeadFollowUp, 'id' | 'organization_id' | 'status'>

const filters: { value: FollowUpFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Scheduled' },
  { value: 'draft', label: 'Pending approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'skipped', label: 'Rejected' },
  { value: 'sent', label: 'Sent' },
  { value: 'cancelled', label: 'Cancelled' },
]

const statusLabels: Record<LeadFollowUpStatus, string> = {
  pending: 'Scheduled',
  draft: 'Pending approval',
  approved: 'Approved',
  sent: 'Sent',
  skipped: 'Rejected',
  cancelled: 'Cancelled',
}

const statusOrder: LeadFollowUpStatus[] = ['draft', 'pending', 'approved', 'sent', 'skipped', 'cancelled']

export function FollowUpsPage() {
  const { organization, leads, openLead } = useDashboard()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<FollowUpFilter>('all')
  const [notice, setNotice] = useState<Notice | null>(null)

  const followUpsQuery = useQuery({
    queryKey: ['followups', organization.id],
    queryFn: () => getLeadFollowUps(organization.id),
    enabled: Boolean(organization.id),
    refetchInterval: 30_000,
  })
  const followUps = followUpsQuery.data ?? []
  const draftsCount = followUps.filter((followUp: LeadFollowUp) => followUp.status === 'draft').length
  const visibleFollowUps = useMemo(
    () => filter === 'all' ? followUps : followUps.filter((followUp: LeadFollowUp) => followUp.status === filter),
    [filter, followUps],
  )
  const visibleGroups = useMemo(() => {
    const statuses = filter === 'all' ? statusOrder : [filter]
    return statuses.flatMap((status) => {
      const records = visibleFollowUps.filter((followUp: LeadFollowUp) => followUp.status === status)
      return records.length ? [{ status, records }] : []
    })
  }, [filter, visibleFollowUps])

  const reviewMutation = useMutation<ReviewResult, Error, ReviewVariables>({
    mutationFn: ({ followUpId, status }: { followUpId: string; status: 'approved' | 'skipped' }) =>
      setLeadFollowUpStatus(organization.id, followUpId, status),
    onSuccess: (updated: ReviewResult, variables: ReviewVariables) => {
      queryClient.setQueryData<LeadFollowUp[]>(['followups', organization.id], (current: LeadFollowUp[] | undefined) =>
        current?.map((followUp: LeadFollowUp) => followUp.id === updated.id
          ? { ...followUp, status: updated.status }
          : followUp),
      )
      setNotice({
        kind: 'success',
        message: variables.status === 'approved' ? 'Follow-up approved.' : 'Follow-up rejected.',
      })
    },
    onError: (error: Error) => {
      void queryClient.invalidateQueries({ queryKey: ['followups', organization.id] })
      setNotice({ kind: 'error', message: error.message || 'The follow-up could not be updated.' })
    },
  })

  async function copyEmail(followUp: LeadFollowUp) {
    const subject = followUp.email_subject?.trim()
    const body = followUp.email_body?.trim()
    if (!subject || !body) return
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`)
      setNotice({ kind: 'success', message: 'Email subject and body copied to clipboard.' })
    } catch {
      setNotice({ kind: 'error', message: 'Clipboard access is unavailable in this browser.' })
    }
  }

  function review(followUp: LeadFollowUp, status: 'approved' | 'skipped') {
    if (followUp.status !== 'draft' || reviewMutation.isPending) return
    setNotice(null)
    reviewMutation.mutate({ followUpId: followUp.id, status })
  }

  return <>
    <PageHeading
      eyebrow="AI FOLLOW-UP REVIEW"
      title="Follow-ups"
      description="Review AI-drafted messages before they move forward in your follow-up workflow."
      actions={<div className="heading-count"><strong>{followUps.length}</strong><span>follow-ups</span></div>}
    />

    <section className={`followup-queue-banner ${draftsCount ? 'followup-queue-active' : ''}`} aria-label="Follow-up approval queue">
      <div className="followup-queue-icon"><Sparkles size={19} /></div>
      <div className="followup-queue-copy">
        <strong>{draftsCount ? `${draftsCount} draft${draftsCount === 1 ? '' : 's'} awaiting your approval` : 'Approval queue is clear'}</strong>
        <span>{draftsCount ? 'Review the message and AI reasoning before approving or rejecting it.' : 'New AI-generated drafts will appear here for review.'}</span>
      </div>
      <span className="followup-queue-count">{draftsCount}<small>to review</small></span>
    </section>

    {notice && <div className={`followup-notice followup-notice-${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
      {notice.kind === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}{notice.message}
      <button className="icon-button" aria-label="Dismiss notification" onClick={() => setNotice(null)}><X size={15} /></button>
    </div>}

    <section className="followup-panel">
      <div className="followup-toolbar">
        <div><h2>{filter === 'all' ? 'All follow-ups' : statusLabels[filter]}</h2><p>{filter === 'all' ? 'Records are separated by status. Only drafts are AI-generated messages awaiting approval.' : filter === 'pending' ? 'Scheduled follow-ups waiting for the workflow to process them.' : filter === 'draft' ? 'AI-generated messages waiting for your review.' : 'Follow-ups in this status.'}</p></div>
        <div className="followup-filters" role="group" aria-label="Filter follow-ups by status">
          {filters.map((option) => {
            const count = option.value === 'all' ? followUps.length : followUps.filter((followUp: LeadFollowUp) => followUp.status === option.value).length
            return <button key={option.value} type="button" className={`followup-filter ${filter === option.value ? 'followup-filter-active' : ''}`} aria-pressed={filter === option.value} onClick={() => setFilter(option.value)}>
              {option.label}<span>{count}</span>
            </button>
          })}
        </div>
      </div>

      {followUpsQuery.isLoading ? <div className="followup-loading" aria-label="Loading follow-ups">{[0, 1].map((item) => <div className="followup-skeleton" key={item} />)}</div>
        : followUpsQuery.isError ? <div className="followup-empty followup-empty-error">
          <div className="followup-empty-icon"><AlertCircle size={20} /></div><strong>Couldn’t load follow-ups</strong><p>{followUpsQuery.error.message}</p>
          <button className="button button-secondary" onClick={() => void followUpsQuery.refetch()}><RotateCcw size={14} />Try again</button>
        </div>
          : visibleFollowUps.length === 0 ? <div className="followup-empty">
            <div className="followup-empty-icon"><MessageSquareText size={20} /></div>
            <strong>{filter === 'draft' ? 'No drafts awaiting approval' : filter === 'pending' ? 'No scheduled follow-ups' : filter === 'all' ? 'No follow-ups yet' : `No ${statusLabels[filter].toLowerCase()} follow-ups`}</strong>
            <p>{filter === 'draft' ? 'You’re all caught up. AI-generated drafts will appear here after the workflow processes a scheduled follow-up.' : filter === 'pending' ? 'No follow-ups are waiting for workflow processing.' : 'Try another status filter or check back when your workflow creates follow-ups.'}</p>
            {filter !== 'all' && <button className="button button-secondary" onClick={() => setFilter('all')}>View all follow-ups</button>}
          </div> : <div className="followup-groups">{visibleGroups.map((group) => <section className={`followup-status-group followup-status-group-${group.status}`} key={group.status}>
            <header><h3>{statusLabels[group.status]}{group.status === 'pending' ? ' · Not yet processed' : group.status === 'draft' ? ' · AI drafts' : ''}</h3><span>{group.records.length}</span></header>
            <div className="followup-list">{group.records.map((followUp: LeadFollowUp) => {
            const lead = leads.find((candidate: Lead) => candidate.source_table === 'leads' && candidate.lead_id === followUp.lead_id)
            const isDraft = followUp.status === 'draft'
            const isPending = followUp.status === 'pending'
            const isUpdating = reviewMutation.isPending && reviewMutation.variables?.followUpId === followUp.id
            const emailSubject = followUp.email_subject?.trim() ?? ''
            const emailBody = followUp.email_body?.trim() ?? ''
            const hasEmailContent = Boolean(emailSubject && emailBody)
            const emailHeading = followUp.status === 'draft' ? 'AI-generated email' : followUp.status === 'approved' ? 'Approved email' : followUp.status === 'sent' ? 'Sent email' : followUp.status === 'skipped' ? 'Rejected email draft' : 'Follow-up email'
            return <article className={`followup-card ${isDraft ? 'followup-card-draft' : ''}`} key={followUp.id}>
              {isDraft && <div className="followup-card-accent" />}
              <div className="followup-card-head">
                <div className="followup-lead-heading">
                  <div className="followup-avatar">{lead?.name?.trim().slice(0, 1).toUpperCase() || 'L'}</div>
                  <div>
                    {lead ? <button type="button" className="followup-lead-link" onClick={() => openLead(lead)}>{lead.name || 'Unnamed lead'}<span>Open lead details</span></button> : <strong className="followup-lead-name">Lead details unavailable</strong>}
                    <div className="followup-contact">{lead?.email || 'No email'}{lead?.phone ? <><span>·</span>{lead.phone}</> : null}</div>
                  </div>
                </div>
                <span className={`followup-status followup-status-${followUp.status}`}><span />{statusLabels[followUp.status] ?? followUp.status}</span>
              </div>

              <div className="followup-meta-row">
                <span><MessageSquareText size={14} />Follow-up #{followUp.followup_number}</span>
                <span><CalendarClock size={14} />Scheduled {formatDate(followUp.scheduled_at, 'MMM d, yyyy · h:mm a')}</span>
                {followUp.sent_at && <span><Clock3 size={14} />Sent {formatDate(followUp.sent_at, 'MMM d, yyyy · h:mm a')}</span>}
              </div>

              {isPending ? <div className="followup-pending-note"><Clock3 size={15} /><span>This follow-up is scheduled and has not been processed into an AI draft yet.</span></div>
                : <section className="followup-message-section followup-email-section" aria-label={emailHeading}>
                  <div className="followup-section-title"><div><span className="followup-section-icon"><MessageSquareText size={14} /></span><h3>{emailHeading}</h3></div>
                    {hasEmailContent && <button className="button button-secondary button-small" type="button" onClick={() => void copyEmail(followUp)}><Clipboard size={14} />Copy email</button>}
                  </div>
                  {hasEmailContent ? <>
                    <div className="followup-email-subject"><strong>Email subject</strong><p>{followUp.email_subject}</p></div>
                    <div className="followup-email-body"><strong>Email body</strong><p>{followUp.email_body}</p></div>
                  </> : <div className="followup-email-missing">Email content not generated</div>}
                </section>}

              {!isPending && followUp.agent_reason && <section className="followup-reason"><span><Sparkles size={14} />AI reasoning</span><p>{followUp.agent_reason}</p></section>}

              {isDraft && <div className="followup-actions">
                <span>{hasEmailContent ? 'Approval authorizes this email to proceed through the Gmail workflow; it does not send it from this page.' : 'Email content not generated. This draft cannot be approved.'}</span>
                <div>
                  <button type="button" className="button button-secondary" disabled={reviewMutation.isPending} onClick={() => review(followUp, 'skipped')}><X size={15} />Reject</button>
                  <button type="button" className="button button-primary" disabled={reviewMutation.isPending || !hasEmailContent} onClick={() => review(followUp, 'approved')}>
                    {isUpdating ? <LoaderCircle className="spin" size={15} /> : <CheckCheck size={15} />}{isUpdating ? 'Saving…' : 'Approve email'}
                  </button>
                </div>
              </div>}
            </article>
          })}</div>
          </section>)}</div>}
    </section>
  </>
}
