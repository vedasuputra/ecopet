import type { Localized } from '../i18n'
import { PRIVACY_VERSION } from '../data/privacy'

// Text of the public pages (landing + privacy policy), in both languages.
// The privacy policy describes what the prototype actually does today.

export interface Section {
  title: Localized
  paragraphs?: Localized[]
  bullets?: Localized[]
}

export const PRIVACY_UPDATED: Localized = {
  en: `Version ${PRIVACY_VERSION}`,
  vi: `Phiên bản ${PRIVACY_VERSION}`,
}

export const PRIVACY_NOTICE: Localized = {
  en: 'Prototype notice: this policy describes how the Eco-Pet prototype works today. It has not yet been reviewed by a lawyer and will be updated before any public launch.',
  vi: 'Lưu ý bản thử nghiệm: chính sách này mô tả cách Eco-Pet hoạt động hiện nay. Chính sách chưa được luật sư rà soát và sẽ được cập nhật trước khi ra mắt công khai.',
}

export const PRIVACY: Section[] = [
  {
    title: { en: '1. Who we are', vi: '1. Chúng tôi là ai' },
    paragraphs: [
      {
        en: 'Eco-Pet is a travel app for the Mekong Delta in Vietnam. It rewards sustainable choices (taking the bus, bringing your own bottle, shopping at small local businesses) with coins that can be traded for discount coupons at partner shops. Meilu, our AI bird guide, chats with travelers during their trip.',
        vi: 'Eco-Pet là ứng dụng du lịch cho Đồng bằng sông Cửu Long, Việt Nam. Ứng dụng thưởng xu cho các lựa chọn bền vững (đi xe buýt, mang bình nước riêng, mua sắm ở cửa hàng nhỏ của người dân) để đổi lấy phiếu giảm giá tại cửa hàng đối tác. Meilu, chú chim hướng dẫn viên AI, trò chuyện cùng du khách trong chuyến đi.',
      },
    ],
  },
  {
    title: { en: '2. What we collect', vi: '2. Chúng tôi thu thập gì' },
    bullets: [
      {
        en: 'Account: your email address, the name you choose and a password (stored only as a secure hash by our sign-in provider).',
        vi: 'Tài khoản: địa chỉ email, tên bạn chọn và mật khẩu (chỉ được lưu dưới dạng mã băm an toàn bởi nhà cung cấp đăng nhập).',
      },
      {
        en: 'Trip plan: how many days you stay and which destinations you pick, so we can suggest relevant quests.',
        vi: 'Kế hoạch chuyến đi: số ngày lưu trú và các điểm đến bạn chọn, để gợi ý nhiệm vụ phù hợp.',
      },
      {
        en: 'Location: only when you use a feature that needs it. You can allow your real GPS position, or pick a place yourself ("simulated" location). Your coordinates are sent with a quest check and with chat messages so Meilu knows where you are; we do not keep a location history.',
        vi: 'Vị trí: chỉ khi bạn dùng tính năng cần đến. Bạn có thể cho phép dùng vị trí GPS thật, hoặc tự chọn một địa điểm (vị trí "giả lập"). Tọa độ được gửi kèm lần kiểm tra nhiệm vụ và tin nhắn trò chuyện để Meilu biết bạn ở đâu; chúng tôi không lưu lịch sử vị trí.',
      },
      {
        en: 'Photos: when you do a photo quest, the picture is taken with the in-app camera and sent to our server and to an AI service to check that it shows what the quest asks for. We do not store the picture, with one exception: if the AI is not sure, or the photo looks very much like one another traveler already sent, it is kept in a private review queue so that a member of the Eco-Pet team can look at it. It is deleted as soon as they decide, and in any case after 14 days.',
        vi: 'Ảnh: khi làm nhiệm vụ chụp ảnh, ảnh được chụp bằng camera trong ứng dụng và gửi đến máy chủ của chúng tôi cùng một dịch vụ AI để kiểm tra có đúng yêu cầu nhiệm vụ không. Chúng tôi không lưu ảnh, trừ một trường hợp: nếu AI chưa chắc chắn, hoặc ảnh rất giống ảnh một du khách khác đã gửi, ảnh được giữ trong hàng đợi xem xét riêng tư để một thành viên của nhóm Eco-Pet xem. Ảnh bị xóa ngay khi họ quyết định, và dù thế nào cũng bị xóa sau 14 ngày.',
      },
      {
        en: 'Quest check log: for every photo check we record the result, the AI\'s confidence and notes, how far you were from the quest spot (not your coordinates), the time, and two fingerprints of the photo (a hash and a perceptual fingerprint) that cannot be turned back into the picture. We use it to stop reused photos, to review unsure cases and to tune the checks.',
        vi: 'Nhật ký kiểm tra nhiệm vụ: với mỗi lần kiểm tra ảnh, chúng tôi ghi lại kết quả, độ tin cậy và ghi chú của AI, khoảng cách từ bạn đến điểm nhiệm vụ (không phải tọa độ của bạn), thời gian, và hai dấu vân tay của ảnh (mã băm và dấu vân tay cảm nhận) không thể chuyển ngược lại thành ảnh. Chúng tôi dùng nhật ký để chặn ảnh dùng lại, xem xét các trường hợp chưa chắc chắn và điều chỉnh việc kiểm tra.',
      },
      {
        en: 'Itinerary: if you ask Meilu to plan your days, your trip length and chosen destinations are sent to the AI, which may only choose from our own list of quests and partner shops. The plan is saved in your account and you can edit or delete it.',
        vi: 'Lịch trình: nếu bạn nhờ Meilu lên kế hoạch các ngày, số ngày và điểm đến bạn chọn được gửi đến AI, và AI chỉ được chọn trong danh sách nhiệm vụ và cửa hàng đối tác của chúng tôi. Kế hoạch được lưu trong tài khoản và bạn có thể chỉnh sửa hoặc xóa.',
      },
      {
        en: 'Reporting a photo: if the AI rejects your quest photo and you press Report, that photo (and your short note, if you write one) is sent to Eco-Pet admins, who look at it and decide. The photo is deleted as soon as they decide.',
        vi: 'Báo cáo ảnh: nếu AI từ chối ảnh nhiệm vụ của bạn và bạn bấm Báo cáo, bức ảnh đó (cùng ghi chú ngắn nếu bạn viết) sẽ được gửi đến quản trị viên Eco-Pet để xem và quyết định. Ảnh được xóa ngay khi họ quyết định.',
      },
      {
        en: 'Travel style: Meilu asks a few multiple-choice questions (pace, interests, who you travel with, budget, early mornings). Your answers are saved in your account and sent to the AI together with your trip so suggestions fit you. You can change them any time in My itinerary.',
        vi: 'Phong cách du lịch: Meilu hỏi vài câu trắc nghiệm (nhịp độ, sở thích, đi cùng ai, ngân sách, dậy sớm). Câu trả lời được lưu trong tài khoản và gửi đến AI cùng chuyến đi của bạn để gợi ý hợp với bạn hơn. Bạn có thể đổi bất cứ lúc nào trong Lịch trình của tôi.',
      },
      {
        en: 'Where you travel from: when you sign up you say whether you are a domestic traveler (from Vietnam) or an international traveler. It is saved in your account. Domestic travelers are not asked how long they stay. You can change it in your profile.',
        vi: 'Bạn đi từ đâu: khi đăng ký, bạn cho biết mình là khách trong nước (từ Việt Nam) hay khách quốc tế. Thông tin này được lưu trong tài khoản. Khách trong nước không bị hỏi thời gian lưu trú. Bạn có thể đổi trong hồ sơ.',
      },
      {
        en: 'Chat with Meilu: your messages and Meilu\'s replies are saved in your account so Meilu remembers you when you come back.',
        vi: 'Trò chuyện với Meilu: tin nhắn của bạn và câu trả lời của Meilu được lưu trong tài khoản để Meilu nhớ bạn khi bạn quay lại.',
      },
      {
        en: 'Activity: your coins, completed quests, and the coupons you obtained and used. Coupon records are needed to pay rewards and to let a shop confirm a redemption.',
        vi: 'Hoạt động: số xu, nhiệm vụ đã hoàn thành, và các phiếu giảm giá bạn đã nhận và đã dùng. Hồ sơ phiếu cần thiết để trao thưởng và để cửa hàng xác nhận việc sử dụng phiếu.',
      },
      {
        en: 'For shop owners: business name, category and location, the coupons you create, your subscription plan and payments (in this prototype payments are simulated), and the amounts of redeemed coupons.',
        vi: 'Với chủ cửa hàng: tên, loại hình và vị trí cửa hàng, các phiếu bạn tạo, gói đăng ký và thanh toán (trong bản thử nghiệm này thanh toán chỉ là mô phỏng), và số tiền của các phiếu đã sử dụng.',
      },
      {
        en: 'Technical data: our hosting provider keeps standard server logs (such as IP address and time of request) for security and reliability.',
        vi: 'Dữ liệu kỹ thuật: nhà cung cấp máy chủ lưu nhật ký tiêu chuẩn (như địa chỉ IP và thời gian truy cập) để bảo mật và đảm bảo hoạt động ổn định.',
      },
    ],
  },
  {
    title: { en: '3. Why we use it', vi: '3. Chúng tôi dùng dữ liệu để làm gì' },
    paragraphs: [
      {
        en: 'We use your data only to run the app: to sign you in, suggest quests, verify them, pay your coins, let Meilu answer you, and let a shop redeem your coupon. We collect and use it with your consent, which you give when you create an account and can withdraw at any time by deleting your account.',
        vi: 'Chúng tôi chỉ dùng dữ liệu để vận hành ứng dụng: đăng nhập, gợi ý nhiệm vụ, xác minh nhiệm vụ, trao xu, để Meilu trả lời bạn và để cửa hàng xác nhận phiếu. Chúng tôi thu thập và sử dụng dữ liệu với sự đồng ý của bạn, được đưa ra khi tạo tài khoản và có thể rút lại bất cứ lúc nào bằng cách xóa tài khoản.',
      },
      { en: 'We do not sell your personal data.', vi: 'Chúng tôi không bán dữ liệu cá nhân của bạn.' },
    ],
  },
  {
    title: { en: '4. Who else handles it', vi: '4. Ai khác xử lý dữ liệu' },
    bullets: [
      {
        en: 'Supabase: hosts the database and sign-in for the app.',
        vi: 'Supabase: lưu trữ cơ sở dữ liệu và hệ thống đăng nhập của ứng dụng.',
      },
      { en: 'Vercel: hosts the website and our server functions.', vi: 'Vercel: lưu trữ website và các hàm máy chủ.' },
      {
        en: 'Google: provides the Gemini AI used for Meilu\'s chat, photo checks and itinerary planning, and the advertising services. Your chat messages, your location text, quest photos and trip plan inputs are processed by Google when you use these features. Under Google\'s free AI service, Google may use submitted content to improve its products, so please do not send sensitive personal information to Meilu.',
        vi: 'Google: cung cấp AI Gemini cho trò chuyện với Meilu, kiểm tra ảnh và lập lịch trình, cùng các dịch vụ quảng cáo. Tin nhắn, thông tin vị trí, ảnh nhiệm vụ và dữ liệu lập kế hoạch của bạn được Google xử lý khi bạn dùng các tính năng này. Với dịch vụ AI miễn phí của Google, Google có thể dùng nội dung được gửi để cải thiện sản phẩm, vì vậy xin đừng gửi thông tin cá nhân nhạy cảm cho Meilu.',
      },
      {
        en: 'OpenStreetMap and Photon: provide the map tiles and the place search. They see your IP address and the places you search for.',
        vi: 'OpenStreetMap và Photon: cung cấp bản đồ và tìm kiếm địa điểm. Họ thấy địa chỉ IP và địa điểm bạn tìm kiếm.',
      },
      {
        en: 'Shops: a shop sees only the coupon (its short code, when it was claimed or used, and whether the traveler is domestic or international, as a count). It never sees your name or email.',
        vi: 'Cửa hàng: cửa hàng chỉ thấy phiếu (mã ngắn, thời điểm nhận và sử dụng, và du khách là khách trong nước hay quốc tế, dưới dạng số liệu). Họ không bao giờ thấy tên hay email của bạn.',
      },
    ],
  },
  {
    title: { en: '5. Advertising', vi: '5. Quảng cáo' },
    paragraphs: [
      {
        en: 'Eco-Pet shows a banner ad and offers optional rewarded video ads. Watching a rewarded video earns a few coins; viewing or clicking a banner never does. Advertising services provided by Google may use cookies or advertising identifiers on your device, as described in Google\'s own policies.',
        vi: 'Eco-Pet hiển thị quảng cáo banner và quảng cáo video có thưởng tùy chọn. Xem video có thưởng sẽ nhận một ít xu; xem hay bấm vào banner không bao giờ được xu. Dịch vụ quảng cáo của Google có thể dùng cookie hoặc mã định danh quảng cáo trên thiết bị của bạn, theo chính sách của Google.',
      },
    ],
  },
  {
    title: { en: '6. Camera and location permissions', vi: '6. Quyền camera và vị trí' },
    paragraphs: [
      {
        en: 'The app asks your browser for camera and location access only when you start a quest or ask to use your real location. You can refuse or revoke the permission in your browser settings at any time; you can still use the app with a simulated location.',
        vi: 'Ứng dụng chỉ xin trình duyệt quyền camera và vị trí khi bạn bắt đầu nhiệm vụ hoặc chọn dùng vị trí thật. Bạn có thể từ chối hoặc thu hồi quyền trong cài đặt trình duyệt bất cứ lúc nào; bạn vẫn dùng được ứng dụng với vị trí giả lập.',
      },
    ],
  },
  {
    title: { en: '7. How long we keep it', vi: '7. Thời gian lưu trữ' },
    bullets: [
      {
        en: 'Account, chat history, coins, quests and coupons: until you delete your account.',
        vi: 'Tài khoản, lịch sử trò chuyện, xu, nhiệm vụ và phiếu: cho đến khi bạn xóa tài khoản.',
      },
      {
        en: 'Chat rate-limit records: about 3 days.',
        vi: 'Bản ghi giới hạn tin nhắn: khoảng 3 ngày.',
      },
      {
        en: 'Photo fingerprints (not the photos): kept so a photo cannot be reused. They cannot be turned back into the picture.',
        vi: 'Dấu vân tay của ảnh (không phải ảnh): được giữ để không thể dùng lại ảnh. Không thể chuyển ngược lại thành ảnh.',
      },
      {
        en: 'Photos waiting for review: until a person decides, and at most 14 days. Then they are deleted.',
        vi: 'Ảnh đang chờ xem xét: cho đến khi có người quyết định, tối đa 14 ngày. Sau đó ảnh bị xóa.',
      },
      {
        en: 'Quest check log (results and fingerprints, no photos): 90 days.',
        vi: 'Nhật ký kiểm tra nhiệm vụ (kết quả và dấu vân tay, không có ảnh): 90 ngày.',
      },
    ],
  },
  {
    title: { en: '8. Your rights', vi: '8. Quyền của bạn' },
    paragraphs: [
      {
        en: 'You can ask to see, correct or delete your personal data, and you can withdraw your consent. Travelers can delete their account and everything in it directly from the Profile page in the app. Shop owners and anyone else can write to us at the address above. Eco-Pet aims to handle personal data in line with Vietnam\'s personal data protection regulations (such as Decree 13/2023/ND-CP).',
        vi: 'Bạn có thể yêu cầu xem, chỉnh sửa hoặc xóa dữ liệu cá nhân, và có thể rút lại sự đồng ý. Du khách có thể xóa tài khoản cùng toàn bộ dữ liệu ngay trong trang Hồ sơ của ứng dụng. Chủ cửa hàng và những người khác có thể liên hệ chúng tôi qua địa chỉ ở trên. Eco-Pet hướng tới xử lý dữ liệu cá nhân phù hợp với quy định bảo vệ dữ liệu cá nhân của Việt Nam (như Nghị định 13/2023/NĐ-CP).',
      },
    ],
  },
  {
    title: { en: '9. Security', vi: '9. Bảo mật' },
    paragraphs: [
      {
        en: 'Connections are encrypted (HTTPS). Coins, coupons and rewards can only be changed by our server, never by the app on your phone, and each account can only read its own data. No system is perfectly secure, so please use a strong password.',
        vi: 'Kết nối được mã hóa (HTTPS). Xu, phiếu và phần thưởng chỉ có thể thay đổi bởi máy chủ của chúng tôi, không phải bởi ứng dụng trên điện thoại, và mỗi tài khoản chỉ đọc được dữ liệu của chính mình. Không hệ thống nào an toàn tuyệt đối, vì vậy hãy dùng mật khẩu mạnh.',
      },
    ],
  },
  {
    title: { en: '10. Age', vi: '10. Độ tuổi' },
    paragraphs: [
      {
        en: 'Eco-Pet is meant for people aged 16 and over, mainly young travelers. It is not directed at younger children.',
        vi: 'Eco-Pet dành cho người từ 16 tuổi trở lên, chủ yếu là du khách trẻ. Ứng dụng không hướng đến trẻ nhỏ hơn.',
      },
    ],
  },
  {
    title: { en: '11. Changes', vi: '11. Thay đổi' },
    paragraphs: [
      {
        en: 'If we change this policy in a way that matters, we will update the version above and ask for your consent again where required.',
        vi: 'Nếu chúng tôi thay đổi chính sách theo cách quan trọng, chúng tôi sẽ cập nhật phiên bản ở trên và xin lại sự đồng ý của bạn khi cần.',
      },
    ],
  },
]

// ---------------------------------------------------------------- landing page

export const LANDING = {
  heroTitle: { en: 'Travel the Mekong Delta. Leave it better.', vi: 'Du lịch miền Tây. Để lại điều tốt đẹp hơn.' } as Localized,
  heroText: {
    en: 'Eco-Pet turns sustainable choices into rewards. Complete real-world quests with Meilu, your AI bird guide, earn coins, and trade them for discounts at local family-run businesses.',
    vi: 'Eco-Pet biến những lựa chọn bền vững thành phần thưởng. Hoàn thành nhiệm vụ thực tế cùng Meilu, chú chim hướng dẫn viên AI, kiếm xu và đổi lấy ưu đãi tại các cửa hàng gia đình địa phương.',
  } as Localized,
  pilot: {
    en: 'Eco-Pet is currently a prototype pilot for Can Tho and nearby destinations.',
    vi: 'Eco-Pet hiện là bản thử nghiệm cho Cần Thơ và các điểm đến lân cận.',
  } as Localized,

  howTitle: { en: 'How it works', vi: 'Cách hoạt động' } as Localized,
  steps: [
    {
      title: { en: 'Tell us about your trip', vi: 'Cho chúng tôi biết về chuyến đi' },
      text: {
        en: 'Say how many days you stay and where you are going, and Eco-Pet suggests quests that fit your itinerary. Not feeling one? Skip it and get a new one.',
        vi: 'Cho biết bạn ở mấy ngày và đi đâu, Eco-Pet sẽ gợi ý nhiệm vụ phù hợp lịch trình. Không thích? Bỏ qua và nhận nhiệm vụ mới.',
      },
    },
    {
      title: { en: 'Do Mekong Quests', vi: 'Làm nhiệm vụ Mekong' },
      text: {
        en: 'Visit a floating market, ride a public bus, hike a nature trail, or bring your own bottle and utensils. A photo and your location confirm that you really did it.',
        vi: 'Ghé chợ nổi, đi xe buýt công cộng, đi bộ đường mòn thiên nhiên, hoặc mang theo bình nước và dụng cụ ăn uống riêng. Ảnh và vị trí xác nhận bạn đã thực sự làm.',
      },
    },
    {
      title: { en: 'Earn coins', vi: 'Kiếm xu' },
      text: {
        en: 'Every verified quest pays coins. You can also watch an optional short video for a few extra coins, but quests always pay more.',
        vi: 'Mỗi nhiệm vụ được xác minh đều có xu. Bạn cũng có thể xem video ngắn tùy chọn để nhận thêm ít xu, nhưng nhiệm vụ luôn được thưởng nhiều hơn.',
      },
    },
    {
      title: { en: 'Redeem at local shops', vi: 'Đổi tại cửa hàng địa phương' },
      text: {
        en: 'Trade coins for a discount coupon from a partner shop and show its QR code. The shop scans it, and your money goes straight to a small local business.',
        vi: 'Đổi xu lấy phiếu giảm giá của cửa hàng đối tác và đưa mã QR. Cửa hàng quét mã, và tiền của bạn đến thẳng một cửa hàng nhỏ địa phương.',
      },
    },
  ],

  meiluTitle: { en: 'Meet Meilu, your pocket-size local guide', vi: 'Gặp Meilu, hướng dẫn viên bỏ túi của bạn' } as Localized,
  meiluText: {
    en: 'Meilu is a small, curious bird who knows where you are. Ask her for places nearby, local history and culture, or a quick translation between Vietnamese and English. She remembers your trips, so she is still there when you come back to the Mekong.',
    vi: 'Meilu là chú chim nhỏ tò mò, biết bạn đang ở đâu. Hãy hỏi cô ấy về địa điểm gần đó, lịch sử, văn hóa địa phương hoặc dịch nhanh giữa tiếng Việt và tiếng Anh. Meilu nhớ các chuyến đi của bạn, nên cô ấy vẫn ở đó khi bạn quay lại miền Tây.',
  } as Localized,

  vendorsTitle: { en: 'For local businesses', vi: 'Dành cho cửa hàng địa phương' } as Localized,
  vendorsText: {
    en: 'Market sellers, cafes and small shops can appear on the Eco-Pet map and offer their own coupons. You choose the discount and the coin price. Pricing is simple and fully visible in your dashboard:',
    vi: 'Tiểu thương ở chợ, quán cà phê và cửa hàng nhỏ có thể xuất hiện trên bản đồ Eco-Pet và tự phát hành phiếu giảm giá. Bạn quyết định mức giảm và giá xu. Giá cả đơn giản và hiển thị đầy đủ trong bảng điều khiển của bạn:',
  } as Localized,
  vendorBullets: [
    { en: 'Subscription: 349,000 VND per month, 299,000 VND per month on a 6-month plan, or 249,000 VND per month on an annual plan. New businesses get 10% off their first payment.', vi: 'Gói đăng ký: 349.000 VND mỗi tháng, 299.000 VND mỗi tháng với gói 6 tháng, hoặc 249.000 VND mỗi tháng với gói năm. Cửa hàng mới được giảm 10% lần thanh toán đầu.' },
    { en: 'Commission: 5% of the amount a traveler pays, only on coupons that are actually redeemed. A coupon nobody uses costs you nothing.', vi: 'Hoa hồng: 5% số tiền khách trả, chỉ trên phiếu thực sự được sử dụng. Phiếu không ai dùng thì bạn không mất gì.' },
    { en: 'Transparency: your dashboard shows every claimed and redeemed coupon, the sales Eco-Pet brought you, and every fee.', vi: 'Minh bạch: bảng điều khiển hiển thị mọi phiếu đã nhận và đã dùng, doanh số Eco-Pet mang lại và mọi khoản phí.' },
    { en: 'No special equipment: scan with any phone, or confirm a short code by text message.', vi: 'Không cần thiết bị đặc biệt: quét bằng điện thoại bất kỳ, hoặc xác nhận mã ngắn qua tin nhắn.' },
  ] as Localized[],

  deltaTitle: { en: 'About the Mekong Delta and travelling lightly', vi: 'Về miền Tây và du lịch nhẹ nhàng' } as Localized,
  deltaParagraphs: [
    {
      en: 'The Mekong Delta is where the Mekong River spreads into a web of channels, canals and islands before reaching the sea. Life here moves with the water: fruit orchards, rice fields, small family businesses and boats that double as shops. Cai Rang floating market near Can Tho is one of the best known, where farmers sell fruit and vegetables straight from their boats; Ben Tre is called the land of coconuts; and Tra Su is a protected melaleuca forest that turns green with duckweed in the high-water season.',
      vi: 'Đồng bằng sông Cửu Long là nơi sông Mê Kông tỏa ra thành mạng lưới sông ngòi, kênh rạch và cù lao trước khi đổ ra biển. Cuộc sống ở đây chảy theo dòng nước: vườn cây ăn trái, ruộng lúa, những cơ sở gia đình nhỏ và ghe thuyền kiêm cửa hàng. Chợ nổi Cái Răng gần Cần Thơ là một trong những nơi nổi tiếng nhất, nơi nhà vườn bán trái cây, rau củ ngay trên ghe; Bến Tre được gọi là xứ dừa; và Trà Sư là khu rừng tràm được bảo vệ, phủ xanh bèo vào mùa nước nổi.',
    },
    {
      en: 'Most visitors stay only a day or two, so small habits matter. A few that make a real difference: carry a refillable bottle and your own utensils, take public transport when you can, buy from small local sellers, ask before photographing people, and dress modestly at pagodas. Eco-Pet simply makes these habits easy and rewarding.',
      vi: 'Phần lớn du khách chỉ ở một hoặc hai ngày, nên những thói quen nhỏ rất quan trọng. Vài việc tạo khác biệt thực sự: mang theo bình nước dùng lại và dụng cụ ăn uống riêng, đi phương tiện công cộng khi có thể, mua của tiểu thương địa phương, xin phép trước khi chụp ảnh người khác và ăn mặc kín đáo ở chùa. Eco-Pet chỉ giúp những thói quen này trở nên dễ dàng và có thưởng.',
    },
  ] as Localized[],

  faqTitle: { en: 'Questions', vi: 'Câu hỏi thường gặp' } as Localized,
  faq: [
    {
      q: { en: 'Is Eco-Pet free for travelers?', vi: 'Eco-Pet có miễn phí cho du khách không?' },
      a: { en: 'Yes. Travelers use it for free. Eco-Pet is funded by subscriptions from local businesses and by advertising.', vi: 'Có. Du khách dùng miễn phí. Eco-Pet được duy trì nhờ phí đăng ký của cửa hàng địa phương và quảng cáo.' },
    },
    {
      q: { en: 'How are quests verified?', vi: 'Nhiệm vụ được xác minh như thế nào?' },
      a: { en: 'You take a photo with the in-app camera, and the app checks your location. An AI service then looks at the photo to confirm it shows what the quest asks for. If the AI is unsure, a person on our team takes a look before you are rewarded. We do not keep the photo once the check is done.', vi: 'Bạn chụp ảnh bằng camera trong ứng dụng, và ứng dụng kiểm tra vị trí của bạn. Sau đó dịch vụ AI xem ảnh để xác nhận đúng yêu cầu nhiệm vụ. Nếu AI chưa chắc chắn, một người trong nhóm chúng tôi sẽ xem trước khi bạn nhận thưởng. Chúng tôi không giữ ảnh sau khi kiểm tra xong.' },
    },
    {
      q: { en: 'Do I have to share my location?', vi: 'Tôi có bắt buộc chia sẻ vị trí không?' },
      a: { en: 'Only when you use a feature that needs it, and you can pick a place yourself instead of using GPS.', vi: 'Chỉ khi bạn dùng tính năng cần đến, và bạn có thể tự chọn địa điểm thay vì dùng GPS.' },
    },
    {
      q: { en: 'What happens to my data?', vi: 'Dữ liệu của tôi được xử lý ra sao?' },
      a: { en: 'We collect only what the app needs, with your consent, and you can delete your account at any time. Read the full Privacy Policy for details.', vi: 'Chúng tôi chỉ thu thập những gì ứng dụng cần, với sự đồng ý của bạn, và bạn có thể xóa tài khoản bất cứ lúc nào. Hãy đọc Chính sách quyền riêng tư để biết chi tiết.' },
    },
    {
      q: { en: 'Which languages does it support?', vi: 'Ứng dụng hỗ trợ ngôn ngữ nào?' },
      a: { en: 'English and Tiếng Việt, and Meilu can translate between Vietnamese, English and Indonesian.', vi: 'Tiếng Anh và Tiếng Việt, và Meilu có thể dịch giữa tiếng Việt, tiếng Anh và tiếng Indonesia.' },
    },
  ] as { q: Localized; a: Localized }[],
}
