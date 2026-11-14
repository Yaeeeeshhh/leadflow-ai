import { useState } from 'react'
import { AlertCircle, ChevronDown, LoaderCircle } from 'lucide-react'
import { SALES_STAGES } from '../types'
import type { SalesStage } from '../types'

export function StageSelect({ value, disabled, onChange }: { value: SalesStage | null; disabled?: boolean; onChange: (stage: SalesStage) => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const currentStage = value ?? 'New'

  async function update(stage: SalesStage) {
    if (stage === currentStage || busy) return
    setBusy(true)
    setError('')
    try { await onChange(stage) } catch (err) { setError(err instanceof Error ? err.message : 'Stage update failed') }
    finally { setBusy(false) }
  }

  return (
    <label className="stage-select-wrap" title={error || 'Update sales stage'}>
      {busy ? <LoaderCircle className="spin" size={14} /> : <ChevronDown size={13} />}
      <select className={`stage-select stage-${currentStage.toLowerCase()}`} value={currentStage} disabled={disabled || busy} onChange={(event) => void update(event.target.value as SalesStage)} aria-label="Sales stage">
        {SALES_STAGES.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
      </select>
      {error && <span className="stage-error"><AlertCircle size={12} />{error}</span>}
    </label>
  )
}
