type SupabaseLikeError = {
  code?: string
  message?: string
}

export function leadMutationError(error: unknown, action: string) {
  const value = error && typeof error === 'object' ? error as SupabaseLikeError : undefined
  const message = typeof value?.message === 'string'
    ? value.message
    : error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : ''

  if (value?.code === 'PGRST202' || value?.code === '42883' || /could not find the function|function .* does not exist|schema cache/i.test(message)) {
    return `Supabase could not match this RPC call to a function signature. Check its argument names and types, or refresh the schema cache. No lead was ${action}.`
  }
  if (value?.code === '42501' || /row-level security|permission denied|insufficient privilege/i.test(message)) {
    return `The database denied this action under its current permissions. No lead was ${action}.`
  }
  return message || `The lead could not be ${action}.`
}
