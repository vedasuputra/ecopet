import { useOutletContext } from 'react-router-dom'
import type { IssuedRow, VendorInfo } from './data'

export interface VendorCtx {
  vendor: VendorInfo
  rows: IssuedRow[]
  reload: () => Promise<void>
}

export const useVendor = () => useOutletContext<VendorCtx>()
