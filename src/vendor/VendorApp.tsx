import { Route, Routes } from 'react-router-dom'
import Billing from './Billing'
import Fees from './Fees'
import Offers from './Offers'
import Overview from './Overview'
import Redemptions from './Redemptions'
import Scan from './Scan'
import VendorLogin from './VendorLogin'
import VendorShell from './VendorShell'
import './vendor.css'

// Mounted at /vendor/*. Separate from the traveler app: no phone frame, responsive for laptop and phone.
export default function VendorApp() {
  return (
    <div className="v-app">
      <Routes>
        <Route path="login" element={<VendorLogin />} />
        <Route element={<VendorShell />}>
          <Route index element={<Overview />} />
          <Route path="scan" element={<Scan />} />
          <Route path="coupons" element={<Offers />} />
          <Route path="redemptions" element={<Redemptions />} />
          <Route path="fees" element={<Fees />} />
          <Route path="billing" element={<Billing />} />
        </Route>
      </Routes>
    </div>
  )
}
