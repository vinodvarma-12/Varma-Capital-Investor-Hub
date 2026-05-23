import { supabase } from '@/lib/supabase/client'

export const MarketPreferences = {
  /** Load the current user's preferences. Returns null if none saved yet. */
  async getMyPreferences() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('market_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) throw error
    return data // null means "show all" (no preferences saved)
  },

  /** Upsert the current user's hidden symbols list. */
  async saveHiddenSymbols(hiddenSymbols = []) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('market_preferences')
      .upsert(
        { user_id: user.id, hidden_symbols: hiddenSymbols },
        { onConflict: 'user_id' }
      )
      .select('*')
      .single()

    if (error) throw error
    return data
  },
}
