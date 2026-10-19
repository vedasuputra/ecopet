// Demo traveler progress, used by the /dev panel ("Load demo progress") and by scripts/seed-demo.mjs.
// No imports on purpose: the seed script and the /api functions run this file directly with Node.

/** What the demo traveler's server-side economy looks like (coins, quests, one unused coupon). */
export const DEMO_ECONOMY = {
  coins: 85,
  questsDone: ['q2', 'q6'],
  couponId: 'c2', // an unused Cafe Sen Xanh coupon, ready to be scanned by the vendor dashboard
}

/** The client-side part of a traveler halfway through a 3-day Can Tho trip. */
export function buildDemoState(name = 'Linh') {
  return {
    user: { name, days: 3, destinations: ['Can Tho', 'Cai Rang Floating Market'] },
    activeQuestIds: ['q1', 'q2', 'q5', 'q6', 'q8'],
    chatHistory: [
      { role: 'user' as const, text: 'What Mekong Delta dishes should I try?' },
      {
        role: 'meilu' as const,
        text: 'Try banh xeo, lau mam and grilled snakehead fish! Check the map too: partner cafes like Cafe Sen Xanh have coupons you can trade your coins for.',
      },
    ],
  }
}
