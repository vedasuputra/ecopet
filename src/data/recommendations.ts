import type { Localized } from '../i18n'
import type { Interest } from '../lib/travelerStyle'

// Real places in the Mekong Delta that the Home screen, the Places map and Meilu recommend.
// Coordinates come from OpenStreetMap and Wikidata. The descriptions only state facts that were checked
// against published sources (no opening hours or prices, which go out of date). Where sources disagreed,
// the description says so or leaves the detail out.
// Province names follow the July 2025 merger (Ben Tre is now in Vinh Long province, My Tho and Sa Dec in
// Dong Thap, Chau Doc and Tra Su in An Giang); `destination` keeps the town names travelers know.

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
  // ------------------------------------------------------------ Can Tho city
  {
    id: 'cai-rang',
    name: 'Cai Rang Floating Market',
    destination: 'Cai Rang Floating Market',
    lat: 10.0024, lng: 105.74439,
    tags: ['markets', 'food', 'culture'],
    description: {
      en: 'One of the largest floating markets of the Mekong Delta, recognized as a national intangible cultural heritage in 2016. Traders sell fruit and vegetables from their boats and hang samples on tall poles to show what they sell. It is busiest early, from about 5 to 8 am.',
      vi: 'Một trong những chợ nổi lớn nhất miền Tây, được công nhận là di sản văn hóa phi vật thể quốc gia năm 2016. Thương lái bán trái cây, rau củ ngay trên ghe và treo hàng mẫu lên cây bẹo. Chợ đông nhất vào sáng sớm, khoảng 5 đến 8 giờ.',
    },
  },
  {
    id: 'phong-dien',
    name: 'Phong Dien Floating Market',
    destination: 'Can Tho',
    lat: 9.99374, lng: 105.66771,
    tags: ['markets', 'food', 'culture'],
    description: {
      en: 'A small, local floating market southwest of Can Tho city, much quieter than Cai Rang, with only a handful of boats. Come very early: it is busiest around 5:30 to 6:30 am and fades by about 7.',
      vi: 'Chợ nổi nhỏ của người địa phương phía tây nam trung tâm Cần Thơ, yên tĩnh hơn Cái Răng nhiều và chỉ có vài ghe. Hãy đến thật sớm: chợ đông nhất khoảng 5 giờ 30 đến 6 giờ 30 và vãn dần lúc 7 giờ.',
    },
  },
  {
    id: 'ninh-kieu',
    name: 'Ninh Kieu Wharf',
    destination: 'Can Tho',
    lat: 10.03369, lng: 105.78843,
    tags: ['relax', 'food', 'culture'],
    description: {
      en: 'The riverside wharf on the Hau River in the heart of Can Tho, with the city night market right next to it. A pleasant place for an evening walk.',
      vi: 'Bến sông bên dòng sông Hậu ở trung tâm Cần Thơ, ngay cạnh chợ đêm của thành phố. Nơi dễ chịu để đi dạo buổi tối.',
    },
  },
  {
    id: 'ong-pagoda',
    name: 'Ong Pagoda (Quang Trieu Assembly Hall)',
    destination: 'Can Tho',
    lat: 10.03416, lng: 105.78853,
    tags: ['culture'],
    description: {
      en: 'A Chinese assembly hall facing the river at 32 Hai Ba Trung street, built from 1894 by the Cantonese community and dedicated mainly to Quan Cong. It was recognized as a cultural and historical relic in 1993.',
      vi: 'Hội quán của người Hoa nhìn ra sông tại số 32 Hai Bà Trưng, do cộng đồng người Quảng Đông xây từ năm 1894, chủ yếu thờ Quan Công. Được công nhận là di tích lịch sử văn hóa năm 1993.',
    },
  },
  {
    id: 'binh-thuy',
    name: 'Binh Thuy Ancient House',
    destination: 'Can Tho',
    lat: 10.067, lng: 105.74963,
    tags: ['culture'],
    description: {
      en: 'A French-influenced house built in 1870 by the Duong family, who still look after it. It mixes European and Vietnamese styles and appeared in the 1992 film The Lover.',
      vi: 'Ngôi nhà mang ảnh hưởng kiến trúc Pháp do gia đình họ Dương xây năm 1870 và vẫn do gia đình gìn giữ. Nhà kết hợp phong cách châu Âu và Việt Nam, từng xuất hiện trong phim Người tình (1992).',
    },
  },
  // ------------------------------------------------------------ Ben Tre (Vinh Long province)
  {
    id: 'con-phung',
    name: 'Con Phung (Phoenix Island)',
    destination: 'Ben Tre',
    lat: 10.33363, lng: 106.35728,
    tags: ['culture', 'food', 'markets', 'relax'],
    description: {
      en: 'An islet in the Tien River between My Tho and Ben Tre, known for the legacy of the "Coconut Monk" who lived here in the 1960s. Visitors can watch coconut candy being made, see coconut-wood crafts and walk through fruit gardens.',
      vi: 'Cồn nằm giữa sông Tiền, giữa Mỹ Tho và Bến Tre, gắn với di tích của "Ông Đạo Dừa" sống ở đây vào những năm 1960. Du khách có thể xem làm kẹo dừa, đồ thủ công từ gỗ dừa và dạo vườn trái cây.',
    },
  },
  {
    id: 'ben-tre-market',
    name: 'Ben Tre Market',
    destination: 'Ben Tre',
    lat: 10.23499, lng: 106.37597,
    tags: ['markets', 'food'],
    description: {
      en: 'A local market in Ben Tre town, the "land of coconuts". A good place to buy coconut products straight from small sellers.',
      vi: 'Khu chợ địa phương ở Bến Tre, "xứ dừa". Nơi hay để mua các sản phẩm từ dừa trực tiếp từ những người bán nhỏ.',
    },
  },
  // ------------------------------------------------------------ Vinh Long
  {
    id: 'an-binh',
    name: 'An Binh Island',
    destination: 'Vinh Long',
    lat: 10.2932, lng: 105.9868,
    tags: ['nature', 'relax', 'food', 'adventure'],
    description: {
      en: 'A large river island across from Vinh Long city, reached by a short ferry. It is covered in family fruit orchards (longan, rambutan, pomelo and more), has family-run homestays, and its quiet narrow lanes are ideal for cycling.',
      vi: 'Cù lao lớn đối diện thành phố Vĩnh Long, qua bằng một chuyến phà ngắn. Nơi đây phủ đầy vườn trái cây của gia đình (nhãn, chôm chôm, bưởi...), có các homestay gia đình, và những con đường nhỏ yên tĩnh rất hợp để đạp xe.',
    },
  },
  {
    id: 'van-thanh',
    name: 'Van Thanh Mieu Temple',
    destination: 'Vinh Long',
    lat: 10.24289, lng: 105.98461,
    tags: ['culture'],
    description: {
      en: 'A Confucian temple in Vinh Long city, built from 1864 to 1866 on the initiative of the scholar Nguyen Thong, and restored many times since.',
      vi: 'Văn Thánh Miếu ở thành phố Vĩnh Long, xây dựng từ năm 1864 đến 1866 theo đề xướng của nhà nho Nguyễn Thông và được trùng tu nhiều lần.',
    },
  },
  {
    id: 'mang-thit',
    name: 'Mang Thit Brick and Pottery Kilns',
    destination: 'Vinh Long',
    lat: 10.12594, lng: 106.09038,
    tags: ['culture', 'markets'],
    description: {
      en: 'A riverside area of red-brick kilns, many now covered in moss, with some small family workshops still firing pottery. The province is protecting the area as a "contemporary heritage" for tourism. The kilns are spread along the rivers, so the pin marks the area.',
      vi: 'Vùng lò gạch đỏ ven sông, nhiều lò đã phủ rêu, vẫn còn vài cơ sở gia đình nhỏ đang nung gốm. Tỉnh đang bảo tồn nơi đây như một "di sản đương đại" để phát triển du lịch. Các lò trải dài ven sông nên ghim chỉ đánh dấu khu vực.',
    },
  },
  // ------------------------------------------------------------ My Tho (Dong Thap province)
  {
    id: 'thoi-son',
    name: 'Thoi Son Island (Unicorn Island)',
    destination: 'My Tho',
    lat: 10.33241, lng: 106.3207,
    tags: ['nature', 'adventure', 'food', 'relax'],
    description: {
      en: 'An island in the Tien River, about 15 to 20 minutes by boat from My Tho. Locals row small three-plank sampans through narrow water-coconut canals, families keep bees and make coconut candy, and you can hear traditional don ca tai tu music.',
      vi: 'Cồn trên sông Tiền, cách Mỹ Tho khoảng 15 đến 20 phút đi tàu. Người dân chèo xuồng ba lá qua những con rạch nhỏ rợp dừa nước, các gia đình nuôi ong và làm kẹo dừa, và bạn có thể nghe đờn ca tài tử.',
    },
  },
  {
    id: 'vinh-trang',
    name: 'Vinh Trang Pagoda',
    destination: 'My Tho',
    lat: 10.36281, lng: 106.37375,
    tags: ['culture'],
    description: {
      en: 'A Buddhist pagoda founded in the mid-19th century and expanded from the 1890s. It mixes Vietnamese, Chinese, Khmer and European styles, and its gate is decorated with mosaics of broken porcelain. It is a national historic and architectural monument.',
      vi: 'Ngôi chùa được xây vào giữa thế kỷ 19 và mở rộng từ những năm 1890. Chùa kết hợp phong cách Việt, Hoa, Khmer và châu Âu, cổng chùa được khảm mảnh sành sứ. Đây là di tích lịch sử kiến trúc quốc gia.',
    },
  },
  // ------------------------------------------------------------ Sa Dec (Dong Thap province)
  {
    id: 'sa-dec-flowers',
    name: 'Sa Dec Flower Village',
    destination: 'Sa Dec',
    lat: 10.3175, lng: 105.74556,
    tags: ['nature', 'markets', 'relax'],
    description: {
      en: 'A large flower-growing area of family gardens around Tan Quy Dong, about 3 km from the centre of Sa Dec. It is at its liveliest in the weeks before Tet, when the gardens prepare flowers for the holiday.',
      vi: 'Vùng trồng hoa rộng lớn gồm nhiều vườn của các gia đình quanh Tân Quy Đông, cách trung tâm Sa Đéc khoảng 3 km. Nhộn nhịp nhất trong những tuần trước Tết, khi các nhà vườn chuẩn bị hoa cho dịp lễ.',
    },
  },
  {
    id: 'huynh-thuy-le',
    name: 'Huynh Thuy Le Ancient House',
    destination: 'Sa Dec',
    lat: 10.29392, lng: 105.7683,
    tags: ['culture'],
    description: {
      en: 'The family house of Huynh Thuy Le, the man who inspired Marguerite Duras\'s novel The Lover. It dates from the end of the 19th century (sources give 1889 or 1895) and is now open to visitors.',
      vi: 'Ngôi nhà của gia đình Huỳnh Thủy Lê, người truyền cảm hứng cho tiểu thuyết Người tình của Marguerite Duras. Nhà có từ cuối thế kỷ 19 (các nguồn ghi năm 1889 hoặc 1895) và hiện mở cửa đón khách.',
    },
  },
  // ------------------------------------------------------------ Chau Doc (An Giang province)
  {
    id: 'ba-chua-xu',
    name: 'Sam Mountain and Ba Chua Xu Temple',
    destination: 'Chau Doc',
    lat: 10.68217, lng: 105.08009,
    tags: ['culture', 'adventure'],
    description: {
      en: 'A temple at the foot of Sam Mountain near Chau Doc. Its festival, held from the 22nd to the 27th day of the fourth lunar month, was inscribed by UNESCO as an Intangible Cultural Heritage of Humanity in December 2024. The mountain itself can be climbed on foot.',
      vi: 'Miếu ở chân núi Sam gần Châu Đốc. Lễ hội Vía Bà, diễn ra từ ngày 22 đến 27 tháng Tư âm lịch, được UNESCO ghi danh là Di sản văn hóa phi vật thể đại diện của nhân loại vào tháng 12 năm 2024. Có thể đi bộ lên núi.',
    },
  },
  {
    id: 'chau-doc-rafts',
    name: 'Chau Doc Floating Village',
    destination: 'Chau Doc',
    lat: 10.71075, lng: 105.11861,
    tags: ['culture', 'adventure'],
    description: {
      en: 'Raft houses on the river at Chau Doc, built over fish cages where families raise fish. Many rafts have been painted in bright colors. The best view is from a boat on the river.',
      vi: 'Những ngôi nhà bè trên sông ở Châu Đốc, dựng trên lồng nuôi cá của các gia đình. Nhiều nhà bè đã được sơn màu rực rỡ. Ngắm đẹp nhất là từ trên ghe giữa sông.',
    },
  },
  {
    id: 'chau-phong-cham',
    name: 'Cham Villages and Mubarak Mosque',
    destination: 'Chau Doc',
    lat: 10.71037, lng: 105.12857,
    tags: ['culture', 'markets'],
    description: {
      en: 'Cham Muslim villages across the river from Chau Doc, with mosques and stilt houses. Cham women weave fabric by hand under their houses in the dry season.',
      vi: 'Các làng Chăm theo đạo Hồi bên kia sông đối diện Châu Đốc, với thánh đường và nhà sàn. Vào mùa khô, phụ nữ Chăm dệt vải bằng tay dưới gầm nhà.',
    },
  },
  {
    id: 'chau-doc-market',
    name: 'Chau Doc Market',
    destination: 'Chau Doc',
    lat: 10.71108, lng: 105.11888,
    tags: ['food', 'markets'],
    description: {
      en: 'Chau Doc is known as the land of mam (fermented fish), and its market has many long-running mam stalls. Lau mam (fermented fish hotpot) and bun mam are local dishes to try.',
      vi: 'Châu Đốc được biết đến là xứ mắm, và chợ Châu Đốc có nhiều sạp mắm lâu năm. Lẩu mắm và bún mắm là những món địa phương nên thử.',
    },
  },
  // ------------------------------------------------------------ Tra Su (An Giang province)
  {
    id: 'tra-su',
    name: 'Tra Su Cajuput Forest',
    destination: 'Tra Su',
    lat: 10.5859, lng: 105.05827,
    tags: ['nature', 'adventure', 'relax'],
    description: {
      en: 'A cajuput (melaleuca) forest about 30 km from Chau Doc. A visit usually starts with a motorboat and continues in a small rowboat through the duckweed. It is most beautiful in the flood season, about September to November, and birds are most active around 7 to 9 am and 4 to 5 pm. A long bamboo walkway runs through the forest.',
      vi: 'Rừng tràm cách Châu Đốc khoảng 30 km. Chuyến tham quan thường bắt đầu bằng ca nô rồi chuyển sang xuồng chèo nhỏ len qua lớp bèo. Đẹp nhất vào mùa nước nổi, khoảng tháng 9 đến tháng 11, và chim hoạt động nhiều nhất khoảng 7 đến 9 giờ sáng và 4 đến 5 giờ chiều. Có cây cầu tre dài xuyên qua rừng.',
    },
  },
]
