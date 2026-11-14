export const SALES_STAGES = ['New', 'Contacted', 'Interested', 'Converted', 'Lost'] as const
export type SalesStage = (typeof SALES_STAGES)[number]
export type LeadOutcome = 'qualified' | 'unqualified' | 'failed'

export interface Lead {
  lead_id: string
  organization_id: string
  source_table: 'leads' | 'unqualified_leads' | 'failed_leads'
  qualification_outcome: LeadOutcome
  name: string | null
  email: string | null
  phone: string | null
  business: string | null
  budget: number | null
  message: string | null
  ai_score: number | null
  ai_category: string | null
  ai_reason: string | null
  recommended_action: string | null
  error_message: string | null
  status: string | null
  sales_stage: SalesStage | null
  created_at: string
}

export interface LeadActivity {
  id: string
  organization_id: string
  source_table: Lead['source_table']
  lead_id: string
  event_type: string
  details: Record<string, unknown>
  created_at: string
}

export type LeadFollowUpStatus = 'pending' | 'draft' | 'approved' | 'sent' | 'skipped' | 'cancelled'

export interface LeadFollowUp {
  id: string
  organization_id: string
  lead_id: string
  followup_number: number
  scheduled_at: string
  status: LeadFollowUpStatus
  email_subject: string | null
  email_body: string | null
  agent_reason: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  role: 'owner' | 'admin' | 'member'
}

export interface LeadFilters {
  search: string
  outcome: string
  stage: string
  sort: 'newest' | 'oldest' | 'score-high' | 'score-low'
}
