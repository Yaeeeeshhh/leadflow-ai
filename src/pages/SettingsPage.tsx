import { useAuth } from '../auth/AuthProvider'
import { PageHeading, useDashboard } from '../App'
import { LogOut, ShieldCheck, UserRound, Building2, Radio } from 'lucide-react'
import { supabase } from '../lib/supabase'

export function SettingsPage() {
  const { user } = useAuth()
  const { organization, organizations } = useDashboard()

  return <>
    <PageHeading eyebrow="PREFERENCES" title="Settings" description="Workspace, account, and connection details for your dashboard." />
    <div className="settings-grid">
      <section className="settings-card"><div className="settings-card-heading"><span className="settings-icon"><UserRound size={17} /></span><div><h2>Account</h2><p>Your authenticated Supabase account</p></div></div><div className="settings-row"><span>Email</span><strong>{user?.email ?? '—'}</strong></div><div className="settings-row"><span>Membership role</span><strong className="capitalize">{organization.role}</strong></div><button className="button button-secondary settings-action" onClick={() => void supabase?.auth.signOut()}><LogOut size={14} />Sign out</button></section>
      <section className="settings-card"><div className="settings-card-heading"><span className="settings-icon settings-icon-purple"><Building2 size={17} /></span><div><h2>Workspace</h2><p>Organization membership and data scope</p></div></div><div className="settings-row"><span>Organization</span><strong>{organization.name}</strong></div><div className="settings-row"><span>Available workspaces</span><strong>{organizations.length}</strong></div><div className="settings-row"><span>Workspace ID</span><code>{organization.id}</code></div><div className="settings-note"><ShieldCheck size={15} /><span>Every lead and activity request is filtered by this organization. Row-level security remains authoritative.</span></div></section>
      <section className="settings-card"><div className="settings-card-heading"><span className="settings-icon settings-icon-green"><Radio size={17} /></span><div><h2>Data connection</h2><p>Live updates from the Supabase database</p></div></div><div className="settings-row"><span>Lead data source</span><strong>dashboard_leads</strong></div><div className="settings-row"><span>Activity source</span><strong>lead_activities</strong></div><div className="settings-row"><span>Credential exposure</span><strong className="connection-secure">Public client key only</strong></div><div className="settings-note"><ShieldCheck size={15} /><span>No service-role key is included in the dashboard. Failed-lead validation details use the admin-only diagnostics function.</span></div></section>
    </div>
  </>
}
