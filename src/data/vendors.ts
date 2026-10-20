import type { Localized } from '../i18n'
import type { OpenHours } from '../lib/openHours'

export interface Vendor {
  id: string
  name: string
  category: Localized
  lat: number // the demo shops are made up; they sit in the towns where such a shop would be
  lng: number
  kind?: 'food_drink' | 'shopping' | 'activity' | 'other' // what the shop sells (chosen by the vendor)
  address?: string
  openHours?: OpenHours | null // null/undefined = the shop has not said when it is open
}

export const vendors: Vendor[] = [
  { id: 'v1', kind: 'food_drink', name: 'Ba Tu Fruit Boat', category: { en: 'Fruit & drinks', vi: 'Trái cây & đồ uống' }, lat: 10.0026, lng: 105.7447 },
  { id: 'v2', kind: 'food_drink', name: 'Cafe Sen Xanh', category: { en: 'Cafe', vi: 'Quán cà phê' }, lat: 10.0329, lng: 105.7869 },
  { id: 'v3', kind: 'food_drink', name: 'Banh Xeo Co Lan', category: { en: 'Food', vi: 'Ẩm thực' }, lat: 10.0322, lng: 105.7871 },
  { id: 'v4', kind: 'shopping', name: 'Coconut Candy Ben Tre', category: { en: 'Souvenirs', vi: 'Quà lưu niệm' }, lat: 10.3332, lng: 106.357 },
  { id: 'v5', kind: 'shopping', name: 'Mekong Craft Corner', category: { en: 'Crafts', vi: 'Đồ thủ công' }, lat: 10.0346, lng: 105.788 },
  { id: 'v6', kind: 'activity', name: 'Green Bike Rental', category: { en: 'Bike rental', vi: 'Cho thuê xe đạp' }, lat: 10.034, lng: 105.7882 },
]
