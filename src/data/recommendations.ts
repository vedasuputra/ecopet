import type { Localized } from '../i18n'
import type { Interest } from '../lib/travelerStyle'

// Places in the Mekong Delta that the Home screen and the Explore map recommend. The descriptions are
// deliberately general (no opening hours, prices or other facts that can go out of date).
// Coordinates are approximate placeholders: replace them with the exact spots from OpenStreetMap.

export interface Recommendation {
  id: string
  name: string // proper noun, same in every language
  destination: string // one of DESTINATIONS (matches what the traveler picked in onboarding)
  lat: number
  lng: number
  tags: Interest[] // which travel interests it suits (the answers of the "what kind of traveler" quiz)
  description: Localized
}

export const RECOMMENDATIONS: Recommendation[] = [
  {
    id: 'cai-rang',
    name: 'Cai Rang Floating Market',
    destination: 'Cai Rang Floating Market',
    lat: 10.0035, lng: 105.7479,
    tags: ['markets', 'food', 'culture'],
    description: {
      en: 'One of the best-known floating markets in the Mekong Delta: traders sell fruit, vegetables and food from their boats. It is liveliest early in the morning.',
      vi: 'Một trong những chợ nổi nổi tiếng nhất miền Tây: tiểu thương bán trái cây, rau củ và đồ ăn ngay trên ghe. Chợ nhộn nhịp nhất vào sáng sớm.',
    },
  },
  {
    id: 'ninh-kieu',
    name: 'Ninh Kieu Wharf',
    destination: 'Can Tho',
    lat: 10.0334, lng: 105.7878,
    tags: ['relax', 'culture', 'food'],
    description: {
      en: 'A riverside promenade on the Hau River in the heart of Can Tho. A pleasant place for an evening walk and for watching the boats go by.',
      vi: 'Bờ kè ven sông Hậu ngay trung tâm Cần Thơ. Nơi dễ chịu để đi dạo buổi tối và ngắm những chiếc ghe qua lại.',
    },
  },
  {
    id: 'binh-thuy',
    name: 'Binh Thuy Ancient House',
    destination: 'Can Tho',
    lat: 10.0674, lng: 105.7344,
    tags: ['culture'],
    description: {
      en: 'A well-known old family house in Can Tho, a glimpse of southern Vietnamese architecture and of everyday life in the past.',
      vi: 'Một ngôi nhà cổ nổi tiếng ở Cần Thơ, cho bạn thấy kiến trúc Nam Bộ và đời sống thường ngày ngày xưa.',
    },
  },
  {
    id: 'can-tho-markets',
    name: 'Can Tho Traditional Markets',
    destination: 'Can Tho',
    lat: 10.0452, lng: 105.7469,
    tags: ['markets', 'food', 'culture'],
    description: {
      en: 'Traditional markets where local sellers offer produce, snacks and crafts. A good way to buy straight from small local businesses.',
      vi: 'Những khu chợ truyền thống nơi người bán địa phương bày rau củ, đồ ăn vặt và đồ thủ công. Cách hay để mua trực tiếp từ các tiểu thương nhỏ.',
    },
  },
  {
    id: 'ben-tre-villages',
    name: 'Coconut Villages of Ben Tre',
    destination: 'Ben Tre',
    lat: 10.2480, lng: 106.3680,
    tags: ['nature', 'relax', 'adventure'],
    description: {
      en: 'Ben Tre is known as the land of coconuts. Quiet village lanes shaded by coconut palms, lovely to explore by bicycle.',
      vi: 'Bến Tre được biết đến là xứ dừa. Những con đường làng yên tĩnh rợp bóng dừa, rất hợp để khám phá bằng xe đạp.',
    },
  },
  {
    id: 'ben-tre-candy',
    name: 'Coconut Candy Workshops, Ben Tre',
    destination: 'Ben Tre',
    lat: 10.2434, lng: 106.3756,
    tags: ['culture', 'markets', 'food'],
    description: {
      en: 'Small family workshops around Ben Tre make coconut candy by hand. Visit one and buy directly from the people who make it.',
      vi: 'Các xưởng gia đình nhỏ quanh Bến Tre làm kẹo dừa thủ công. Hãy ghé một xưởng và mua trực tiếp từ người làm ra nó.',
    },
  },
  {
    id: 'ben-tre-canals',
    name: 'Canals of Ben Tre',
    destination: 'Ben Tre',
    lat: 10.2380, lng: 106.3800,
    tags: ['adventure', 'relax', 'nature'],
    description: {
      en: 'Narrow canals around Ben Tre, best seen from a small hand-rowed boat with a local boatman.',
      vi: 'Những con kênh nhỏ quanh Bến Tre, đẹp nhất khi ngắm từ chiếc xuồng chèo tay cùng người chèo đò địa phương.',
    },
  },
  {
    id: 'tra-su-forest',
    name: 'Tra Su Cajuput Forest',
    destination: 'Tra Su',
    lat: 10.5833, lng: 105.0667,
    tags: ['nature', 'adventure', 'relax'],
    description: {
      en: 'A cajuput forest in An Giang province, famous for its green waterways. It is best explored by small boat.',
      vi: 'Khu rừng tràm ở An Giang, nổi tiếng với những dòng nước xanh phủ bèo. Đi bằng xuồng nhỏ là cách khám phá đẹp nhất.',
    },
  },
  {
    id: 'tra-su-trails',
    name: 'Tra Su Wetland Paths',
    destination: 'Tra Su',
    lat: 10.5850, lng: 105.0690,
    tags: ['nature', 'adventure'],
    description: {
      en: 'Paths at the edge of the wetlands for travelers who prefer to explore on foot.',
      vi: 'Những lối đi ven vùng đất ngập nước dành cho du khách thích khám phá bằng đôi chân.',
    },
  },
  {
    id: 'vinh-long-orchards',
    name: 'Orchards of Vinh Long',
    destination: 'Vinh Long',
    lat: 10.2537, lng: 105.9722,
    tags: ['nature', 'food', 'relax'],
    description: {
      en: 'Vinh Long is known for its fruit orchards and canals. Many orchards are family-run and sell fruit directly to visitors.',
      vi: 'Vĩnh Long nổi tiếng với những vườn trái cây và kênh rạch. Nhiều vườn do gia đình quản lý và bán trái cây trực tiếp cho khách.',
    },
  },
  {
    id: 'vinh-long-pottery',
    name: 'Pottery and Brick Kilns, Vinh Long',
    destination: 'Vinh Long',
    lat: 10.2476, lng: 105.9655,
    tags: ['culture', 'markets'],
    description: {
      en: 'The Vinh Long area is known for traditional pottery and brick kilns, many of them run by families.',
      vi: 'Vùng Vĩnh Long nổi tiếng với nghề gốm và lò gạch truyền thống, nhiều cơ sở do gia đình điều hành.',
    },
  },
  {
    id: 'van-thanh',
    name: 'Van Thanh Temple',
    destination: 'Vinh Long',
    lat: 10.2480, lng: 105.9660,
    tags: ['culture'],
    description: {
      en: 'A historic temple in Vinh Long city, a quiet place to learn about local history and culture.',
      vi: 'Một ngôi miếu cổ ở thành phố Vĩnh Long, nơi yên tĩnh để tìm hiểu lịch sử và văn hóa địa phương.',
    },
  },
  {
    id: 'vinh-long-street-food',
    name: 'Street Food in Vinh Long',
    destination: 'Vinh Long',
    lat: 10.2531, lng: 105.9731,
    tags: ['food', 'markets'],
    description: {
      en: 'Small street food stalls in Vinh Long city, a good way to taste local dishes and support the people who cook them.',
      vi: 'Những quầy ăn vặt đường phố ở thành phố Vĩnh Long, cách hay để thưởng thức món địa phương và ủng hộ người nấu.',
    },
  },
]
