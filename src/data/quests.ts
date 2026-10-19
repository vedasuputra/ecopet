export type QuestType =
  | 'floating_market'
  | 'traditional_market'
  | 'hiking'
  | 'nature'
  | 'bus'
  | 'reusable_bottle'
  | 'reusable_utensils'
  | 'redeem_coupon'

export interface Quest {
  id: string
  title: string
  type: QuestType
  destination: string
  lat: number // placeholder coords, replace with real OSM coords
  lng: number
  radiusM: number
  rewardCoins: number
  description: string
  requiredObject?: 'reusable water bottle' | 'reusable utensils' | 'bus or bus ticket'
  requiredScene?: 'floating market' | 'traditional market' | 'hiking trail' | 'nature landmark'
}

export const DESTINATIONS = ['Can Tho', 'Cai Rang Floating Market', 'Ben Tre', 'Tra Su', 'Vinh Long']

export const quests: Quest[] = [
  { id: 'q1', title: 'Belanja di pasar terapung', type: 'floating_market', destination: 'Cai Rang Floating Market', lat: 10.0035, lng: 105.7479, radiusM: 300, rewardCoins: 50, description: 'Beli sesuatu dari pedagang perahu dan foto suasana pasar.', requiredScene: 'floating market' },
  { id: 'q2', title: 'Jelajahi pasar tradisional', type: 'traditional_market', destination: 'Can Tho', lat: 10.0452, lng: 105.7469, radiusM: 200, rewardCoins: 30, description: 'Belanja di pasar tradisional dan dukung usaha mikro.', requiredScene: 'traditional market' },
  { id: 'q3', title: 'Hiking di jalur alam', type: 'hiking', destination: 'Tra Su', lat: 10.5833, lng: 105.0667, radiusM: 400, rewardCoins: 45, description: 'Berjalan di jalur hiking dan foto jalurnya.', requiredScene: 'hiking trail' },
  { id: 'q4', title: 'Kunjungi landmark alam', type: 'nature', destination: 'Ben Tre', lat: 10.2434, lng: 106.3756, radiusM: 300, rewardCoins: 40, description: 'Foto landmark alam di sekitar Ben Tre.', requiredScene: 'nature landmark' },
  { id: 'q5', title: 'Naik bus, bukan taksi', type: 'bus', destination: 'Can Tho', lat: 10.0341, lng: 105.7722, radiusM: 250, rewardCoins: 35, description: 'Naik bus umum dan foto bus atau tiketnya.', requiredObject: 'bus or bus ticket' },
  { id: 'q6', title: 'Bawa botol minum sendiri', type: 'reusable_bottle', destination: 'Can Tho', lat: 10.0299, lng: 105.7685, radiusM: 500, rewardCoins: 20, description: 'Foto botol minum isi ulangmu saat traveling.', requiredObject: 'reusable water bottle' },
  { id: 'q7', title: 'Bawa alat makan sendiri', type: 'reusable_utensils', destination: 'Vinh Long', lat: 10.2537, lng: 105.9722, radiusM: 500, rewardCoins: 20, description: 'Pakai alat makan sendiri saat makan di luar.', requiredObject: 'reusable utensils' },
  { id: 'q8', title: 'Tukar kupon di toko mitra', type: 'redeem_coupon', destination: 'Can Tho', lat: 10.0371, lng: 105.7882, radiusM: 200, rewardCoins: 25, description: 'Pakai kupon dengan scan QR di toko mitra. Otomatis selesai saat kupon dipakai.' },
]
