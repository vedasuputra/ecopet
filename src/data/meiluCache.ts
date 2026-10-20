import type { Lang } from '../i18n'

// Pre-written Meilu answers. FALLBACK ONLY: Gemini (/api/chat) is always tried first; these are
// used when Gemini fails (rate limit, offline, error) so the demo isn't dead.

interface CachedAnswer {
  /** Matches when EVERY group has at least one term in the (normalized) user text. */
  match: string[][]
  answer: Record<Lang, string>
}

// Order matters: most specific first (a coin question that also mentions the market should win).
const answers: CachedAnswer[] = [
  {
    // coins / coupons
    match: [['coin', 'coupon', 'voucher', 'point', 'koin', 'kupon', 'poin', 'xu', 'phieu giam gia']],
    answer: {
      en: 'Complete quests in the Quests tab (10-40 coins each), like shopping at the floating market, taking the bus, or bringing your own bottle and utensils. You can also watch a rewarded ad for +5 coins, up to 3 times a day. Then open the Coupons tab, trade your coins for a vendor coupon, and show its QR code at the shop. Using a coupon counts as a quest too!',
      vi: 'Hãy hoàn thành nhiệm vụ ở tab Nhiệm vụ (10-40 xu mỗi nhiệm vụ), như mua sắm ở chợ nổi, đi xe buýt, hoặc mang bình nước và dụng cụ ăn uống riêng. Bạn cũng có thể xem quảng cáo có thưởng để nhận +5 xu, tối đa 3 lần mỗi ngày. Sau đó vào tab Phiếu giảm giá, đổi xu lấy phiếu của cửa hàng và đưa mã QR cho họ. Dùng phiếu cũng được tính là một nhiệm vụ đó!',
    },
  },
  {
    // translation
    match: [['vietnamese', 'translate', 'how to say', 'bahasa vietnam', 'terjemah', 'cara bilang', 'tieng viet', 'tieng anh', 'giao tiep', 'dich', 'noi the nao']],
    answer: {
      en: 'Here are a few handy ones, with rough pronunciation:\n• How much is this? = "Cái này bao nhiêu tiền?" (kai nai bau nyiew tien)\n• Thank you = "Cảm ơn" (kam un)\n• Hello = "Xin chào" (sin chao)\n• No ice = "Không đá" (khong da)\nLocals usually love it when you try, even if the accent isn\'t perfect!',
      vi: 'Mình gợi ý vài câu tiếng Anh hữu ích cho chuyến đi:\n• Cái này bao nhiêu tiền? = "How much is this?"\n• Cảm ơn = "Thank you"\n• Xin chào = "Hello"\n• Không đá = "No ice, please"\nHọc vài câu như vậy sẽ giúp bạn trò chuyện với du khách quốc tế dễ hơn đó!',
    },
  },
  {
    // food
    match: [['food', 'eat', 'dish', 'makan', 'kuliner', 'an gi', 'mon an', 'am thuc', 'dac san']],
    answer: {
      en: 'In the Mekong Delta, try banh xeo (crispy crepe with shrimp and bean sprouts), lau mam (fermented fish hotpot with lots of veggies), ca loc nuong (grilled snakehead fish), and banh cong (fried mung bean and shrimp cakes). Check the Eco-Pet map too: partner food stalls and cafes there have coupons you can trade your coins for.',
      vi: 'Ở miền Tây, bạn nhớ thử bánh xèo (bánh giòn nhân tôm và giá), lẩu mắm (nhiều rau tươi), cá lóc nướng trui và bánh cống (bánh chiên đậu xanh và tôm). Xem thêm bản đồ Eco-Pet: các quán ăn và quán cà phê đối tác có phiếu giảm giá để bạn đổi bằng xu.',
    },
  },
  {
    // culture tips
    match: [['culture', 'etiquette', 'tips', 'budaya', 'etiket', 'adat', 'van hoa', 'luu y']],
    answer: {
      en: "A few small things go a long way: dress modestly (shoulders and knees covered) at pagodas and take your shoes off if asked. Ask before photographing people, especially vendors and elders. Bargain with a smile, never aggressively. And if a local invites you for tea, accept warmly, it's a sign of hospitality.",
      vi: 'Vài điều nhỏ nhưng rất có ý nghĩa: ăn mặc kín đáo (che vai và đầu gối) khi vào chùa và cởi giày nếu được yêu cầu. Hãy xin phép trước khi chụp ảnh người khác, nhất là tiểu thương và người lớn tuổi. Trả giá với nụ cười, đừng gay gắt. Và nếu được mời uống trà, hãy vui vẻ nhận lời, đó là nét hiếu khách của người dân.',
    },
  },
  {
    // history of Cai Rang (before the generic floating market answer)
    match: [['history', 'sejarah', 'lich su', 'asal usul'], ['cai rang']],
    answer: {
      en: "Cai Rang is part of Can Tho city, and its floating market has been a wholesale hub on the river for generations: farmers bring fruit and vegetables by boat and sell to traders who carry them on to towns and cities. The tall poles with hanging samples show what each boat sells. In 2016 the market was recognized as a national intangible cultural heritage of Vietnam!",
      vi: 'Cái Răng thuộc thành phố Cần Thơ, và chợ nổi Cái Răng đã là đầu mối buôn bán trên sông qua nhiều thế hệ: nhà vườn chở trái cây, rau củ bằng ghe đến bán cho thương lái rồi đưa đi các thị trấn, thành phố. Cây bẹo treo hàng mẫu cho biết mỗi ghe bán gì. Năm 2016, chợ được công nhận là di sản văn hóa phi vật thể quốc gia đó!',
    },
  },
  {
    // history of Ben Tre
    match: [['history', 'sejarah', 'lich su', 'asal usul'], ['ben tre']],
    answer: {
      en: 'Ben Tre sits on islands built up by silt between branches of the Mekong, which is why the land is so fertile and covered in coconut palms, earning it the nickname "Land of Coconuts". It is also remembered in Vietnamese history for the 1960 Dong Khoi uprising that began here. Since July 2025, Ben Tre has been part of the new Vinh Long province.',
      vi: 'Bến Tre nằm trên các cù lao do phù sa bồi đắp giữa những nhánh của sông Mê Kông, nên đất rất màu mỡ và phủ đầy dừa, được gọi là "Xứ Dừa". Nơi đây cũng được nhớ đến trong lịch sử Việt Nam với phong trào Đồng Khởi năm 1960 bắt đầu từ đây. Từ tháng 7 năm 2025, Bến Tre thuộc tỉnh Vĩnh Long mới.',
    },
  },
  {
    // history of Tra Su
    match: [['history', 'sejarah', 'lich su', 'asal usul'], ['tra su']],
    answer: {
      en: "Tra Su is a protected melaleuca (cajuput) forest in An Giang province, near the Cambodian border. Its story is closely tied to the Mekong's seasonal floods: in the high-water season the water is covered by a green carpet of duckweed and many birds nest here. I don't know the exact dates of its protection, so ask the local rangers or guides for specifics!",
      vi: 'Trà Sư là khu rừng tràm được bảo vệ ở tỉnh An Giang, gần biên giới Campuchia. Câu chuyện của nơi này gắn chặt với mùa nước nổi của sông Mê Kông: vào mùa nước lên, mặt nước phủ một lớp bèo xanh mướt và có rất nhiều loài chim làm tổ. Mình không nắm rõ các mốc thời gian bảo tồn, nên hãy hỏi kiểm lâm hoặc hướng dẫn viên địa phương để biết chi tiết nhé!',
    },
  },
  {
    // history of Vinh Long
    match: [['history', 'sejarah', 'lich su', 'asal usul'], ['vinh long']],
    answer: {
      en: 'Vinh Long lies between the Tien and Hau branches of the Mekong and is one of the older settled areas of the delta, with orchards, river islets and craft traditions like brick and pottery kilns. The Van Thanh Mieu temple, a Confucian temple built from 1864 to 1866, is a landmark of its past. Since July 2025 the province also includes Ben Tre and Tra Vinh.',
      vi: 'Vĩnh Long nằm giữa sông Tiền và sông Hậu và là một trong những vùng đất được khai phá từ khá sớm ở miền Tây, với vườn cây ăn trái, cù lao sông nước và nghề truyền thống như lò gạch, lò gốm. Văn Thánh Miếu, ngôi miếu thờ Khổng Tử xây từ năm 1864 đến 1866, là dấu tích của quá khứ nơi đây. Từ tháng 7 năm 2025, tỉnh còn bao gồm Bến Tre và Trà Vinh.',
    },
  },
  {
    // what to see in Can Tho
    match: [['interesting', 'see around', 'attraction', 'things to do', 'tham quan', 'thu vi', 'menarik', 'lihat'], ['can tho']],
    answer: {
      en: 'In Can Tho, stroll Ninh Kieu Wharf by the river and its evening market, visit the Binh Thuy ancient house and Ong Pagoda, and get up early for the Cai Rang floating market. Bring your own bottle and shop at small local stalls along the way!',
      vi: 'Ở Cần Thơ, bạn có thể dạo bến Ninh Kiều bên sông và chợ đêm buổi tối, ghé nhà cổ Bình Thủy và chùa Ông, rồi dậy sớm đi chợ nổi Cái Răng. Nhớ mang bình nước riêng và mua sắm ở các quầy hàng nhỏ của người dân nhé!',
    },
  },
  {
    // what to see in Ben Tre
    match: [['interesting', 'see around', 'attraction', 'things to do', 'tham quan', 'thu vi', 'menarik', 'lihat'], ['ben tre']],
    answer: {
      en: 'In Ben Tre, visit Con Phung (Phoenix Island) to watch coconut candy being made, cycle the quiet lanes under the coconut palms, and buy coconut products from small sellers at the market. A countryside homestay is a lovely way to stay longer. Choose small family-run places to support local people!',
      vi: 'Ở Bến Tre, bạn có thể ghé cồn Phụng xem làm kẹo dừa, đạp xe trên những con đường rợp bóng dừa, và mua sản phẩm từ dừa của những người bán nhỏ ở chợ. Ở homestay miền quê là cách tuyệt vời để lưu lại lâu hơn. Hãy chọn các cơ sở nhỏ của gia đình địa phương để ủng hộ người dân nhé!',
    },
  },
  {
    // what to see at Tra Su
    match: [['interesting', 'see around', 'attraction', 'things to do', 'tham quan', 'thu vi', 'menarik', 'lihat'], ['tra su']],
    answer: {
      en: 'At Tra Su, take a motorboat and then a small rowboat through the cajuput forest, walk the long bamboo walkway, and watch the birds (most active around 7 to 9 am and 4 to 5 pm). It is most striking in the high-water season, roughly September to November, when the water is covered in green duckweed. Bring a refillable bottle, there is little shade and it gets hot!',
      vi: 'Ở Trà Sư, bạn có thể đi ca nô rồi chuyển sang xuồng chèo nhỏ xuyên rừng tràm, đi bộ trên cây cầu tre dài và ngắm chim (nhiều nhất khoảng 7 đến 9 giờ sáng và 4 đến 5 giờ chiều). Đẹp nhất vào mùa nước nổi, khoảng tháng 9 đến tháng 11, khi mặt nước phủ đầy bèo xanh. Nhớ mang bình nước dùng lại vì ít bóng râm và trời khá nóng nhé!',
    },
  },
  {
    // what to see in Vinh Long
    match: [['interesting', 'see around', 'attraction', 'things to do', 'tham quan', 'thu vi', 'menarik', 'lihat'], ['vinh long']],
    answer: {
      en: 'In Vinh Long, take the short ferry to An Binh island for fruit orchards, homestays and cycling, and see the traditional brick and pottery kilns around Mang Thit. The Van Thanh Mieu temple is a quiet stop in town. Small family-run homestays and orchards are great places to spend your money!',
      vi: 'Ở Vĩnh Long, bạn có thể đi phà ngắn sang cù lao An Bình để thăm vườn trái cây, ở homestay và đạp xe, và xem các lò gạch, lò gốm truyền thống quanh Mang Thít. Văn Thánh Miếu là điểm dừng chân yên tĩnh trong thành phố. Các homestay và vườn của gia đình địa phương là nơi tuyệt vời để bạn chi tiêu nhé!',
    },
  },
  {
    // what to see in My Tho
    match: [['interesting', 'see around', 'attraction', 'things to do', 'tham quan', 'thu vi', 'menarik', 'lihat'], ['my tho']],
    answer: {
      en: 'Near My Tho, take a boat to Thoi Son island, where locals row small sampans through water-coconut canals and families keep bees and make coconut candy. In town, Vinh Trang Pagoda mixes Vietnamese, Chinese, Khmer and European styles. Buy honey or candy straight from the families!',
      vi: 'Gần Mỹ Tho, hãy đi tàu sang cồn Thới Sơn, nơi người dân chèo xuồng ba lá qua những con rạch dừa nước, các gia đình nuôi ong và làm kẹo dừa. Trong thành phố, chùa Vĩnh Tràng kết hợp phong cách Việt, Hoa, Khmer và châu Âu. Hãy mua mật ong hoặc kẹo trực tiếp từ các gia đình nhé!',
    },
  },
  {
    // what to see in Sa Dec
    match: [['interesting', 'see around', 'attraction', 'things to do', 'tham quan', 'thu vi', 'menarik', 'lihat'], ['sa dec']],
    answer: {
      en: "In Sa Dec, walk through the flower village of family gardens around Tan Quy Dong (liveliest before Tet), and visit the Huynh Thuy Le ancient house, home of the man who inspired Marguerite Duras's novel The Lover. Buying a plant from a grower supports the family directly!",
      vi: 'Ở Sa Đéc, hãy dạo làng hoa với những vườn hoa gia đình quanh Tân Quy Đông (nhộn nhịp nhất trước Tết), và ghé nhà cổ Huỳnh Thủy Lê, người truyền cảm hứng cho tiểu thuyết Người tình của Marguerite Duras. Mua một chậu cây từ nhà vườn là ủng hộ trực tiếp gia đình họ đó!',
    },
  },
  {
    // what to see in Chau Doc
    match: [['interesting', 'see around', 'attraction', 'things to do', 'tham quan', 'thu vi', 'menarik', 'lihat'], ['chau doc', 'sam mountain', 'nui sam']],
    answer: {
      en: 'Around Chau Doc, walk up Sam Mountain and visit the Ba Chua Xu temple, whose festival UNESCO inscribed in 2024. See the colorful raft houses over the fish cages, visit the Cham villages where women weave by hand, and taste mam (fermented fish) at Chau Doc market. Tra Su cajuput forest is about 30 km away.',
      vi: 'Quanh Châu Đốc, hãy đi bộ lên núi Sam và viếng miếu Bà Chúa Xứ, nơi có lễ hội được UNESCO ghi danh năm 2024. Ngắm những nhà bè sơn màu trên lồng cá, thăm các làng Chăm nơi phụ nữ dệt vải bằng tay, và thử mắm ở chợ Châu Đốc. Rừng tràm Trà Sư cách đó khoảng 30 km.',
    },
  },
  {
    // history of Can Tho
    match: [['history', 'sejarah', 'lich su', 'asal usul'], ['can tho', 'cantho']],
    answer: {
      en: 'Can Tho is the largest city of the Mekong Delta, often called "Tay Do", the western capital. It grew along the Hau River, a major branch of the Mekong, and has long been a trading hub for rice and fruit. The rivers and canals are not just scenery, they are how people live and trade, which is why the floating markets still survive today.',
      vi: 'Cần Thơ là thành phố lớn nhất Đồng bằng sông Cửu Long, thường được gọi là "Tây Đô". Thành phố phát triển bên sông Hậu, một nhánh lớn của sông Mê Kông, và từ lâu là trung tâm buôn bán lúa gạo và trái cây. Sông ngòi kênh rạch không chỉ là cảnh đẹp mà còn là cách người dân sinh sống và buôn bán, nên chợ nổi vẫn còn đến ngày nay.',
    },
  },
  {
    // floating market
    match: [['floating market', 'pasar terapung', 'cho noi', 'cai rang', 'cai rang']],
    answer: {
      en: "Cai Rang is one of the biggest floating markets in the Mekong Delta, near Can Tho. Vendors sell straight from their boats and hang samples on tall poles so buyers can tell which boat sells what. Go early, around 5-8 am, when it's liveliest. Bring your own bottle, and buy from the boat vendors to support small businesses. That can be a quest too!",
      vi: 'Chợ nổi Cái Răng là một trong những chợ nổi lớn nhất miền Tây, gần Cần Thơ. Tiểu thương bán hàng ngay trên ghe và treo hàng mẫu lên cây bẹo để khách biết ghe nào bán gì. Hãy đi sớm, khoảng 5-8 giờ sáng, lúc chợ nhộn nhịp nhất. Nhớ mang theo bình nước riêng và mua hàng từ các ghe để ủng hộ tiểu thương. Đó cũng có thể là một nhiệm vụ đó!',
    },
  },
]

/**
 * Suggested-question chips: 2 general Mekong Delta questions + 2 about the traveler's current
 * area. They follow the location, and Gemini also receives the location with every message.
 */
export function suggestedQuestions(area: string, lang: Lang): string[] {
  if (lang === 'vi') {
    return [
      'Món đặc sản miền Tây nào nhất định phải thử?',
      'Các câu giao tiếp tiếng Anh hữu ích khi mua hàng là gì?',
      `Có gì thú vị để tham quan quanh ${area}?`,
      `Kể mình nghe lịch sử ngắn gọn của ${area}`,
    ]
  }
  return [
    'What Mekong Delta dishes should I try?',
    'How do I say "how much is this" in Vietnamese?',
    `What\'s interesting to see around ${area}?`,
    `Tell me a short history of ${area}`,
  ]
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics (Vietnamese)
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Returns the cached answer in the app language, or null. */
export function findCachedAnswer(text: string, lang: Lang): string | null {
  const t = normalize(text)
  for (const e of answers) {
    if (e.match.every((group) => group.some((term) => t.includes(normalize(term))))) return e.answer[lang]
  }
  return null
}
