import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, GripVertical, Plus } from 'lucide-react'
import { PageHeading, useDashboard } from '../App'
import { OutcomeBadge, ScoreBadge } from '../components/Badges'
import { StageSelect } from '../components/StageSelect'
import { useStageMutation } from '../hooks/useLeadActions'
import { formatCurrency, formatDate, initials } from '../lib/format'
import { SALES_STAGES } from '../types'
import type { Lead, SalesStage } from '../types'

const stageDescriptions: Record<SalesStage, string> = {
  New: 'Ready for first contact',
  Contacted: 'Initial outreach sent',
  Interested: 'Engaged and evaluating',
  Converted: 'Won and converted',
  Lost: 'Closed or not moving forward',
}

export function PipelinePage() {
  const { organization, leads, leadsLoading, openLead } = useDashboard()
  const mutation = useStageMutation(organization.id)
  const [dragging, setDragging] = useState<Lead | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const [scrollState, setScrollState] = useState({ left: false, right: false })

  function updateScrollState() {
    const board = boardRef.current
    if (!board) return
    setScrollState({
      left: board.scrollLeft > 1,
      right: board.scrollLeft + board.clientWidth < board.scrollWidth - 1,
    })
  }

  useEffect(() => {
    const board = boardRef.current
    if (!board) return
    updateScrollState()
    const resizeObserver = new ResizeObserver(updateScrollState)
    resizeObserver.observe(board)
    Array.from(board.children).forEach((column) => resizeObserver.observe(column))
    return () => resizeObserver.disconnect()
  }, [leads.length])

  function scrollPipeline(direction: -1 | 1) {
    const board = boardRef.current
    if (!board) return
    board.scrollBy({ left: direction * Math.max(board.clientWidth * 0.75, 280), behavior: 'smooth' })
  }

  async function moveLead(lead: Lead, stage: SalesStage) {
    if (lead.sales_stage !== stage) await mutation.mutateAsync({ lead, stage })
  }

  return <>
    <PageHeading eyebrow="SALES PIPELINE" title="Pipeline" description="Move prospects through your sales process. Qualification and sales stage remain independent." actions={<div className="heading-count"><strong>{leads.length}</strong><span>leads</span></div>} />
    <div className="pipeline-scroll-controls" role="group" aria-label="Scroll pipeline stages">
      <span>Pipeline stages</span>
      <button className="icon-button" type="button" aria-label="Scroll pipeline left" disabled={!scrollState.left} onClick={() => scrollPipeline(-1)}><ChevronLeft size={18} /></button>
      <button className="icon-button" type="button" aria-label="Scroll pipeline right" disabled={!scrollState.right} onClick={() => scrollPipeline(1)}><ChevronRight size={18} /></button>
    </div>
    <div className="pipeline-board" ref={boardRef} aria-label="Sales pipeline board" onScroll={updateScrollState} onWheel={(event) => {
      const board = boardRef.current
      if (board && Math.abs(event.deltaY) > Math.abs(event.deltaX) && board.scrollWidth > board.clientWidth) {
        event.preventDefault()
        board.scrollLeft += event.deltaY
      }
    }}>
      {SALES_STAGES.map((stage) => {
        const cards = leads.filter((lead) => (lead.sales_stage ?? 'New') === stage)
        return <section className={`pipeline-column column-${stage.toLowerCase()} ${dragging ? 'column-drop-active' : ''}`} key={stage} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (dragging) void moveLead(dragging, stage); setDragging(null) }}>
          <header className="pipeline-column-heading"><div><span className={`stage-dot stage-${stage.toLowerCase()}`} /><h2>{stage}</h2><span className="column-count">{cards.length}</span></div><button className="icon-button" title={`Add lead to ${stage}`} onClick={() => document.getElementById('pipeline-leads')?.scrollIntoView({ behavior: 'smooth' })}><Plus size={16} /></button><p>{stageDescriptions[stage]}</p></header>
          <div className="pipeline-card-list">
            {leadsLoading ? <div className="pipeline-empty">Loading leads…</div> : cards.length === 0 ? <div className="pipeline-empty">Drop a lead here</div> : cards.map((lead) => <article className="pipeline-card pipeline-card-clickable" key={`${lead.source_table}-${lead.lead_id}`} tabIndex={0} aria-label={`Open lead ${lead.name || 'Unnamed lead'}`} onClick={(event) => { if (!(event.target as HTMLElement).closest('button, select, a, input, textarea')) openLead(lead) }} onKeyDown={(event) => { if (event.target !== event.currentTarget) return; if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openLead(lead) } }} draggable onDragStart={() => setDragging(lead)} onDragEnd={() => setDragging(null)}>
              <div className="pipeline-card-top"><button className="pipeline-person" onClick={() => openLead(lead)}><span className="person-avatar">{initials(lead.name)}</span><span><strong>{lead.name || 'Unnamed lead'}</strong><small>{lead.business || lead.email || 'New prospect'}</small></span></button><span className="drag-handle" title="Drag to change stage"><GripVertical size={16} /></span></div>
              <div className="pipeline-card-meta"><OutcomeBadge outcome={lead.qualification_outcome} /><ScoreBadge score={lead.ai_score} category={lead.ai_category} /></div>
              <div className="pipeline-card-footer"><span>{formatCurrency(lead.budget)}</span><span>{formatDate(lead.created_at, 'MMM d')}</span></div>
              <div className="pipeline-card-move"><StageSelect value={lead.sales_stage} onChange={(stage) => moveLead(lead, stage)} /><button className="icon-button" onClick={() => openLead(lead)} aria-label={`Open ${lead.name}`}><ArrowRight size={14} /></button></div>
            </article>)}
          </div>
        </section>
      })}
    </div>
    <div className="pipeline-mobile-hint"><GripVertical size={14} /> On desktop, drag cards between columns. On mobile, use the stage selector.</div>
    <div id="pipeline-leads" className="sr-only">Pipeline stage updates write only the sales_stage column.</div>
  </>
}
