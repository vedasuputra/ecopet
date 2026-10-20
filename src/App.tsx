import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import QuestDetail from './pages/QuestDetail'
import Explore from './pages/Explore'
import MeiluChat from './pages/MeiluChat'
import CouponInfo from './pages/CouponInfo'
import CouponQR from './pages/CouponQR'
import RewardedAd from './pages/RewardedAd'
import TripCard from './pages/TripCard'
import Profile from './pages/Profile'
import DevPanel from './pages/DevPanel'
import VendorApp from './vendor/VendorApp'
import WelcomeGift from './pages/WelcomeGift'
import AdminApp from './admin/AdminApp'
import Screens from './pages/Screens'
import ShopPopup from './pages/ShopPopup'
import Landing from './site/Landing'
import Privacy from './site/Privacy'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public website pages and the vendor dashboard: normal responsive web pages, outside the phone frame */}
        <Route path="/" element={<Landing />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/vendor/*" element={<VendorApp />} />
        <Route element={<Layout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<Onboarding />} />
          {/* Home, Quests and Coupons stay on screen under their popups (see Screens) */}
          <Route element={<Screens />}>
            <Route path="/home" element={null} />
            <Route path="/gift" element={<WelcomeGift />} />
            <Route path="/itinerary" element={null} />
            <Route path="/quests" element={null} />
            <Route path="/quests/:id" element={<QuestDetail />} />
            <Route path="/coupons" element={null} />
            <Route path="/coupons/:id" element={<CouponQR />} />
            <Route path="/offers/:id" element={<CouponInfo />} />
            <Route path="/shops/:id" element={<ShopPopup />} />
          </Route>
          <Route path="/explore" element={<Explore />} />
          <Route path="/map" element={<Navigate to="/explore" replace />} />
          <Route path="/meilu" element={<MeiluChat />} />
          <Route path="/ad" element={<RewardedAd />} />
          <Route path="/trip-card" element={<TripCard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/dev" element={<DevPanel />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
