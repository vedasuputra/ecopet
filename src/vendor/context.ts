import { useOutletContext } from 'react-router-dom'
import type { IssuedRow, Offer, Payment, VendorInfo } from './data'

export interface VendorCtx {
  vendor: VendorInfo
  rows: IssuedRow[]
  offers: Offer[]
  payments: Payment[]
  reload: () => Promise<void>
}

export const useVendor = () => useOutletContext<VendorCtx>()
