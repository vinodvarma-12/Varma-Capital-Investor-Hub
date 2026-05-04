import { supabase } from '@/lib/supabase/client'

/**
 * Invoke a Supabase Edge Function with the current user's JWT when available.
 * Returns parsed JSON body (same shape as legacy base44.functions.invoke).
 */
export async function invokeEdgeFunction(name, body = {}) {
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) {
    const e = new Error(error.message || 'Function invoke failed')
    e.cause = error
    if (data && typeof data === 'object' && 'error' in data) {
      e.details = data
    }
    throw e
  }
  return data
}
