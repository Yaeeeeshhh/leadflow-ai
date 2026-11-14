import { useMutation, useQueryClient } from '@tanstack/react-query'
import { setLeadStage } from '../lib/data'
import type { Lead, SalesStage } from '../types'

export function useStageMutation(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ lead, stage }: { lead: Lead; stage: SalesStage }) => setLeadStage(lead, organizationId, stage),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leads', organizationId] })
      void queryClient.invalidateQueries({ queryKey: ['activities', organizationId] })
    },
  })
}
