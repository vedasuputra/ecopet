import type { Localized } from '../i18n'

export type QuestType =
  | 'floating_market'
  | 'traditional_market'
  | 'hiking'
  | 'bus'
  | 'reusable_bottle'
  | 'reusable_utensils'
  | 'redeem_coupon'
  | 'local_food'
  | 'rowing'
  | 'cycling'
  | 'craft'
  | 'local_goods'
  | 'orchard'

/**
 * 'place': only doable at one spot (pays more). Shown in the itinerary for the places the traveler goes to.
 * 'general': doable anywhere (pays less). Always shown in the Quests tab; no location check.
 *
 * Every quest is either sustainable (no motor, own bottle, public transport...) or supports small local
 * businesses (UMKM / family stalls, workshops, orchards), and is checked with the same photo + location verification.
 */
export type QuestScope = 'place' | 'general'

export interface Quest {
  id: string
  title: Localized
  type: QuestType
  scope: QuestScope
  destination: string // proper noun, same in every language (also used for matching onboarding choices); '' for general quests
  lat: number // placeholder coords, replace with real OSM coords; 0 for general quests (never used)
  lng: number
  radiusM: number // 0 for general quests
  rewardCoins: number
  description: Localized
  /** What the photo must show as evidence of the purchase or the sustainable action (sent to the AI, English). */
  photoProof?: string
  requiredObject?: 'reusable water bottle' | 'reusable utensils' | 'bus or bus ticket'
  requiredScene?:
    | 'floating market'
    | 'traditional market'
    | 'hiking trail'
    | 'local food stall'
    | 'hand-rowed boat without a motor'
    | 'bicycle'
    | 'family craft workshop'
    | 'fruit orchard'
    | 'local product stall'
}

export const isGeneral = (q: { scope?: QuestScope }) => q.scope === 'general'

export const DESTINATIONS = ['Can Tho', 'Cai Rang Floating Market', 'Ben Tre', 'Tra Su', 'Vinh Long']

export const quests: Quest[] = [
  {
    id: 'q1',
    scope: 'place',
    title: { en: 'Shop at the floating market', vi: 'Mua sắm ở chợ nổi' },
    type: 'floating_market',
    destination: 'Cai Rang Floating Market',
    lat: 10.0035, lng: 105.7479, radiusM: 300, rewardCoins: 32,
    description: {
      en: 'Buy something from a boat vendor and take a photo of the market scene.',
      vi: 'Mua một món từ tiểu thương trên ghe và chụp ảnh khung cảnh chợ.',
    },
    requiredScene: 'floating market',
    photoProof: 'an item bought from a boat vendor (fruit, drink or food) held or on the boat, with the floating market around it, or the vendor boat with its goods',
  },
  {
    id: 'q2',
    scope: 'place',
    title: { en: 'Explore a traditional market', vi: 'Khám phá chợ truyền thống' },
    type: 'traditional_market',
    destination: 'Can Tho',
    lat: 10.0452, lng: 105.7469, radiusM: 200, rewardCoins: 25,
    description: {
      en: 'Shop at a traditional market and support small local businesses.',
      vi: 'Mua sắm ở chợ truyền thống và ủng hộ các tiểu thương địa phương.',
    },
    requiredScene: 'traditional market',
    photoProof: 'something bought at the market (produce or goods) in hand or in a bag, or a market stall with its seller and goods',
  },
  {
    id: 'q3',
    scope: 'place',
    title: { en: 'Explore Tra Su on foot', vi: 'Khám phá Trà Sư bằng đôi chân' },
    type: 'hiking',
    destination: 'Tra Su',
    lat: 10.5833, lng: 105.0667, radiusM: 400, rewardCoins: 38,
    description: {
      en: 'Walk a trail on foot (no motor) and take a photo of the path.',
      vi: 'Đi bộ trên đường mòn (không dùng xe) và chụp ảnh con đường.',
    },
    requiredScene: 'hiking trail',
    photoProof: 'the trail walked on foot, with the person\'s feet or path in view and no motor vehicle on the path',
  },
  {
    id: 'q4',
    scope: 'place',
    title: { en: 'Visit a coconut candy workshop', vi: 'Ghé xưởng kẹo dừa' },
    type: 'craft',
    destination: 'Ben Tre',
    lat: 10.2434, lng: 106.3756, radiusM: 300, rewardCoins: 30,
    description: {
      en: 'Visit a small family workshop, buy something made by hand, and take a photo of the workshop or your purchase.',
      vi: 'Ghé một xưởng gia đình nhỏ, mua một món làm thủ công và chụp ảnh xưởng hoặc món bạn mua.',
    },
    requiredScene: 'family craft workshop',
    photoProof: 'the family workshop where the product is made, or a handmade product (for example coconut candy) that was bought there',
  },
  {
    id: 'q5',
    scope: 'general',
    title: { en: 'Take the bus, not a taxi', vi: 'Đi xe buýt thay vì taxi' },
    type: 'bus',
    destination: '',
    lat: 0, lng: 0, radiusM: 0, rewardCoins: 20,
    description: {
      en: 'Ride a public bus and take a photo of the bus or your ticket.',
      vi: 'Đi xe buýt công cộng và chụp ảnh xe hoặc vé của bạn.',
    },
    requiredObject: 'bus or bus ticket',
  },
  {
    id: 'q6',
    scope: 'general',
    title: { en: 'Bring your own water bottle', vi: 'Mang theo bình nước cá nhân' },
    type: 'reusable_bottle',
    destination: '',
    lat: 0, lng: 0, radiusM: 0, rewardCoins: 10,
    description: {
      en: 'Take a photo of your refillable water bottle while traveling.',
      vi: 'Chụp ảnh bình nước dùng lại của bạn trong chuyến đi.',
    },
    requiredObject: 'reusable water bottle',
  },
  {
    id: 'q7',
    scope: 'general',
    title: { en: 'Bring your own utensils', vi: 'Mang theo dụng cụ ăn uống cá nhân' },
    type: 'reusable_utensils',
    destination: '',
    lat: 0, lng: 0, radiusM: 0, rewardCoins: 12,
    description: {
      en: 'Use your own utensils when eating out.',
      vi: 'Dùng dụng cụ ăn uống của riêng bạn khi đi ăn ngoài.',
    },
    requiredObject: 'reusable utensils',
  },
  {
    id: 'q8',
    scope: 'general',
    title: { en: 'Redeem a coupon at a partner shop', vi: 'Dùng phiếu giảm giá tại cửa hàng đối tác' },
    type: 'redeem_coupon',
    destination: '',
    lat: 0, lng: 0, radiusM: 0, rewardCoins: 15,
    description: {
      en: 'Use a coupon by scanning its QR code at a partner shop. Completes automatically when the coupon is used.',
      vi: 'Dùng phiếu giảm giá bằng cách quét mã QR tại cửa hàng đối tác. Tự hoàn thành khi phiếu được sử dụng.',
    },
  },
  {
    id: 'q9',
    scope: 'place',
    title: { en: 'Buy fruit at a family orchard', vi: 'Mua trái cây ở vườn của gia đình' },
    type: 'orchard',
    destination: 'Vinh Long',
    lat: 10.2537, lng: 105.9722, radiusM: 400, rewardCoins: 30,
    description: {
      en: 'Visit a family-run fruit orchard, buy fruit straight from the grower, and take a photo of the orchard or your fruit.',
      vi: 'Ghé một vườn trái cây của gia đình, mua trái cây trực tiếp từ nhà vườn và chụp ảnh vườn hoặc trái cây của bạn.',
    },
    requiredScene: 'fruit orchard',
    photoProof: 'fruit bought from the grower, or the family orchard with its fruit trees or fruit on display',
  },
  {
    id: 'q10',
    scope: 'place',
    title: { en: 'Cycle along the Hau River', vi: 'Đạp xe dọc sông Hậu' },
    type: 'cycling',
    destination: 'Can Tho',
    lat: 10.0334, lng: 105.7878, radiusM: 300, rewardCoins: 40,
    description: {
      en: 'See Ninh Kieu by bicycle instead of a motorbike or car, and take a photo of your bike by the river.',
      vi: 'Ngắm bến Ninh Kiều bằng xe đạp thay vì xe máy hay ô tô, và chụp ảnh chiếc xe đạp của bạn bên sông.',
    },
    requiredScene: 'bicycle',
    photoProof: 'a bicycle (clearly a bicycle, not a motorbike) with the river or riverside in the background',
  },
  {
    id: 'q11',
    scope: 'place',
    title: { en: 'Eat at a family-run eatery', vi: 'Ăn ở quán ăn gia đình' },
    type: 'local_food',
    destination: 'Can Tho',
    lat: 10.0674, lng: 105.7344, radiusM: 300, rewardCoins: 25,
    description: {
      en: 'Try a local dish at a small family-run eatery and take a photo of your meal.',
      vi: 'Thử một món địa phương ở quán ăn nhỏ của gia đình và chụp ảnh bữa ăn của bạn.',
    },
    requiredScene: 'local food stall',
    photoProof: 'a served dish or meal on the table of a small family-run eatery',
  },
  {
    id: 'q12',
    scope: 'place',
    title: { en: 'Breakfast on the water', vi: 'Ăn sáng trên sông' },
    type: 'local_food',
    destination: 'Cai Rang Floating Market',
    lat: 10.0038, lng: 105.7483, radiusM: 300, rewardCoins: 28,
    description: {
      en: 'Eat a noodle breakfast at a small floating-market stall and take a photo of your bowl.',
      vi: 'Ăn sáng món nước ở một quầy nhỏ trên chợ nổi và chụp ảnh tô của bạn.',
    },
    requiredScene: 'local food stall',
    photoProof: 'a bowl of food served at a small floating-market stall, with the water or boats visible',
  },
  {
    id: 'q13',
    scope: 'place',
    title: { en: 'Row through the canals with a local family', vi: 'Chèo xuồng qua kênh rạch cùng gia đình địa phương' },
    type: 'rowing',
    destination: 'Cai Rang Floating Market',
    lat: 10.002, lng: 105.75, radiusM: 400, rewardCoins: 35,
    description: {
      en: 'Hire a hand-rowed boat from a local family (no motor, no pollution) and take a photo of your boat on the water.',
      vi: 'Thuê xuồng chèo tay của một gia đình địa phương (không động cơ, không khói) và chụp ảnh chiếc xuồng của bạn trên mặt nước.',
    },
    requiredScene: 'hand-rowed boat without a motor',
    photoProof: 'a small boat moved by oars or a paddle (no engine) on the water, ideally with the boatman or rower',
  },
  {
    id: 'q14',
    scope: 'place',
    title: { en: 'Cycle through the coconut villages', vi: 'Đạp xe qua các làng dừa' },
    type: 'cycling',
    destination: 'Ben Tre',
    lat: 10.248, lng: 106.368, radiusM: 400, rewardCoins: 40,
    description: {
      en: 'Explore the village lanes by bicycle and take a photo of your bike among the coconut trees.',
      vi: 'Khám phá những con đường làng bằng xe đạp và chụp ảnh chiếc xe đạp của bạn giữa hàng dừa.',
    },
    requiredScene: 'bicycle',
    photoProof: 'a bicycle (clearly a bicycle, not a motorbike) on a village lane or among coconut trees',
  },
  {
    id: 'q15',
    scope: 'place',
    title: { en: 'Take a hand-rowed boat in Ben Tre', vi: 'Đi xuồng chèo tay ở Bến Tre' },
    type: 'rowing',
    destination: 'Ben Tre',
    lat: 10.238, lng: 106.38, radiusM: 400, rewardCoins: 35,
    description: {
      en: 'Ride a hand-rowed boat through the narrow canals, run by a local boatman, and take a photo of it.',
      vi: 'Đi xuồng chèo tay qua những con kênh nhỏ do người dân địa phương chèo, và chụp ảnh chiếc xuồng.',
    },
    requiredScene: 'hand-rowed boat without a motor',
    photoProof: 'a small boat moved by oars or a paddle (no engine) on a narrow canal, ideally with the boatman or rower',
  },
  {
    id: 'q16',
    scope: 'place',
    title: { en: 'Paddle through the cajuput forest', vi: 'Chèo xuồng qua rừng tràm' },
    type: 'rowing',
    destination: 'Tra Su',
    lat: 10.579, lng: 105.064, radiusM: 400, rewardCoins: 36,
    description: {
      en: 'Take a hand-rowed boat run by the local community and take a photo of the boat among the trees.',
      vi: 'Đi xuồng chèo tay do cộng đồng địa phương vận hành và chụp ảnh chiếc xuồng giữa rừng tràm.',
    },
    requiredScene: 'hand-rowed boat without a motor',
    photoProof: 'a small boat moved by oars or a paddle (no engine) among the cajuput trees on the water',
  },
  {
    id: 'q17',
    scope: 'place',
    title: { en: 'Buy a local specialty at a small stall', vi: 'Mua đặc sản địa phương ở quầy nhỏ' },
    type: 'local_goods',
    destination: 'Tra Su',
    lat: 10.585, lng: 105.069, radiusM: 400, rewardCoins: 25,
    description: {
      en: 'Buy a local product (honey, dried fish, snacks) from a small stall and take a photo of the stall or your purchase.',
      vi: 'Mua một sản phẩm địa phương (mật ong, khô cá, bánh kẹo) ở một quầy nhỏ và chụp ảnh quầy hoặc món bạn mua.',
    },
    requiredScene: 'local product stall',
    photoProof: 'a local product that was bought, or the small stall selling it with its goods on display',
  },
  {
    id: 'q18',
    scope: 'place',
    title: { en: 'Visit a family pottery workshop', vi: 'Ghé xưởng gốm của gia đình' },
    type: 'craft',
    destination: 'Vinh Long',
    lat: 10.2476, lng: 105.9655, radiusM: 300, rewardCoins: 32,
    description: {
      en: 'Visit a small family pottery or brick workshop, buy something made by hand, and take a photo of it.',
      vi: 'Ghé một xưởng gốm hoặc gạch nhỏ của gia đình, mua một món làm thủ công và chụp ảnh.',
    },
    requiredScene: 'family craft workshop',
    photoProof: 'handmade pottery or brick products bought, or the small family workshop where they are made',
  },
  {
    id: 'q19',
    scope: 'place',
    title: { en: 'Taste Vinh Long street food', vi: 'Thưởng thức ẩm thực đường phố Vĩnh Long' },
    type: 'local_food',
    destination: 'Vinh Long',
    lat: 10.2531, lng: 105.9731, radiusM: 300, rewardCoins: 25,
    description: {
      en: 'Try a local dish at a street food stall and take a photo of it.',
      vi: 'Thử một món địa phương ở quầy ăn vặt đường phố và chụp ảnh món ăn.',
    },
    requiredScene: 'local food stall',
    photoProof: 'a dish served at a street food stall, with the stall or vendor setting visible',
  },
]
