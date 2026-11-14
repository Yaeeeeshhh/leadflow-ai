import { supabase } from './supabase'
import type { Lead, LeadActivity, LeadFollowUp, LeadFollowUpStatus, Organization, SalesStage } from '../types'

const PAGE_SIZE = 500

function client() {
  if (!supabase) throw new Error('Supabase configuration is missing.')
  return supabase
}

export async function getOrganizations(userId: string): Promise<Organization[]> {
  const db = client()
  const { data: memberships, error: membershipError } = await db
    .from('organization_memberships')
    .select('organization_id, role, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (membershipError) throw membershipError
  if (!memberships?.length) return []

  const ids = memberships.map((membership) => membership.organization_id)
  const { data: organizations, error: organizationError } = await db
    .from('organizations')
    .select('id, name')
    .in('id', ids)

  if (organizationError) throw organizationError
  const byId = new Map((organizations ?? []).map((organization) => [organization.id, organization]))
  return memberships.flatMap((membership) => {
    const organization = byId.get(membership.organization_id)
    return organization
      ? [{ id: organization.id, name: organization.name, role: membership.role as Organization['role'] }]
      : []
  })
}

export async function getLeads(organizationId: string): Promise<Lead[]> {
  const db = client()
  const rows: Lead[] = []
  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await db
      .from('dashboard_leads')
      .select('lead_id,organization_id,source_table,qualification_outcome,name,email,phone,business,budget,message,ai_score,ai_category,ai_reason,recommended_action,error_message,status,sales_stage,created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(start, start + PAGE_SIZE - 1)

    if (error) throw error
    const page = (data ?? []) as Lead[]
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }
  return rows
}

export async function getActivities(organizationId: string): Promise<LeadActivity[]> {
  const db = client()
  const rows: LeadActivity[] = []
  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await db
      .from('lead_activities')
      .select('id,organization_id,source_table,lead_id,event_type,details,created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(start, start + PAGE_SIZE - 1)

    if (error) throw error
    const page = (data ?? []) as LeadActivity[]
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }
  return rows
}

export async function getLeadFollowUps(organizationId: string): Promise<LeadFollowUp[]> {
  const db = client()
  const rows: LeadFollowUp[] = []
  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await db
      .from('lead_followups')
      .select('id,organization_id,lead_id,followup_number,scheduled_at,status,email_subject,email_body,agent_reason,sent_at,created_at,updated_at')
      .eq('organization_id', organizationId)
      .order('scheduled_at', { ascending: true })
      .range(start, start + PAGE_SIZE - 1)

    if (error) throw error
    const page = (data ?? []) as LeadFollowUp[]
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }
  return rows
}

export async function setLeadFollowUpStatus(
  organizationId: string,
  followUpId: string,
  nextStatus: Extract<LeadFollowUpStatus, 'approved' | 'skipped'>,
): Promise<Pick<LeadFollowUp, 'id' | 'organization_id' | 'status'>> {
  const { data, error } = await client()
    .from('lead_followups')
    .update({ status: nextStatus })
    .eq('id', followUpId)
    .eq('organization_id', organizationId)
    .eq('status', 'draft')
    .select('id,organization_id,status')
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('This follow-up is no longer awaiting approval. Refresh the list and try again.')
  return data as Pick<LeadFollowUp, 'id' | 'organization_id' | 'status'>
}

export async function setLeadStage(lead: Lead, organizationId: string, stage: SalesStage) {
  const db = client()
  const { error } = await db
    .from(lead.source_table)
    .update({ sales_stage: stage })
    .eq('id', lead.lead_id)
    .eq('organization_id', organizationId)

  if (error) throw error
}

export async function addFollowUp(
  lead: Lead,
  organizationId: string,
  note: string,
) {
  const db = client()
  const sourceIdColumn = `${lead.source_table}_lead_id`
  const { error } = await db.from('lead_activities').insert({
    organization_id: organizationId,
    source_table: lead.source_table,
    [sourceIdColumn]: lead.lead_id,
    event_type: 'follow_up',
    details: { note },
  })
  if (error) throw error
}

export interface LeadWriteInput {
  qualification_outcome: 'qualified' | 'unqualified'
  name: string
  email: string
  phone: string | null
  business: string | null
  budget: number | null
  message: string
}

// These operations intentionally go through organization-scoped database
// functions. They do not fall back to direct table writes if the functions are
// not installed or reject the caller.
export async function createOrganizationLead(organizationId: string, input: LeadWriteInput) {
  const { data, error } = await client().rpc('create_organization_lead', {
    p_organization_id: organizationId,
    p_qualification_outcome: input.qualification_outcome,
    p_name: input.name,
    p_email: input.email,
    p_phone: input.phone,
    p_business: input.business,
    p_budget: input.budget,
    p_message: input.message,
  })
  if (error) throw error
  if (data !== true) throw new Error('The database did not confirm that the lead was created.')
}

export async function updateOrganizationLead(organizationId: string, lead: Lead, input: Omit<LeadWriteInput, 'qualification_outcome'>) {
  const { data, error } = await client().rpc('update_organization_lead', {
    p_organization_id: organizationId,
    p_source_table: lead.source_table,
    p_lead_id: lead.lead_id,
    p_name: input.name,
    p_email: input.email,
    p_phone: input.phone,
    p_business: input.business,
    p_budget: input.budget,
    p_message: input.message,
  })
  if (error) throw error
  if (data !== true) throw new Error('The database did not confirm that the lead was updated.')
}

export async function deleteOrganizationLead(lead: Lead) {
  const { data, error } = await client().rpc('delete_organization_lead', {
    p_lead_id: lead.lead_id,
  })
  if (error) throw error
  // A void-returning RPC has null data and is successful when error is null.
  // If the function reports a boolean result, don't treat false as a deletion.
  if (data === false) throw new Error('The delete function reported that no lead was deleted.')
}
