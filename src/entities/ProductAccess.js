import { makeEntity } from '@/lib/entityFactory'
import { supabase } from '@/lib/supabase/client'

const _base = makeEntity('product_access')

export const ProductAccess = {
  ..._base,

  /**
   * Grant an investor access to a product.
   * Safe to call multiple times — uses upsert on (investor_email, product_id).
   */
  async grant({ investor_email, product_id, granted_by }) {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('product_access')
      .upsert(
        { investor_email, product_id, granted_by, granted_date: today },
        { onConflict: 'investor_email,product_id' }
      )
      .select('*')
      .single()
    if (error) throw error
    return data
  },

  /**
   * Revoke an investor's access to a specific product.
   */
  async revoke({ investor_email, product_id }) {
    const { error } = await supabase
      .from('product_access')
      .delete()
      .eq('investor_email', investor_email)
      .eq('product_id', product_id)
    if (error) throw error
  },
}
