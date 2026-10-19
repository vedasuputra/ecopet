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
      en: 'Complete quests in the Quests tab (20-50 coins each), like shopping at the floating market, taking the bus, or bringing your own bottle and utensils. You can also watch a rewarded ad for +5 coins, up to 3 times a day. Then open the Coupons tab, trade your coins for a vendor coupon, and show its QR code at the shop. Using a coupon counts as a quest too!',
      vi: 'Hãy hoàn thành nhiệm vụ ở tab Nhiệm vụ (20-50 xu mỗi nhiệm vụ), như mua sắm ở chợ nổi, đi xe buýt, hoặc mang bình nước và dụng cụ ăn uống riêng. Bạn cũng có thể xem quảng cáo có thưởng để nhận +5 xu, tối đa 3 lần mỗi ngày. Sau đó vào tab Phiếu giảm giá, đổi xu lấy phiếu của cửa hàng và đưa mã QR cho họ. Dùng phiếu cũng được tính là một nhiệm vụ đó!',
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
      en: "Cai Rang is one of the biggest floating markets in the Mekong Delta, near Can Tho. Vendors sell straight from their boats and hang samples on tall poles so buyers can tell which boat sells what. Go early, around 5-7 am, when it's liveliest. Bring your own bottle, and buy from the boat vendors to support small businesses. That can be a quest too!",
      vi: 'Chợ nổi Cái Răng là một trong những chợ nổi lớn nhất miền Tây, gần Cần Thơ. Tiểu thương bán hàng ngay trên ghe và treo hàng mẫu lên cây bẹo để khách biết ghe nào bán gì. Hãy đi sớm, khoảng 5-7 giờ sáng, lúc chợ nhộn nhịp nhất. Nhớ mang theo bình nước riêng và mua hàng từ các ghe để ủng hộ tiểu thương. Đó cũng có thể là một nhiệm vụ đó!',
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
