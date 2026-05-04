import { makeEntity } from '@/lib/entityFactory'

export const SupportTicket = makeEntity('support_tickets', { defaultSortColumn: 'updated_date' })
