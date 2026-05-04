import { invokeEdgeFunction } from '@/lib/invokeEdgeFunction'

export async function sendInvitationEmail(payload) {
  return invokeEdgeFunction('send-invitation-email', payload)
}
