import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity, ArrowUpRight, Bell, ChevronDown, Command, Gauge, GitBranch,
  LayoutDashboard, LogOut, Menu, MessageSquare, Search, Settings, ShieldCheck, Sparkles, Users, X,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useAuth } from './auth/AuthProvider'
import { getActivities, getLeads, getOrganizations } from './lib/data'
import { supabase, supabaseConfig } from './lib/supabase'
import type { Lead, LeadActivity, Organization } from './types'
import { AuthPage } from './pages/AuthPage'
import { OverviewPage } from './pages/OverviewPage'
import { LeadsPage } from './pages/LeadsPage'
import { PipelinePage } from './pages/PipelinePage'
import { ActivityPage } from './pages/ActivityPage'
import { FollowUpsPage } from './pages/FollowUpsPage'
import { SettingsPage } from './pages/SettingsPage'
import { LeadDetailDrawer } from './components/LeadDetailDrawer'

export interface DashboardContext {
  organization: Organization
  organizations: Organization[]
  chooseOrganization: (id: string) => void
  leads: Lead[]
  activities: LeadActivity[]
  leadsLoading: boolean
  activitiesLoading: boolean
  dataError: Error | null
  openLead: (lead: Lead) => void
}

const navItems = [
  { label: 'Overview', path: '/', icon: LayoutDashboard },
  { label: 'All Leads', path: '/leads', icon: Users },
  { label: 'Qualified', path: '/qualified', icon: ShieldCheck },
  { label: 'Unqualified', path: '/unqualified', icon: X },
  { label: 'Failed Leads', path: '/failed', icon: Activity },
  { label: 'Pipeline', path: '/pipeline', icon: GitBranch },
  { label: 'Follow-ups', path: '/follow-ups', icon: MessageSquare },
  { label: 'Activity', path: '/activity', icon: Activity },
]

export default function App() {
  const { user, loading } = useAuth()

  if (!supabaseConfig.ready) return <ConfigurationNotice />
  if (loading) return <FullScreenLoading label="Restoring your secure session" />

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/" element={user ? <DashboardShell /> : <Navigate to="/login" replace />}>
        <Route index element={<OverviewPage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="qualified" element={<LeadsPage forcedOutcome="qualified" />} />
        <Route path="unqualified" element={<LeadsPage forcedOutcome="unqualified" />} />
        <Route path="failed" element={<LeadsPage forcedOutcome="failed" />} />
        <Route path="pipeline" element={<PipelinePage />} />
        <Route path="follow-ups" element={<FollowUpsPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function DashboardShell() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isLive, setIsLive] = useState(false)

  async function handleLogout() {
    if (!supabase || signingOut) return
    setSigningOut(true)
    setLogoutError('')
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      queryClient.clear()
      setUserMenuOpen(false)
      navigate('/login', { replace: true })
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : 'Unable to sign out. Please try again.')
      setUserMenuOpen(true)
    } finally {
      setSigningOut(false)
    }
  }

  const organizationsQuery = useQuery({
    queryKey: ['organizations', user?.id],
    queryFn: () => getOrganizations(user!.id),
    enabled: Boolean(user?.id),
  })

  const organizations = organizationsQuery.data ?? []
  const [selectedOrgId, setSelectedOrgId] = useState('')

  useEffect(() => {
    if (!organizations.length) return
    const savedId = window.localStorage.getItem('lead-engine-org')
    const validSaved = organizations.some((org) => org.id === savedId)
    const nextId = validSaved ? savedId! : organizations[0].id
    setSelectedOrgId((current) => organizations.some((org) => org.id === current) ? current : nextId)
  }, [organizations])

  const organization = organizations.find((org) => org.id === selectedOrgId) ?? organizations[0]
  const organizationId = organization?.id

  useEffect(() => {
    if (!organizationId) return
    window.localStorage.setItem('lead-engine-org', organizationId)
  }, [organizationId])

  const leadsQuery = useQuery({
    queryKey: ['leads', organizationId],
    queryFn: () => getLeads(organizationId!),
    enabled: Boolean(organizationId),
    refetchInterval: 30_000,
  })
  const activitiesQuery = useQuery({
    queryKey: ['activities', organizationId],
    queryFn: () => getActivities(organizationId!),
    enabled: Boolean(organizationId),
    refetchInterval: 30_000,
  })

  useEffect(() => {
    if (!organizationId || !supabase) return
    let active = true
    const channel = supabase.channel(`dashboard-${organizationId}`)
    const tables = ['leads', 'unqualified_leads', 'failed_leads'] as const
    tables.forEach((table) => {
      channel.on('postgres_changes', {
        event: '*', schema: 'public', table,
        filter: `organization_id=eq.${organizationId}`,
      }, () => {
        void queryClient.invalidateQueries({ queryKey: ['leads', organizationId] })
        void queryClient.invalidateQueries({ queryKey: ['activities', organizationId] })
      })
    })
    channel.on('postgres_changes', {
      event: '*', schema: 'public', table: 'lead_activities',
      filter: `organization_id=eq.${organizationId}`,
    }, () => {
      void queryClient.invalidateQueries({ queryKey: ['activities', organizationId] })
    })
    channel.on('postgres_changes', {
      event: '*', schema: 'public', table: 'lead_followups',
      filter: `organization_id=eq.${organizationId}`,
    }, () => {
      void queryClient.invalidateQueries({ queryKey: ['followups', organizationId] })
    })
    channel.subscribe((status) => {
      if (active) setIsLive(status === 'SUBSCRIBED')
    })
    return () => {
      active = false
      setIsLive(false)
      void supabase?.removeChannel(channel)
    }
  }, [organizationId, queryClient])

  const title = useMemo(() => {
    if (location.pathname === '/') return 'Overview'
    return navItems.find((item) => item.path === location.pathname)?.label
      ?? (location.pathname === '/settings' ? 'Settings' : 'Leads')
  }, [location.pathname])

  if (organizationsQuery.isLoading || (organizations.length > 0 && !organization)) {
    return <FullScreenLoading label="Loading your workspace" />
  }
  if (organizationsQuery.isError) {
    return <FullScreenError title="We couldn’t load your workspace" message={organizationsQuery.error.message} onRetry={() => void organizationsQuery.refetch()} />
  }
  if (!organization) return <NoOrganization />

  const context: DashboardContext = {
    organization,
    organizations,
    chooseOrganization: (id) => { setSelectedLead(null); setSelectedOrgId(id) },
    leads: leadsQuery.data ?? [],
    activities: activitiesQuery.data ?? [],
    leadsLoading: leadsQuery.isLoading,
    activitiesLoading: activitiesQuery.isLoading,
    dataError: (leadsQuery.error ?? activitiesQuery.error) as Error | null,
    openLead: setSelectedLead,
  }

  return (
    <div className="app-shell">
      {mobileNavOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-top">
          <div className="brand-lockup">
            <div className="brand-mark"><Command size={17} strokeWidth={2.5} /></div>
            <div><strong>Leadflow</strong><span>CONVERSION ENGINE</span></div>
            <button className="icon-button sidebar-close" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}><X size={18} /></button>
          </div>
          <div className="workspace-label">WORKSPACE</div>
          <div className="org-picker-wrap" data-label={organization.name}>
            <select
              className="org-picker"
              value={organization.id}
              aria-label="Select organization"
              onChange={(event) => {
                setSelectedLead(null)
                setSelectedOrgId(event.target.value)
                setMobileNavOpen(false)
              }}
            >
              {organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
            </select>
            <ChevronDown className="org-chevron" size={15} />
            <span className="org-avatar">{organization.name.slice(0, 1).toUpperCase()}</span>
          </div>
        </div>

        <div className="sidebar-scroll-area">
          <nav className="primary-nav" aria-label="Main navigation">
            {navItems.map(({ label, path, icon: Icon }) => (
              <NavLink key={path} to={path} end={path === '/'} onClick={() => setMobileNavOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
                <Icon size={17} strokeWidth={1.9} /><span>{label}</span>
                {label === 'All Leads' && <span className="nav-count">{leadsQuery.data?.length ?? '—'}</span>}
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-bottom">
          <div className="plan-card">
            <div className="plan-icon"><Sparkles size={15} /></div>
            <strong>AI qualification</strong>
            <p>Scores and reasoning appear on each lead when available from your automation.</p>
            <small>{leadsQuery.data?.filter((lead) => lead.ai_score != null).length ?? 0} scored leads in workspace</small>
          </div>
          <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMobileNavOpen(false)}>
            <Settings size={17} /><span>Settings</span>
          </NavLink>
          <div className="sidebar-user">
            <div className="user-avatar">{(user?.email?.[0] ?? 'U').toUpperCase()}</div>
            <div className="user-copy"><strong>{user?.email?.split('@')[0]}</strong><span>{organization.role}</span></div>
            <button className="icon-button logout-button" title="Sign out" aria-label="Sign out" disabled={signingOut} onClick={() => void handleLogout()}><LogOut size={16} /></button>
          </div>
          </div>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={20} /></button>
            <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{title}</strong></div>
          </div>
          <div className="topbar-actions">
            <div className={`live-indicator ${isLive ? 'live-on' : ''}`}><span />{isLive ? 'Live updates on' : 'Syncing periodically'}</div>
            <div className="topbar-divider" />
            <button className="icon-button notification-button" aria-label="Notifications"><Bell size={17} /><span className="notification-dot" /></button>
            <div className="user-menu-wrap">
              <button className="topbar-avatar user-menu-trigger" type="button" aria-label="Open account menu" aria-haspopup="menu" aria-expanded={userMenuOpen} onClick={() => { setUserMenuOpen((open) => !open); setLogoutError('') }}>
                {(user?.email?.[0] ?? 'U').toUpperCase()}
              </button>
              {userMenuOpen && <div className="user-menu" role="menu">
                <div className="user-menu-email">{user?.email}</div>
                {logoutError && <div className="user-menu-error" role="alert">{logoutError}</div>}
                <button type="button" role="menuitem" disabled={signingOut} onClick={() => void handleLogout()}><LogOut size={15} />{signingOut ? 'Signing out…' : 'Logout'}</button>
              </div>}
            </div>
          </div>
        </header>

        <main className="content-area">
          {context.dataError && <InlineError message={context.dataError.message} onRetry={() => { void leadsQuery.refetch(); void activitiesQuery.refetch() }} />}
          <Outlet context={context} />
        </main>
        <footer className="app-footer"><span>Leadflow AI</span><span>Securely connected to your Supabase workspace</span><span className="footer-shield"><ShieldCheck size={13} /> RLS protected</span></footer>
      </div>

      {selectedLead && <LeadDetailDrawer
        lead={selectedLead}
        organization={organization}
        leads={leadsQuery.data ?? []}
        activities={activitiesQuery.data ?? []}
        onClose={() => setSelectedLead(null)}
      />}
    </div>
  )
}

function ConfigurationNotice() {
  return <div className="center-screen"><div className="setup-card"><div className="brand-mark setup-mark"><Command size={18} /></div><h1>Connect your Supabase project</h1><p>Set <code>VITE_SUPABASE_URL</code> and either <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> or <code>VITE_SUPABASE_ANON_KEY</code> in the root <code>.env</code> file, then restart the dev server.</p><p className="muted">Use a publishable/anon key only. Never put a service-role key in a browser app.</p></div></div>
}

function NoOrganization() {
  const { user } = useAuth()
  return <div className="center-screen"><div className="setup-card"><div className="brand-mark setup-mark"><Users size={18} /></div><h1>No workspace membership</h1><p>This signed-in user doesn’t have an organization membership that can be read. Ask a workspace owner to add your account, then sign in again.</p><p className="muted">Signed in as {user?.email}</p><button className="button button-secondary" onClick={() => void supabase?.auth.signOut()}>Sign out</button></div></div>
}

function FullScreenLoading({ label }: { label: string }) {
  return <div className="center-screen"><div className="loading-mark"><Gauge size={23} /><span className="spinner" /></div><p>{label}</p></div>
}

function FullScreenError({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return <div className="center-screen"><div className="setup-card"><h1>{title}</h1><p>{message}</p><button className="button button-primary" onClick={onRetry}>Try again</button></div></div>
}

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="inline-error"><div><strong>Couldn’t load the latest data</strong><p>{message}</p></div><button className="button button-small" onClick={onRetry}>Retry</button></div>
}

export function useDashboard() {
  // Routes read the shared context provided by the protected shell.
  return useOutletContext<DashboardContext>()
}

export function PageHeading({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow ?? 'LEAD CONVERSION'}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="heading-actions">{actions}</div>}</div>
}

export function EmptyState({ title, body, icon: Icon = Search }: { title: string; body: string; icon?: typeof Search }) {
  return <div className="empty-state"><div className="empty-icon"><Icon size={21} /></div><strong>{title}</strong><p>{body}</p></div>
}

export function QuickSearchLink() {
  return <Link to="/leads" className="quick-search-link"><Search size={15} /> Search leads <kbd>⌘ K</kbd><ArrowUpRight size={14} /></Link>
}
