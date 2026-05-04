import { invokeEdgeFunction } from '@/lib/invokeEdgeFunction'

export async function generateOTP(payload) {
  const data = await invokeEdgeFunction('generate-otp', payload)
  return { data }
}
