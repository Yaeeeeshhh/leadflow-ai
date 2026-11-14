import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays, CheckCircle2, CircleAlert, Users } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { format, subDays, startOfDay } from 'date-fns'
import { EmptyState, PageHeading, useDashboard } from '../App'
import { ActivityFeed } from '../components/ActivityFeed'
import { LeadTable } from '../components/LeadTable'
import { useStageMutation } from '../hooks/useLeadActions'
import type { Lead } from '../types'

export function OverviewPage() {
  const { organization, leads, activities, leadsLoading, activitiesLoading, openLead } = useDashboard()
  const stageMutation = useStageMutation(organization.id)
  const navigate = useNavigate()
  const [range, setRange] = useState(14)

  const counts = useMemo(() => {
    const qualified = leads.filter((lead) => lead.qualification_outcome === 'qualified').length
    const unqualified = leads.filter((lead) => lead.qualification_outcome === 'unqualified').length
    const failed = leads.filter((lead) => lead.qualification_outcome === 'failed').length
    const converted = leads.filter((lead) => lead.sales_stage === 'Converted').length
    const conversion = leads.length ? Math.round((converted / leads.length) * 100) : 0
    return { qualified, unqualified, failed, converted, conversion }
  }, [leads])

  const chartData = useMemo(() => {
    const days = Array.from({ length: range }, (_, index) => startOfDay(subDays(new Date(), range - index - 1)))
    return days.map((day) => {
      const dayLeads = leads.filter((lead) => startOfDay(new Date(lead.created_at)).getTime() === day.getTime())
      return {
        date: format(day, range > 14 ? 'MMM d' : 'EEE'),
        total: dayLeads.length,
        qualified: dayLeads.filter((lead) => lead.qualification_outcome === 'qualified').length,
      }
    })
  }, [leads, range])

  const stageCounts = useMemo(() => [
    { label: 'New', count: leads.filter((lead) => (lead.sales_stage ?? 'New') === 'New').length, color: 'stage-new' },
    { label: 'Contacted', count: leads.filter((lead) => lead.sales_stage === 'Contacted').length, color: 'stage-contacted' },
    { label: 'Interested', count: leads.filter((lead) => lead.sales_stage === 'Interested').length, color: 'stage-interested' },
    { label: 'Converted', count: leads.filter((lead) => lead.sales_stage === 'Converted').length, color: 'stage-converted' },
    { label: 'Lost', count: leads.filter((lead) => lead.sales_stage === 'Lost').length, color: 'stage-lost' },
  ], [leads])

  const recentLeads = [...leads].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5)
  const averageScore = leads.filter((lead) => lead.ai_score != null)
  const scoreAverage = averageScore.length ? Math.round(averageScore.reduce((sum, lead) => sum + (lead.ai_score ?? 0), 0) / averageScore.length) : null

  async function changeStage(lead: Lead, stage: Parameters<typeof stageMutation.mutateAsync>[0]['stage']) {
    await stageMutation.mutateAsync({ lead, stage })
  }

  return <>
    <PageHeading
      eyebrow={`${organization.name.toUpperCase()} WORKSPACE`}
      title="Good morning"
      description="Here’s what’s happening with your lead pipeline today."
      actions={<button className="button button-primary" onClick={() => navigate('/leads')}>Review leads <ArrowRight size={15} /></button>}
    />

    <section className="kpi-grid" aria-label="Lead performance metrics">
      <KpiCard title="Total leads" value={leadsLoading ? '—' : leads.length.toLocaleString()} note="Across all outcomes" icon={<Users size={17} />} tone="blue" onClick={() => navigate('/leads')} />
      <KpiCard title="Qualified" value={leadsLoading ? '—' : counts.qualified.toLocaleString()} note={`${leads.length ? Math.round(counts.qualified / leads.length * 100) : 0}% of all leads`} icon={<CheckCircle2 size={17} />} tone="green" onClick={() => navigate('/qualified')} />
      <KpiCard title="Unqualified" value={leadsLoading ? '—' : counts.unqualified.toLocaleString()} note="AI reviewed" icon={<CircleAlert size={17} />} tone="amber" onClick={() => navigate('/unqualified')} />
      <KpiCard title="Failed submissions" value={leadsLoading ? '—' : counts.failed.toLocaleString()} note="Validation issues" icon={<CircleAlert size={17} />} tone="red" onClick={() => navigate('/failed')} />
      <KpiCard title="Conversion rate" value={leadsLoading ? '—' : `${counts.conversion}%`} note={`${counts.converted} converted leads`} icon={<ArrowUpRight size={17} />} tone="violet" onClick={() => navigate('/pipeline')} />
    </section>

    <section className="overview-grid">
      <div className="panel chart-panel">
        <div className="panel-heading"><div><div className="panel-title">Lead activity</div><p>New leads captured over time</p></div><div className="chart-controls"><span className="legend-dot" /> Leads <select value={range} onChange={(event) => setRange(Number(event.target.value))} aria-label="Chart date range"><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option></select></div></div>
        {leadsLoading ? <div className="chart-skeleton" /> : leads.length === 0 ? <EmptyState title="Your chart will appear here" body="Once leads arrive, you’ll see daily capture trends." icon={CalendarDays} /> : <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}><defs><linearGradient id="leadFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4174ea" stopOpacity={0.18} /><stop offset="100%" stopColor="#4174ea" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#eef1f5" vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#97a1b1', fontSize: 11 }} tickMargin={12} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#97a1b1', fontSize: 11 }} /><Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e9edf3', boxShadow: '0 10px 24px #1d355710' }} /><Area type="monotone" dataKey="total" stroke="#4777ed" strokeWidth={2.5} fill="url(#leadFill)" activeDot={{ r: 5, fill: '#fff', stroke: '#4777ed', strokeWidth: 2 }} /></AreaChart></ResponsiveContainer></div>}
        <div className="chart-footer"><span><strong>{leads.length.toLocaleString()}</strong> total lead records</span><span>Average AI score <strong>{scoreAverage == null ? '—' : `${scoreAverage}/100`}</strong></span></div>
      </div>

      <div className="panel pipeline-summary-panel">
        <div className="panel-heading"><div><div className="panel-title">Sales pipeline</div><p>Lead distribution by stage</p></div><button className="icon-link" onClick={() => navigate('/pipeline')} aria-label="View pipeline"><ArrowRight size={16} /></button></div>
        <div className="pipeline-total"><strong>{leads.length.toLocaleString()}</strong><span>active leads</span></div>
        <div className="stage-summary-list">{stageCounts.map((item) => <button className="stage-summary-row" key={item.label} onClick={() => navigate('/pipeline')}><span className={`stage-dot ${item.color}`} /><span>{item.label}</span><div className="stage-track"><span style={{ width: `${leads.length ? Math.max(2, item.count / leads.length * 100) : 0}%` }} /></div><strong>{item.count}</strong></button>)}</div>
        <button className="text-link" onClick={() => navigate('/pipeline')}>View pipeline <ArrowRight size={14} /></button>
      </div>
    </section>

    <section className="overview-grid overview-grid-lower">
      <div className="panel recent-leads-panel">
        <div className="panel-heading"><div><div className="panel-title">Recent leads</div><p>Your latest captured prospects</p></div><button className="text-link" onClick={() => navigate('/leads')}>View all <ArrowRight size={14} /></button></div>
        <LeadTable leads={recentLeads} loading={leadsLoading} openLead={openLead} onStageChange={changeStage} compact />
      </div>
      <div className="panel recent-activity-panel">
        <div className="panel-heading"><div><div className="panel-title">Recent activity</div><p>Latest events across your leads</p></div><button className="icon-link" onClick={() => navigate('/activity')} aria-label="View activity"><ArrowRight size={16} /></button></div>
        <ActivityFeed items={activities} loading={activitiesLoading} compact limit={5} />
        <button className="text-link activity-view-all" onClick={() => navigate('/activity')}>View activity <ArrowRight size={14} /></button>
      </div>
    </section>
  </>
}

function KpiCard({ title, value, note, icon, tone, onClick }: { title: string; value: string; note: string; icon: React.ReactNode; tone: string; onClick: () => void }) {
  const hasValue = value !== '—'
  return <button className={`kpi-card kpi-${tone}`} onClick={onClick}><div className="kpi-top"><span>{title}</span><span className="kpi-icon">{icon}</span></div><strong className="kpi-value">{value}</strong><div className="kpi-bottom"><span>{note}</span>{hasValue && title === 'Conversion rate' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}</div></button>
}
