import { supabase } from '@/lib/supabase/client'

export async function fetchActiveRiskBands() {
  const { data, error } = await supabase
    .from('risk_bands')
    .select('code, label, badge_color, description')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

export function riskBandMap(bands) {
  return Object.fromEntries(bands.map((b) => [b.code, b]))
}

export function riskBandBadgeStyle(band, fallback = '#d4af37') {
  const color = band?.badge_color || fallback
  return {
    backgroundColor: `${color}22`,
    color,
    borderColor: `${color}66`,
  }
}
