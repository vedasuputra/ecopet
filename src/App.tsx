import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Quests from './pages/Quests'
import QuestDetail from './pages/QuestDetail'
import MapPage from './pages/MapPage'
import MeiluChat from './pages/MeiluChat'
import Coupons from './pages/Coupons'
import CouponQR from './pages/CouponQR'
import RewardedAd from './pages/RewardedAd'
import TripCard from './pages/TripCard'
import Profile from './pages/Profile'
import DevPanel from './pages/DevPanel'
import VendorScan from './pages/VendorScan'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/quests" element={<Quests />} />
          <Route path="/quests/:id" element={<QuestDetail />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/meilu" element={<MeiluChat />} />
          <Route path="/coupons" element={<Coupons />} />
          <Route path="/coupons/:id" element={<CouponQR />} />
          <Route path="/ad" element={<RewardedAd />} />
          <Route path="/trip-card" element={<TripCard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/dev" element={<DevPanel />} />
          <Route path="/vendor" element={<VendorScan />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
