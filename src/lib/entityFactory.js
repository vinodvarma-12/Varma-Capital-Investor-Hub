import { supabase } from '@/lib/supabase/client'

function parseSort(sort, defaultColumn) {
  if (!sort) return { column: defaultColumn, ascending: false }
  const ascending = !String(sort).startsWith('-')
  const raw = ascending ? String(sort) : String(sort).slice(1)
  return { column: raw, ascending }
}

/**
 * @param {string} table - Supabase table name
 * @param {{ defaultSortColumn?: string }} [options]
 */
export function makeEntity(table, options = {}) {
  const defaultSortColumn = options.defaultSortColumn ?? 'created_date'

  async function filter(filters = {}, sort, limit) {
    let q = supabase.from(table).select('*')
    for (const [key, val] of Object.entries(filters)) {
      if (val === undefined) continue
      q = q.eq(key, val)
    }
    const { column, ascending } = parseSort(sort, defaultSortColumn)
    q = q.order(column, { ascending, nullsFirst: false })
    if (limit) q = q.limit(limit)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  }

  async function list(sort, limit) {
    return filter({}, sort, limit)
  }

  async function create(row) {
    const { data, error } = await supabase.from(table).insert(row).select('*').single()
    if (error) throw error
    return data
  }

  async function update(id, patch) {
    const { data, error } = await supabase.from(table).update(patch).eq('id', id).select('*').single()
    if (error) throw error
    return data
  }

  async function remove(id) {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error
  }

  return { filter, list, create, update, delete: remove }
}
