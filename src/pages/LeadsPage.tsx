import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Filter, Plus } from 'lucide-react'
import { PageHeading, useDashboard } from '../App'
import { LeadTable } from '../components/LeadTable'
import { LeadFormDialog } from '../components/LeadManagementDialogs'
import { useStageMutation } from '../hooks/useLeadActions'
import type { LeadOutcome } from '../types'
import { useLocation } from 'react-router-dom'

const pageMeta: Record<string, { title: string; description: string; outcome?: LeadOutcome }> = {
  '/leads': { title: 'All leads', description: 'Search, review, and manage every lead in your workspace.' },
  '/qualified': { title: 'Qualified leads', description: 'Prospects that passed validation and AI qualification.', outcome: 'qualified' },
  '/unqualified': { title: 'Unqualified leads', description: 'AI-reviewed leads that did not meet your qualification criteria.', outcome: 'unqualified' },
  '/failed': { title: 'Failed submissions', description: 'Submissions that need attention due to validation or processing issues.', outcome: 'failed' },
}

export function LeadsPage({ forcedOutcome }: { forcedOutcome?: LeadOutcome }) {
  const location = useLocation()
  const { organization, leads, leadsLoading, openLead } = useDashboard()
  const queryClient = useQueryClient()
  const [addingLead, setAddingLead] = useState(false)
  const page = pageMeta[location.pathname] ?? pageMeta['/leads']
  const outcome = forcedOutcome ?? page.outcome
  const visibleLeads = useMemo(() => outcome ? leads.filter((lead) => lead.qualification_outcome === outcome) : leads, [leads, outcome])
  const mutation = useStageMutation(organization.id)

  return <>
    <PageHeading eyebrow="LEAD MANAGEMENT" title={page.title} description={page.description} actions={<div className="lead-heading-actions"><div className="heading-count"><strong>{visibleLeads.length}</strong><span>records</span></div>{location.pathname === '/leads' && ['owner', 'admin'].includes(organization.role) && <button className="button button-primary" onClick={() => setAddingLead(true)}><Plus size={16} />Add lead</button>}</div>} />
    <div className="list-intro"><div className="list-intro-icon"><Filter size={16} /></div><span>Data is scoped to <strong>{organization.name}</strong> and protected by organization RLS.</span><span className="list-intro-live"><span />Real Supabase data</span></div>
    <LeadTable key={location.pathname} leads={visibleLeads} loading={leadsLoading} openLead={openLead} onStageChange={async (lead, stage) => mutation.mutateAsync({ lead, stage })} forcedOutcome={outcome} />
    {addingLead && <LeadFormDialog organization={organization} leads={leads} onClose={() => setAddingLead(false)} onSaved={() => { setAddingLead(false); void queryClient.invalidateQueries({ queryKey: ['leads', organization.id] }); void queryClient.invalidateQueries({ queryKey: ['activities', organization.id] }) }} />}
  </>
}
