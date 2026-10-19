export interface Vendor {
  id: string
  name: string
  category: string
  lat: number // placeholder coords
  lng: number
}

export const vendors: Vendor[] = [
  { id: 'v1', name: 'Ba Tu Fruit Boat', category: 'Buah & minuman', lat: 10.0038, lng: 105.7485 },
  { id: 'v2', name: 'Cafe Sen Xanh', category: 'Kafe', lat: 10.0455, lng: 105.7475 },
  { id: 'v3', name: 'Banh Xeo Co Lan', category: 'Kuliner', lat: 10.0442, lng: 105.7461 },
  { id: 'v4', name: 'Coconut Candy Ben Tre', category: 'Oleh-oleh', lat: 10.2438, lng: 106.3761 },
  { id: 'v5', name: 'Mekong Craft Corner', category: 'Kerajinan', lat: 10.0345, lng: 105.7728 },
  { id: 'v6', name: 'Green Bike Rental', category: 'Sewa sepeda', lat: 10.0372, lng: 105.7879 },
]
