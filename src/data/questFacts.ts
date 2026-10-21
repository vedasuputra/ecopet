import type { QuestType } from './quests'

// Meilu's fun fact when a quest is done: about the kind of quest (the sustainable action) or about the place it was done in. Short, in
// Meilu's voice, and checked against sources (listed under each one). Where sources disagree on a number, the fact says less rather than
// pick one (for example no fruit-share percentage, and no CO2 numbers for the bus, which depend a lot on how full it is).
type Fact = { en: string; vi: string }

export const TYPE_FACTS: Partial<Record<QuestType, Fact>> = {
  // UNEP: about one million plastic drinking bottles are bought every minute worldwide
  // https://www.unep.org/news-and-stories/story/our-planet-drowning-plastic-pollution
  reusable_bottle: {
    en: 'Around a million plastic bottles are bought every minute around the world. Yours just made it one fewer! 🐦',
    vi: 'Mỗi phút trên thế giới có khoảng một triệu chai nhựa được mua. Bạn vừa giúp bớt đi một chai rồi đó! 🐦',
  },
  // UK government (Defra) on banning single-use cutlery: "A plastic fork can take 200 years to decompose"
  reusable_utensils: {
    en: 'A plastic fork used for a few minutes can take about 200 years to break down. Your own set just skipped that!',
    vi: 'Một chiếc nĩa nhựa dùng vài phút có thể mất khoảng 200 năm mới phân hủy. Bộ dụng cụ của bạn vừa tránh được điều đó!',
  },
  // general: the footprint per rider of a shared bus is usually lower than riding alone (it depends on how full the bus is)
  bus: {
    en: 'One bus carries lots of riders at once, so sharing the ride usually means far less fuel per person than going alone. Beep beep! 🚌',
    vi: 'Một chuyến xe buýt chở được nhiều người cùng lúc, nên đi chung thường tốn ít nhiên liệu cho mỗi người hơn đi riêng. Bíp bíp! 🚌',
  },
  rowing: {
    en: 'No engine, no noise: a rowing boat lets birds and fish carry on as if we were never here. Shh, listen! 🐦',
    vi: 'Không máy, không ồn: xuồng chèo tay để chim cá yên bình như chưa từng có ai ghé qua. Suỵt, nghe kìa! 🐦',
  },
  cycling: {
    en: 'A bike runs on you, not on fuel: zero exhaust, and the breeze is free!',
    vi: 'Xe đạp chạy bằng sức bạn chứ không bằng xăng: không khói thải, còn gió mát thì miễn phí!',
  },
  redeem_coupon: {
    en: 'Every coupon you use is money spent at a small local business. That is how green travel helps families here!',
    vi: 'Mỗi phiếu bạn dùng là tiền chi cho một cơ sở nhỏ địa phương. Du lịch xanh giúp các gia đình ở đây như thế đó!',
  },
  local_food: {
    en: 'Eating at a family-run spot keeps your money in the neighbourhood, and it usually tastes like home!',
    vi: 'Ăn ở quán gia đình giúp tiền của bạn ở lại trong xóm, mà món ăn thường mang vị nhà nữa!',
  },
  traditional_market: {
    en: 'Small market stalls are often run by the same families for years. Shopping here keeps them going!',
    vi: 'Các sạp ở chợ truyền thống thường do một gia đình bán qua nhiều năm. Mua ở đây là giúp họ tiếp tục!',
  },
  // Mekong Delta: about half of Vietnam's rice (Ministry figures cited by VnEconomy 2024 and VNA 2025: 50-55%)
  orchard: {
    en: 'The Mekong Delta is so fertile it grows about half of all the rice in Vietnam, and lots of fruit too. Yum!',
    vi: 'Đồng bằng sông Cửu Long màu mỡ đến mức trồng khoảng một nửa số lúa của cả nước, cùng rất nhiều trái cây. Ngon quá!',
  },
}

export const PLACE_FACTS: Record<string, Fact> = {
  // the "cây bẹo" pole: localvietnam.com, Wikipedia; national intangible heritage, certificate on 9 July 2016: Vietnam News, cantho.gov.vn
  'Cai Rang Floating Market': {
    en: 'Boats here hang what they sell on a tall pole called a "cây bẹo", so buyers can spot it from afar. The market became national heritage in 2016!',
    vi: 'Ghe ở đây treo hàng lên cây bẹo để người mua nhìn thấy từ xa. Chợ nổi Cái Răng thành di sản văn hóa phi vật thể quốc gia năm 2016 đó!',
  },
  // Can Tho Bridge: 550 m main span, longest cable-stayed span in Southeast Asia when it opened in 2010 (mageba reference sheet, Vietnam Briefing)
  'Can Tho': {
    en: 'Can Tho Bridge has a 550 m main span: the longest cable-stayed span in Southeast Asia when it opened in 2010!',
    vi: 'Cầu Cần Thơ có nhịp chính dài 550 m, là nhịp dây văng dài nhất Đông Nam Á khi khánh thành năm 2010!',
  },
  // about 79,000-80,000 ha of coconut, the largest area in Vietnam (VTV 2024, Vietnam Agriculture 2024); candy craft from the 1930s in Mo Cay
  'Ben Tre': {
    en: 'Ben Tre has about 80,000 hectares of coconut trees, more than anywhere else in Vietnam. Coconut candy has been made here since the 1930s!',
    vi: 'Bến Tre có khoảng 80.000 ha dừa, nhiều nhất Việt Nam. Kẹo dừa đã được làm ở đây từ những năm 1930!',
  },
  // Mang Thit: the red brick and pottery kilns, nicknamed a "kingdom" (Vietnam News, vietnamtourism.vn)
  'Vinh Long': {
    en: 'Mang Thit in Vinh Long is nicknamed the "kingdom" of red brick and pottery kilns. They look like little castles!',
    vi: 'Mang Thít ở Vĩnh Long được gọi là "vương quốc" lò gạch gốm đỏ. Trông như những tòa lâu đài nhỏ vậy!',
  },
  // Thoi Son islet: beekeeping and honey, longan-blossom honey tea (vietnamtourism.gov.vn, VOV5)
  'My Tho': {
    en: 'On Thoi Son islet near My Tho, many families keep bees. Try a cup of tea with longan-blossom honey!',
    vi: 'Ở cồn Thới Sơn gần Mỹ Tho, nhiều nhà nuôi ong. Thử một ly trà mật ong hoa nhãn nhé!',
  },
  // flowers grown on raised beds over the canals, tended by boat; a flower tradition from the early 20th century (Heritage, localvietnam.com)
  'Sa Dec': {
    en: 'In Sa Dec, flowers grow on raised beds right over the canals, and growers often tend them by boat. A tradition of more than a century!',
    vi: 'Ở Sa Đéc, hoa được trồng trên giàn ngay trên kênh, và người trồng thường chăm hoa bằng xuồng. Nghề này đã có hơn một thế kỷ!',
  },
  // Ba Chua Xu festival on Sam Mountain: UNESCO Representative List, 4 December 2024 (An Giang government, Vietnam Tourism)
  'Chau Doc': {
    en: 'The Ba Chua Xu festival at Sam Mountain joined the UNESCO list of intangible heritage in December 2024!',
    vi: 'Lễ hội Vía Bà Chúa Xứ núi Sam được UNESCO ghi danh là di sản văn hóa phi vật thể vào tháng 12 năm 2024!',
  },
  // about 70 bird species, among them the painted stork and the Oriental darter (Wikipedia, Dtinews)
  'Tra Su': {
    en: 'Tra Su forest is home to around 70 kinds of birds, including the painted stork. Fellow birds, hello! 🐦',
    vi: 'Rừng tràm Trà Sư là nhà của khoảng 70 loài chim, trong đó có cò lạo Ấn Độ. Chào các bạn chim nha! 🐦',
  },
}

// actions where the fact about the action says more than the fact about the place
const ACTION_FIRST: QuestType[] = ['reusable_bottle', 'reusable_utensils', 'bus', 'redeem_coupon', 'rowing', 'cycling']

/** The fun fact for a finished quest: the action first for the sustainable ones, otherwise the place, otherwise the kind of quest. */
export function questFact(type: QuestType, destination: string, lang: 'en' | 'vi'): string | null {
  const byType = TYPE_FACTS[type]
  const byPlace = PLACE_FACTS[destination]
  const f = ACTION_FIRST.includes(type) ? byType ?? byPlace : byPlace ?? byType
  return f ? f[lang] : null
}
