import type { Localized } from '../i18n'

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
  title: Localized
  type: QuestType
  destination: string // proper noun, same in every language (also used for matching onboarding choices)
  lat: number // placeholder coords, replace with real OSM coords
  lng: number
  radiusM: number
  rewardCoins: number
  description: Localized
  requiredObject?: 'reusable water bottle' | 'reusable utensils' | 'bus or bus ticket'
  requiredScene?: 'floating market' | 'traditional market' | 'hiking trail' | 'nature landmark'
}

export const DESTINATIONS = ['Can Tho', 'Cai Rang Floating Market', 'Ben Tre', 'Tra Su', 'Vinh Long']

export const quests: Quest[] = [
  {
    id: 'q1',
    title: { en: 'Shop at the floating market', vi: 'Mua sắm ở chợ nổi' },
    type: 'floating_market',
    destination: 'Cai Rang Floating Market',
    lat: 10.0035, lng: 105.7479, radiusM: 300, rewardCoins: 50,
    description: {
      en: 'Buy something from a boat vendor and take a photo of the market scene.',
      vi: 'Mua một món từ tiểu thương trên ghe và chụp ảnh khung cảnh chợ.',
    },
    requiredScene: 'floating market',
  },
  {
    id: 'q2',
    title: { en: 'Explore a traditional market', vi: 'Khám phá chợ truyền thống' },
    type: 'traditional_market',
    destination: 'Can Tho',
    lat: 10.0452, lng: 105.7469, radiusM: 200, rewardCoins: 30,
    description: {
      en: 'Shop at a traditional market and support small local businesses.',
      vi: 'Mua sắm ở chợ truyền thống và ủng hộ các tiểu thương địa phương.',
    },
    requiredScene: 'traditional market',
  },
  {
    id: 'q3',
    title: { en: 'Hike a nature trail', vi: 'Đi bộ đường mòn thiên nhiên' },
    type: 'hiking',
    destination: 'Tra Su',
    lat: 10.5833, lng: 105.0667, radiusM: 400, rewardCoins: 45,
    description: {
      en: 'Walk a hiking trail and take a photo of the path.',
      vi: 'Đi bộ trên một cung đường mòn và chụp ảnh con đường.',
    },
    requiredScene: 'hiking trail',
  },
  {
    id: 'q4',
    title: { en: 'Visit a nature landmark', vi: 'Tham quan danh thắng thiên nhiên' },
    type: 'nature',
    destination: 'Ben Tre',
    lat: 10.2434, lng: 106.3756, radiusM: 300, rewardCoins: 40,
    description: {
      en: 'Take a photo of a natural landmark around Ben Tre.',
      vi: 'Chụp ảnh một danh thắng thiên nhiên quanh Bến Tre.',
    },
    requiredScene: 'nature landmark',
  },
  {
    id: 'q5',
    title: { en: 'Take the bus, not a taxi', vi: 'Đi xe buýt thay vì taxi' },
    type: 'bus',
    destination: 'Can Tho',
    lat: 10.0341, lng: 105.7722, radiusM: 250, rewardCoins: 35,
    description: {
      en: 'Ride a public bus and take a photo of the bus or your ticket.',
      vi: 'Đi xe buýt công cộng và chụp ảnh xe hoặc vé của bạn.',
    },
    requiredObject: 'bus or bus ticket',
  },
  {
    id: 'q6',
    title: { en: 'Bring your own water bottle', vi: 'Mang theo bình nước cá nhân' },
    type: 'reusable_bottle',
    destination: 'Can Tho',
    lat: 10.0299, lng: 105.7685, radiusM: 500, rewardCoins: 20,
    description: {
      en: 'Take a photo of your refillable water bottle while traveling.',
      vi: 'Chụp ảnh bình nước dùng lại của bạn trong chuyến đi.',
    },
    requiredObject: 'reusable water bottle',
  },
  {
    id: 'q7',
    title: { en: 'Bring your own utensils', vi: 'Mang theo dụng cụ ăn uống cá nhân' },
    type: 'reusable_utensils',
    destination: 'Vinh Long',
    lat: 10.2537, lng: 105.9722, radiusM: 500, rewardCoins: 20,
    description: {
      en: 'Use your own utensils when eating out.',
      vi: 'Dùng dụng cụ ăn uống của riêng bạn khi đi ăn ngoài.',
    },
    requiredObject: 'reusable utensils',
  },
  {
    id: 'q8',
    title: { en: 'Redeem a coupon at a partner shop', vi: 'Dùng phiếu giảm giá tại cửa hàng đối tác' },
    type: 'redeem_coupon',
    destination: 'Can Tho',
    lat: 10.0371, lng: 105.7882, radiusM: 200, rewardCoins: 25,
    description: {
      en: 'Use a coupon by scanning its QR code at a partner shop. Completes automatically when the coupon is used.',
      vi: 'Dùng phiếu giảm giá bằng cách quét mã QR tại cửa hàng đối tác. Tự hoàn thành khi phiếu được sử dụng.',
    },
  },
]
