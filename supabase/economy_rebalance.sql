-- Eco-Pet: a new balance for the coin economy. Safe to re-run (every statement sets absolute values).
-- * the cheapest coupon costs 75 coins and the others grow in the same proportion (in steps of 5)
-- * a quest pays 5, 10, 15, ... coins (the old amounts are rounded to the nearest 5)
-- * (the daily limit of rewarded ads, now 10, is a setting of the server code: api/economy.ts)
-- Run it AFTER any of the other seed files, because some of them set the old amounts again.

update public.coupon_offers o set cost_coins = v.cost
  from (values
  ('c1', 75),
  ('c1b', 205),
  ('c1c', 150),
  ('c2', 95),
  ('c2b', 170),
  ('c2c', 85),
  ('c3', 115),
  ('c3b', 225),
  ('c3c', 180),
  ('c4', 85),
  ('c4b', 225),
  ('c4c', 130),
  ('c5', 150),
  ('c5b', 170),
  ('c5c', 280),
  ('c6', 105),
  ('c6b', 245),
  ('c6c', 195),
  ('c7', 85),
  ('c7b', 205),
  ('c7c', 160),
  ('c8', 75),
  ('c8b', 95),
  ('c8c', 170),
  ('c9', 105),
  ('c9b', 85),
  ('c9c', 190),
  ('c10', 85),
  ('c10b', 160),
  ('c10c', 205),
  ('c11', 130),
  ('c11b', 280),
  ('c11c', 245),
  ('c12', 140),
  ('c12b', 150),
  ('c12c', 265),
  ('c13', 95),
  ('c13b', 170),
  ('c13c', 75),
  ('c14', 115),
  ('c14b', 245),
  ('c14c', 190)
  ) as v(id, cost)
  where o.id = v.id;

-- a coupon a shop made itself that costs less than the new minimum goes up to it
update public.coupon_offers set cost_coins = 75 where cost_coins < 75;

update public.quests set reward_coins = greatest(5, (round(reward_coins / 5.0) * 5)::int);
