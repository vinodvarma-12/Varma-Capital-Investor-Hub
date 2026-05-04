import { makeEntity } from '@/lib/entityFactory'

export const Transaction = makeEntity('transactions', { defaultSortColumn: 'transaction_date' })
