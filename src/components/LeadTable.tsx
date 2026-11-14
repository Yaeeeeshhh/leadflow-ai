import { useMemo, useState } from 'react'
import { ArrowDownUp, ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react'
import { formatCurrency, formatDate, initials } from '../lib/format'
import type { Lead, LeadOutcome, SalesStage } from '../types'
import { SALES_STAGES } from '../types'
import { OutcomeBadge, ScoreBadge } from './Badges'
import { StageSelect } from './StageSelect'

const PAGE_SIZE = 8

export function LeadTable({ leads, loading, openLead, onStageChange, compact = false, forcedOutcome }: {
  leads: Lead[]
  loading: boolean
  openLead: (lead: Lead) => void
  onStageChange: (lead: Lead, stage: SalesStage) => Promise<void>
  compact?: boolean
  forcedOutcome?: LeadOutcome
}) {
  const [search, setSearch] = useState('')
  const [outcome, setOutcome] = useState(forcedOutcome ?? 'all')
  const [stage, setStage] = useState('all')
  const [sort, setSort] = useState<'date' | 'score'>('date')
  const [page, setPage] = useState(1)
  const activeOutcome = forcedOutcome ?? outcome

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return leads.filter((lead) => {
      const matchesSearch = !q || [lead.name, lead.email, lead.phone, lead.business].some((value) => value?.toLowerCase().includes(q))
      const matchesOutcome = activeOutcome === 'all' || lead.qualification_outcome === activeOutcome
      const matchesStage = stage === 'all' || lead.sales_stage === stage
      return matchesSearch && matchesOutcome && matchesStage
    }).sort((a, b) => sort === 'date'
      ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      : (b.ai_score ?? -1) - (a.ai_score ?? -1))
  }, [leads, search, activeOutcome, stage, sort])

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const safePage = Math.min(page, pages)
  const shown = compact ? rows.slice(0, 5) : rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function resetFilters() {
    setSearch(''); setOutcome(forcedOutcome ?? 'all'); setStage('all'); setPage(1)
  }

  return <div className="table-card">
    {!compact && <div className="table-toolbar">
      <div className="table-search"><Search size={16} /><input value={search} placeholder="Search name, email, business…" onChange={(event) => { setSearch(event.target.value); setPage(1) }} /><kbd>⌘ K</kbd></div>
      <div className="filter-group">
        {!forcedOutcome && <select aria-label="Filter qualification" value={outcome} onChange={(event) => { setOutcome(event.target.value); setPage(1) }}><option value="all">All outcomes</option><option value="qualified">Qualified</option><option value="unqualified">Unqualified</option><option value="failed">Failed</option></select>}
        <select aria-label="Filter sales stage" value={stage} onChange={(event) => { setStage(event.target.value); setPage(1) }}><option value="all">All stages</option>{SALES_STAGES.map((option) => <option key={option}>{option}</option>)}</select>
        <button className="button button-filter" onClick={() => setSort((current) => current === 'date' ? 'score' : 'date')}><SlidersHorizontal size={14} />Sort {sort === 'date' ? 'date' : 'score'}</button>
      </div>
    </div>}

    {loading ? <div className="table-loading">{Array.from({ length: compact ? 5 : PAGE_SIZE }, (_, index) => <div className="table-skeleton-row" key={index} />)}</div> : shown.length === 0 ? <div className="table-empty"><div className="empty-icon"><Search size={19} /></div><strong>No leads match these filters</strong><p>Try another search or clear the selected filters.</p>{!compact && <button className="button button-secondary" onClick={resetFilters}><X size={14} />Clear filters</button>}</div> : <>
      <div className="table-scroll"><table className="leads-table"><thead><tr>
        <th>Lead <ArrowDownUp size={12} /></th><th>Business</th><th>Outcome</th><th>AI score</th><th>Sales stage</th><th>Captured</th>
      </tr></thead><tbody>{shown.map((lead) => <tr
        key={`${lead.source_table}-${lead.lead_id}`}
        className="lead-row-clickable"
        tabIndex={0}
        aria-label={`Open lead ${lead.name || 'Unnamed lead'}`}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('button, select, a, input, textarea')) return
          openLead(lead)
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            openLead(lead)
          }
        }}
      >
        <td><button className="lead-person" onClick={() => openLead(lead)}><span className="person-avatar">{initials(lead.name)}</span><span><strong>{lead.name || 'Unnamed lead'}</strong><small>{lead.email || lead.phone || 'No contact details'}</small></span></button></td>
        <td><span className="business-cell">{lead.business || '—'}</span><small className="budget-cell">{formatCurrency(lead.budget)}</small></td>
        <td><OutcomeBadge outcome={lead.qualification_outcome} /></td>
        <td><ScoreBadge score={lead.ai_score} category={lead.ai_category} /></td>
        <td><StageSelect value={lead.sales_stage} onChange={(next) => onStageChange(lead, next)} /></td>
        <td><span className="date-cell">{formatDate(lead.created_at)}</span></td>
      </tr>)}</tbody></table></div>
      {!compact && <div className="table-pagination"><span>Showing <strong>{rows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, rows.length)}</strong> of <strong>{rows.length}</strong> leads</span><div><button disabled={safePage <= 1} aria-label="Previous page" onClick={() => setPage(safePage - 1)}><ChevronLeft size={16} /></button><span>Page {safePage} of {pages}</span><button disabled={safePage >= pages} aria-label="Next page" onClick={() => setPage(safePage + 1)}><ChevronRight size={16} /></button></div></div>}
    </>}
  </div>
}
