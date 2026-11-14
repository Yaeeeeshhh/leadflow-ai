import { useState } from 'react'
import type { FormEvent } from 'react'
import { AlertTriangle, LoaderCircle, X } from 'lucide-react'
import { createOrganizationLead, updateOrganizationLead } from '../lib/data'
import { leadMutationError } from '../lib/errors'
import type { Lead, LeadOutcome, Organization } from '../types'

type EditableOutcome = Extract<LeadOutcome, 'qualified' | 'unqualified'>

export function LeadFormDialog({
  organization,
  leads,
  lead,
  onClose,
  onSaved,
}: {
  organization: Organization
  leads: Lead[]
  lead?: Lead
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(lead?.name ?? '')
  const [email, setEmail] = useState(lead?.email ?? '')
  const [phone, setPhone] = useState(lead?.phone ?? '')
  const [business, setBusiness] = useState(lead?.business ?? '')
  const [budget, setBudget] = useState(lead?.budget == null ? '' : String(lead.budget))
  const [message, setMessage] = useState(lead?.message ?? '')
  const [outcome, setOutcome] = useState<EditableOutcome>('unqualified')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const title = lead ? 'Edit lead' : 'Add lead'
  const requiresQualifiedFields = lead?.source_table === 'leads' || (!lead && outcome === 'qualified')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const cleanName = name.trim()
    const cleanEmail = email.trim().toLowerCase()
    const cleanMessage = message.trim()
    const cleanBudget = budget.trim() === '' ? null : Number(budget)

    const requiresContactFields = !lead || lead.source_table === 'leads'
    if ((requiresContactFields && !cleanName) || cleanName.length > 150) return setError('Enter a name between 1 and 150 characters.')
    if ((requiresContactFields && !cleanEmail) || (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) || cleanEmail.length > 254) return setError('Enter a valid email address.')
    if ((requiresContactFields && !cleanMessage) || cleanMessage.length > 5000) return setError('Enter a message between 1 and 5,000 characters.')
    if (requiresQualifiedFields && !phone.trim()) return setError('Enter a phone number for a qualified lead.')
    if (requiresQualifiedFields && cleanBudget == null) return setError('Enter a budget for a qualified lead.')
    if (budget.trim() !== '' && (cleanBudget == null || !Number.isFinite(cleanBudget) || cleanBudget < 0)) return setError('Budget must be a valid non-negative amount.')

    const duplicate = leads.find((item) =>
      item.organization_id === organization.id
      && Boolean(cleanEmail)
      && item.email?.trim().toLowerCase() === cleanEmail
      && !(lead && item.source_table === lead.source_table && item.lead_id === lead.lead_id),
    )
    if (duplicate) return setError(`A lead with this email already exists in ${organization.name}. Open the existing lead instead.`)

    setBusy(true)
    try {
      const input = {
        name: cleanName,
        email: cleanEmail,
        phone: phone.trim() || null,
        business: business.trim() || null,
        budget: cleanBudget,
        message: cleanMessage,
      }
      if (lead) await updateOrganizationLead(organization.id, lead, input)
      else await createOrganizationLead(organization.id, { ...input, qualification_outcome: outcome })
      onSaved()
    } catch (cause) {
      setError(leadMutationError(cause, 'saved'))
    } finally {
      setBusy(false)
    }
  }

  return <div className="management-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
    <section className="management-dialog" role="dialog" aria-modal="true" aria-labelledby="lead-form-title">
      <header className="management-dialog-header"><div><div className="eyebrow">{lead ? 'LEAD MANAGEMENT' : organization.name}</div><h2 id="lead-form-title">{title}</h2></div><button type="button" className="icon-button" aria-label="Close" onClick={onClose}><X size={18} /></button></header>
      <form onSubmit={(event) => void submit(event)}>
        <div className="management-form-grid">
          <label>Name<input autoFocus required={!lead || lead.source_table === 'leads'} maxLength={150} value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label>Email<input required={!lead || lead.source_table === 'leads'} type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Phone<input type="tel" required={requiresQualifiedFields} maxLength={80} value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
          <label>Business<input maxLength={200} value={business} onChange={(event) => setBusiness(event.target.value)} /></label>
          <label>Budget<input type="number" required={requiresQualifiedFields} min="0" step="0.01" value={budget} onChange={(event) => setBudget(event.target.value)} /></label>
          {!lead && <label>Qualification outcome<select value={outcome} onChange={(event) => setOutcome(event.target.value as EditableOutcome)}><option value="unqualified">Unqualified</option><option value="qualified">Qualified</option></select></label>}
          <label className="management-field-wide">Message<textarea required={!lead || lead.source_table === 'leads'} maxLength={5000} rows={4} value={message} onChange={(event) => setMessage(event.target.value)} /></label>
        </div>
        {!lead && <p className="management-note">Choose the current qualification outcome. No AI score or reasoning is created by manual entry.</p>}
        {error && <p className="management-error" role="alert"><AlertTriangle size={15} />{error}</p>}
        <footer className="management-dialog-actions"><button type="button" className="button button-secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy}>{busy && <LoaderCircle className="spin" size={15} />}{busy ? 'Saving…' : lead ? 'Save changes' : 'Add lead'}</button></footer>
      </form>
    </section>
  </div>
}

export function DeleteLeadDialog({ lead, organizationName, busy, error, onCancel, onConfirm }: {
  lead: Lead
  organizationName: string
  busy: boolean
  error: string
  onCancel: () => void
  onConfirm: () => void
}) {
  return <div className="management-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel() }}>
    <section className="management-dialog management-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-lead-title" aria-describedby="delete-lead-copy">
      <div className="delete-warning-icon"><AlertTriangle size={20} /></div><h2 id="delete-lead-title">Delete this lead?</h2>
      <p id="delete-lead-copy">This will request deletion of <strong>{lead.name || lead.email || 'this lead'}</strong> from <strong>{organizationName}</strong>. This action cannot be undone.</p>
      {error && <p className="management-error" role="alert">{error}</p>}
      <footer className="management-dialog-actions"><button className="button button-secondary" disabled={busy} onClick={onCancel}>Cancel</button><button className="button button-danger" disabled={busy} onClick={onConfirm}>{busy && <LoaderCircle className="spin" size={15} />}{busy ? 'Deleting…' : 'Delete lead'}</button></footer>
    </section>
  </div>
}
