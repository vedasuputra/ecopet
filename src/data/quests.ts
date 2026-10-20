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
  | 'flowers'

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
  lat: number // from OpenStreetMap / Wikidata; 0 for general quests (never used)
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
    | 'flower garden'
}

export const isGeneral = (q: { scope?: QuestScope }) => q.scope === 'general'

export const DESTINATIONS = ['Can Tho', 'Cai Rang Floating Market', 'Ben Tre', 'Vinh Long', 'My Tho', 'Sa Dec', 'Chau Doc', 'Tra Su']

export const quests: Quest[] = [
  {
    id: 'q1',
    scope: 'place',
    title: { en: 'Shop at the floating market', vi: 'Mua sắm ở chợ nổi' },
    type: 'floating_market',
    destination: 'Cai Rang Floating Market',
    lat: 10.0024, lng: 105.74439, radiusM: 400, rewardCoins: 32,
    description: {
      en: 'Buy something from a boat vendor at Cai Rang and take a photo of it with the market around you. Go early: it is busiest from about 5 to 8 am.',
      vi: 'Mua một món từ ghe hàng ở chợ nổi Cái Răng và chụp ảnh món đó cùng khung cảnh chợ. Hãy đi sớm: chợ đông nhất từ khoảng 5 đến 8 giờ sáng.',
    },
    requiredScene: 'floating market',
    photoProof: 'an item bought from a boat vendor (fruit, drink or food) held or on the boat, with the floating market around it, or the vendor boat with its goods',
  },
  {
    id: 'q2',
    scope: 'place',
    title: { en: 'Shop at a stall by Ninh Kieu', vi: 'Mua sắm ở quầy hàng bến Ninh Kiều' },
    type: 'traditional_market',
    destination: 'Can Tho',
    lat: 10.03153, lng: 105.78757, radiusM: 350, rewardCoins: 25,
    description: {
      en: 'Buy something from a small stall at the market by Ninh Kieu Wharf and take a photo of the stall or your purchase.',
      vi: 'Mua một món ở quầy hàng nhỏ tại khu chợ cạnh bến Ninh Kiều và chụp ảnh quầy hoặc món bạn mua.',
    },
    requiredScene: 'traditional market',
    photoProof: 'something bought at a market stall in hand or in a bag, or the stall with its seller and goods',
  },
  {
    id: 'q3',
    scope: 'place',
    title: { en: 'Explore Tra Su on foot', vi: 'Khám phá Trà Sư bằng đôi chân' },
    type: 'hiking',
    destination: 'Tra Su',
    lat: 10.5859, lng: 105.05827, radiusM: 1500, rewardCoins: 38,
    description: {
      en: 'Walk the long bamboo walkway through the cajuput forest and take a photo of the path.',
      vi: 'Đi bộ trên cây cầu tre dài xuyên rừng tràm và chụp ảnh con đường.',
    },
    requiredScene: 'hiking trail',
    photoProof: 'the bamboo walkway or forest path walked on foot, with no motor vehicle on it',
  },
  {
    id: 'q4',
    scope: 'place',
    title: { en: 'Visit a coconut candy workshop', vi: 'Ghé xưởng kẹo dừa' },
    type: 'craft',
    destination: 'Ben Tre',
    lat: 10.33363, lng: 106.35728, radiusM: 800, rewardCoins: 30,
    description: {
      en: 'On Con Phung islet, watch coconut candy being made by hand, buy some, and take a photo of the workshop or your candy.',
      vi: 'Trên cồn Phụng, xem kẹo dừa được làm thủ công, mua một ít và chụp ảnh xưởng hoặc kẹo của bạn.',
    },
    requiredScene: 'family craft workshop',
    photoProof: 'the workshop where the coconut candy is made, or handmade coconut candy that was bought there',
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
    title: { en: 'Buy fruit on An Binh island', vi: 'Mua trái cây trên cù lao An Bình' },
    type: 'orchard',
    destination: 'Vinh Long',
    lat: 10.2932, lng: 105.9868, radiusM: 3000, rewardCoins: 30,
    description: {
      en: 'An Binh island, across the river from Vinh Long city, is covered in family fruit orchards. Buy fruit straight from a grower and take a photo of the orchard or your fruit.',
      vi: 'Cù lao An Bình, bên kia sông đối diện thành phố Vĩnh Long, có rất nhiều vườn trái cây của gia đình. Mua trái cây trực tiếp từ nhà vườn và chụp ảnh vườn hoặc trái cây của bạn.',
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
    lat: 10.03369, lng: 105.78843, radiusM: 500, rewardCoins: 40,
    description: {
      en: 'See Ninh Kieu Wharf by bicycle instead of a motorbike or car, and take a photo of your bike by the river.',
      vi: 'Ngắm bến Ninh Kiều bằng xe đạp thay vì xe máy hay ô tô, và chụp ảnh chiếc xe đạp của bạn bên sông.',
    },
    requiredScene: 'bicycle',
    photoProof: 'a bicycle (clearly a bicycle, not a motorbike) with the river or riverside in the background',
  },
  {
    id: 'q11',
    scope: 'place',
    title: { en: 'Buy from the boats at Phong Dien', vi: 'Mua hàng trên ghe ở chợ nổi Phong Điền' },
    type: 'floating_market',
    destination: 'Can Tho',
    lat: 9.99374, lng: 105.66771, radiusM: 600, rewardCoins: 30,
    description: {
      en: 'Phong Dien is a small, quiet floating market southwest of Can Tho city. Buy something from a boat and take a photo. Its busiest time is very early, roughly 5:30 to 6:30 am.',
      vi: 'Phong Điền là chợ nổi nhỏ, yên bình phía tây nam trung tâm Cần Thơ. Mua một món trên ghe và chụp ảnh. Chợ đông nhất rất sớm, khoảng 5 giờ 30 đến 6 giờ 30 sáng.',
    },
    requiredScene: 'floating market',
    photoProof: 'an item bought from a boat vendor held or on the boat, with the river market around it',
  },
  {
    id: 'q12',
    scope: 'place',
    title: { en: 'Breakfast on the water', vi: 'Ăn sáng trên sông' },
    type: 'local_food',
    destination: 'Cai Rang Floating Market',
    lat: 10.0024, lng: 105.74439, radiusM: 400, rewardCoins: 28,
    description: {
      en: 'Eat a noodle breakfast from a small boat or stall at the floating market and take a photo of your bowl.',
      vi: 'Ăn sáng món nước từ một ghe hoặc quầy nhỏ ở chợ nổi và chụp ảnh tô của bạn.',
    },
    requiredScene: 'local food stall',
    photoProof: 'a bowl of food served at a small floating-market boat or stall, with the water or boats visible',
  },
  {
    id: 'q13',
    scope: 'place',
    title: { en: 'Watch rice noodles being made', vi: 'Xem làm hủ tiếu' },
    type: 'craft',
    destination: 'Cai Rang Floating Market',
    lat: 10.008, lng: 105.736, radiusM: 3000, rewardCoins: 30,
    description: {
      en: 'Visit a family rice-noodle (hu tieu) workshop on the road near Cai Rang, buy a pack, and take a photo of the noodle sheets or your purchase.',
      vi: 'Ghé một lò hủ tiếu gia đình trên đường gần Cái Răng, mua một gói và chụp ảnh những tấm bánh hoặc món bạn mua.',
    },
    requiredScene: 'family craft workshop',
    photoProof: 'rice noodle sheets being made or drying in the sun, or a pack of noodles bought at the workshop',
  },
  {
    id: 'q14',
    scope: 'place',
    title: { en: 'Cycle through the coconut lanes', vi: 'Đạp xe qua các con đường dừa' },
    type: 'cycling',
    destination: 'Ben Tre',
    lat: 10.33363, lng: 106.35728, radiusM: 2500, rewardCoins: 40,
    description: {
      en: 'Explore the quiet village lanes around Con Phung by bicycle and take a photo of your bike among the coconut palms.',
      vi: 'Khám phá những con đường làng yên tĩnh quanh cồn Phụng bằng xe đạp và chụp ảnh chiếc xe đạp của bạn giữa hàng dừa.',
    },
    requiredScene: 'bicycle',
    photoProof: 'a bicycle (clearly a bicycle, not a motorbike) on a village lane or among coconut palms',
  },
  {
    id: 'q15',
    scope: 'place',
    title: { en: 'Buy coconut products at Ben Tre market', vi: 'Mua sản phẩm từ dừa ở chợ Bến Tre' },
    type: 'local_goods',
    destination: 'Ben Tre',
    lat: 10.23499, lng: 106.37597, radiusM: 400, rewardCoins: 25,
    description: {
      en: 'Ben Tre is known as the land of coconuts. Buy a coconut product (candy, oil, a coconut-wood craft) from a small seller at the market and take a photo.',
      vi: 'Bến Tre được gọi là xứ dừa. Mua một sản phẩm từ dừa (kẹo, dầu dừa, đồ gỗ dừa) của một người bán nhỏ ở chợ và chụp ảnh.',
    },
    requiredScene: 'local product stall',
    photoProof: 'a coconut product that was bought, or the small stall selling it with its goods on display',
  },
  {
    id: 'q16',
    scope: 'place',
    title: { en: 'Paddle into the cajuput forest', vi: 'Chèo xuồng vào rừng tràm' },
    type: 'rowing',
    destination: 'Tra Su',
    lat: 10.5859, lng: 105.05827, radiusM: 1500, rewardCoins: 36,
    description: {
      en: 'After the motorboat, switch to a small rowboat through the duckweed deeper into the forest, and take a photo of it. Birds are most active around 7 to 9 am and 4 to 5 pm.',
      vi: 'Sau chặng ca nô, chuyển sang xuồng chèo nhỏ len qua lớp bèo vào sâu trong rừng, và chụp ảnh chiếc xuồng. Chim hoạt động nhiều nhất khoảng 7 đến 9 giờ sáng và 4 đến 5 giờ chiều.',
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
    lat: 10.5859, lng: 105.05827, radiusM: 1500, rewardCoins: 25,
    description: {
      en: 'Buy a local product from a small stall near the forest entrance and take a photo of the stall or your purchase.',
      vi: 'Mua một sản phẩm địa phương ở quầy nhỏ gần cổng rừng và chụp ảnh quầy hoặc món bạn mua.',
    },
    requiredScene: 'local product stall',
    photoProof: 'a local product that was bought, or the small stall selling it with its goods on display',
  },
  {
    id: 'q18',
    scope: 'place',
    title: { en: 'Visit the Mang Thit kilns', vi: 'Ghé lò gạch gốm Mang Thít' },
    type: 'craft',
    destination: 'Vinh Long',
    lat: 10.12594, lng: 106.09038, radiusM: 4000, rewardCoins: 32,
    description: {
      en: 'The Mang Thit area is known for its traditional brick and pottery kilns. Visit a family workshop that still fires pottery, buy a small piece, and take a photo.',
      vi: 'Vùng Mang Thít nổi tiếng với các lò gạch gốm truyền thống. Ghé một cơ sở gia đình còn nung gốm, mua một món nhỏ và chụp ảnh.',
    },
    requiredScene: 'family craft workshop',
    photoProof: 'a brick or pottery kiln, or handmade pottery bought from a family workshop',
  },
  {
    id: 'q19',
    scope: 'place',
    title: { en: 'Cycle An Binh island', vi: 'Đạp xe trên cù lao An Bình' },
    type: 'cycling',
    destination: 'Vinh Long',
    lat: 10.2932, lng: 105.9868, radiusM: 3000, rewardCoins: 40,
    description: {
      en: 'The narrow lanes of An Binh island have little traffic and are great for cycling. Explore by bicycle and take a photo of your bike on the island.',
      vi: 'Những con đường nhỏ trên cù lao An Bình ít xe cộ, rất hợp để đạp xe. Khám phá bằng xe đạp và chụp ảnh chiếc xe đạp của bạn trên cù lao.',
    },
    requiredScene: 'bicycle',
    photoProof: 'a bicycle (clearly a bicycle, not a motorbike) on a lane among orchards or by the water',
  },
  {
    id: 'q20',
    scope: 'place',
    title: { en: 'Row through the water-coconut canals', vi: 'Đi xuồng qua kênh rạch dừa nước' },
    type: 'rowing',
    destination: 'My Tho',
    lat: 10.33241, lng: 106.3207, radiusM: 1800, rewardCoins: 36,
    description: {
      en: 'On Thoi Son island, take a small three-plank sampan rowed by a local through the narrow water-coconut canals, and take a photo of your boat.',
      vi: 'Trên cồn Thới Sơn, đi chiếc xuồng ba lá do người dân địa phương chèo qua những con rạch nhỏ rợp dừa nước, và chụp ảnh chiếc xuồng.',
    },
    requiredScene: 'hand-rowed boat without a motor',
    photoProof: 'a small boat moved by oars or a paddle (no engine) in a narrow canal lined with water-coconut palms',
  },
  {
    id: 'q21',
    scope: 'place',
    title: { en: 'Buy honey from a Thoi Son family', vi: 'Mua mật ong của một gia đình ở Thới Sơn' },
    type: 'local_goods',
    destination: 'My Tho',
    lat: 10.33241, lng: 106.3207, radiusM: 1800, rewardCoins: 30,
    description: {
      en: 'Families on Thoi Son island keep bees and make coconut candy. Buy honey or candy from them and take a photo.',
      vi: 'Các gia đình trên cồn Thới Sơn nuôi ong và làm kẹo dừa. Mua mật ong hoặc kẹo của họ và chụp ảnh.',
    },
    requiredScene: 'local product stall',
    photoProof: 'honey or coconut candy that was bought, or the family stall or bee farm selling it',
  },
  {
    id: 'q22',
    scope: 'place',
    title: { en: 'Shop at My Tho market', vi: 'Mua sắm ở chợ Mỹ Tho' },
    type: 'traditional_market',
    destination: 'My Tho',
    lat: 10.35724, lng: 106.36789, radiusM: 400, rewardCoins: 25,
    description: {
      en: 'Buy something from a small seller at My Tho market and take a photo of the stall or your purchase.',
      vi: 'Mua một món của người bán nhỏ ở chợ Mỹ Tho và chụp ảnh quầy hoặc món bạn mua.',
    },
    requiredScene: 'traditional market',
    photoProof: 'something bought at a market stall in hand or in a bag, or the stall with its seller and goods',
  },
  {
    id: 'q23',
    scope: 'place',
    title: { en: 'Buy a plant at the flower village', vi: 'Mua cây hoa ở làng hoa' },
    type: 'flowers',
    destination: 'Sa Dec',
    lat: 10.3175, lng: 105.74556, radiusM: 2000, rewardCoins: 32,
    description: {
      en: 'The Sa Dec flower village is made of family gardens. Buy a small plant or flowers from a grower and take a photo of the garden or your purchase.',
      vi: 'Làng hoa Sa Đéc gồm nhiều vườn hoa của các gia đình. Mua một chậu cây nhỏ hoặc hoa từ nhà vườn và chụp ảnh vườn hoặc món bạn mua.',
    },
    requiredScene: 'flower garden',
    photoProof: 'flowers or a plant bought from the grower, or the family flower garden with its plants on display',
  },
  {
    id: 'q24',
    scope: 'place',
    title: { en: 'Shop at Sa Dec market', vi: 'Mua sắm ở chợ Sa Đéc' },
    type: 'traditional_market',
    destination: 'Sa Dec',
    lat: 10.2912, lng: 105.76773, radiusM: 400, rewardCoins: 25,
    description: {
      en: 'Buy something from a small seller at Sa Dec market and take a photo of the stall or your purchase.',
      vi: 'Mua một món của người bán nhỏ ở chợ Sa Đéc và chụp ảnh quầy hoặc món bạn mua.',
    },
    requiredScene: 'traditional market',
    photoProof: 'something bought at a market stall in hand or in a bag, or the stall with its seller and goods',
  },
  {
    id: 'q25',
    scope: 'place',
    title: { en: 'Eat at a family-run eatery in Sa Dec', vi: 'Ăn ở quán ăn gia đình tại Sa Đéc' },
    type: 'local_food',
    destination: 'Sa Dec',
    lat: 10.2912, lng: 105.76773, radiusM: 800, rewardCoins: 25,
    description: {
      en: 'Try a local dish at a small family-run eatery in Sa Dec and take a photo of your meal.',
      vi: 'Thử một món địa phương ở quán ăn nhỏ của gia đình tại Sa Đéc và chụp ảnh bữa ăn của bạn.',
    },
    requiredScene: 'local food stall',
    photoProof: 'a served dish or meal on the table of a small family-run eatery',
  },
  {
    id: 'q26',
    scope: 'place',
    title: { en: 'Taste mam at Chau Doc market', vi: 'Thưởng thức mắm ở chợ Châu Đốc' },
    type: 'local_goods',
    destination: 'Chau Doc',
    lat: 10.71108, lng: 105.11888, radiusM: 400, rewardCoins: 28,
    description: {
      en: 'Chau Doc is famous for mam (fermented fish). Buy some from one of the long-running stalls at Chau Doc market and take a photo.',
      vi: 'Châu Đốc nổi tiếng với mắm. Mua một ít ở một trong những sạp mắm lâu năm tại chợ Châu Đốc và chụp ảnh.',
    },
    requiredScene: 'local product stall',
    photoProof: 'fermented fish (mam) that was bought, or the market stall selling it with its goods on display',
  },
  {
    id: 'q27',
    scope: 'place',
    title: { en: 'Buy hand-woven Cham fabric', vi: 'Mua vải dệt tay của người Chăm' },
    type: 'craft',
    destination: 'Chau Doc',
    lat: 10.71037, lng: 105.12857, radiusM: 1500, rewardCoins: 32,
    description: {
      en: 'In the Cham villages across the river from Chau Doc, women weave fabric by hand. Buy a woven piece and take a photo of the loom or your fabric.',
      vi: 'Ở các làng Chăm bên kia sông đối diện Châu Đốc, phụ nữ dệt vải bằng tay. Mua một món vải dệt và chụp ảnh khung dệt hoặc tấm vải của bạn.',
    },
    requiredScene: 'family craft workshop',
    photoProof: 'a weaving loom or hand-woven Cham fabric that was bought',
  },
  {
    id: 'q28',
    scope: 'place',
    title: { en: 'Walk up Sam Mountain', vi: 'Đi bộ lên núi Sam' },
    type: 'hiking',
    destination: 'Chau Doc',
    lat: 10.67667, lng: 105.0775, radiusM: 1500, rewardCoins: 38,
    description: {
      en: 'Climb Sam Mountain on foot instead of by motorbike and take a photo of the path or the view.',
      vi: 'Leo núi Sam bằng đôi chân thay vì đi xe máy và chụp ảnh con đường hoặc khung cảnh.',
    },
    requiredScene: 'hiking trail',
    photoProof: 'a footpath or steps on the mountain walked on foot, or the view from the path, with no motor vehicle',
  },
]
