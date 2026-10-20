import type { Localized } from '../i18n'

export interface Vendor {
  id: string
  name: string
  category: Localized
  lat: number // the demo shops are made up; they sit in the towns where such a shop would be
  lng: number
}

export const vendors: Vendor[] = [
  { id: 'v1', name: 'Ba Tu Fruit Boat', category: { en: 'Fruit & drinks', vi: 'Trái cây & đồ uống' }, lat: 10.0026, lng: 105.7447 },
  { id: 'v2', name: 'Cafe Sen Xanh', category: { en: 'Cafe', vi: 'Quán cà phê' }, lat: 10.0329, lng: 105.7869 },
  { id: 'v3', name: 'Banh Xeo Co Lan', category: { en: 'Food', vi: 'Ẩm thực' }, lat: 10.0322, lng: 105.7871 },
  { id: 'v4', name: 'Coconut Candy Ben Tre', category: { en: 'Souvenirs', vi: 'Quà lưu niệm' }, lat: 10.3332, lng: 106.357 },
  { id: 'v5', name: 'Mekong Craft Corner', category: { en: 'Crafts', vi: 'Đồ thủ công' }, lat: 10.0346, lng: 105.788 },
  { id: 'v6', name: 'Green Bike Rental', category: { en: 'Bike rental', vi: 'Cho thuê xe đạp' }, lat: 10.034, lng: 105.7882 },
]
