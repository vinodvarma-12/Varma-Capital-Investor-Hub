import { supabase } from '@/lib/supabase/client'

function parseSort(sort, defaultColumn) {
  if (!sort) return { column: defaultColumn, ascending: false }
  const ascending = !String(sort).startsWith('-')
  const raw = ascending ? String(sort) : String(sort).slice(1)
  return { column: raw, ascending }
}

export const User = {
  async me() {
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr) throw authErr
    if (!user) throw new Error('Not authenticated')
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (error) throw error
    return { ...data, id: data.id, email: data.email ?? user.email }
  },

  async list(sort, limit) {
    let q = supabase.from('profiles').select('*')
    const { column, ascending } = parseSort(sort, 'created_date')
    q = q.order(column, { ascending, nullsFirst: false })
    if (limit) q = q.limit(limit)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  },

  async filter(filters) {
    let q = supabase.from('profiles').select('*')
    for (const [k, v] of Object.entries(filters)) {
      q = q.eq(k, v)
    }
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  },

  async updateMyUserData(patch) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { data, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', user.id)
      .select('*')
      .single()
    if (error) throw error
    return data
  },

  async logout(shouldRedirect) {
    await supabase.auth.signOut()
    if (shouldRedirect && typeof window !== 'undefined') {
      window.location.href = '/#/InvestorAuth'
    }
  },
}
