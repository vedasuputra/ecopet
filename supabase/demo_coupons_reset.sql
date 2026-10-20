-- Eco-Pet: RESET every coupon and give every demo shop three coupons. Run AFTER vendor_kind_schema.sql and deal_type_schema.sql.
--
-- WARNING: this DELETES all coupon offers (including ones vendors made, such as "Coffee + pastry combo") and ALL coupons
-- travelers have already received (coupons_issued, so also the redeemed history). Coins spent on them are NOT given back.
-- Run it only when you want to start over. The 14 shops are made up: no real business is presented as a partner.
--
-- Shops: v1-v6 already exist (Can Tho and Ben Tre); v7-v14 are new and spread over Vinh Long, My Tho, Sa Dec, Chau Doc, Tra Su
-- and Mang Thit. Each shop has a category (kind): food_drink, shopping or activity. Its three coupons are of different types
-- (percent, amount off, free gift, combo) and match what the shop sells.

-- ============================================================================ 1. reset
delete from public.coupons_issued;
delete from public.coupon_offers;

-- ============================================================================ 2. the new demo shops
insert into public.vendors (id, name, category_en, category_vi, kind, lat, lng, address, open_hours, plan_paid_until, plan_started_at) values
  ('v7',  'An Binh Orchard Cafe',      'Orchard cafe',       'Quán cà phê vườn',    'food_drink', 10.2990, 105.9930, 'An Binh island, Vinh Long',            '{"mon":["07:00","19:00"],"tue":["07:00","19:00"],"wed":["07:00","19:00"],"thu":["07:00","19:00"],"fri":["07:00","19:00"],"sat":["07:00","20:00"],"sun":["07:00","20:00"]}', now() + interval '1 year', now()),
  ('v8',  'Thoi Son Honey House',      'Honey & souvenirs',  'Mật ong & quà lưu niệm', 'shopping', 10.3324, 106.3207, 'Thoi Son island, My Tho',               '{"mon":["08:00","17:00"],"tue":["08:00","17:00"],"wed":["08:00","17:00"],"thu":["08:00","17:00"],"fri":["08:00","17:00"],"sat":["08:00","17:00"],"sun":["08:00","17:00"]}', now() + interval '1 year', now()),
  ('v9',  'Sa Dec Flower Garden',      'Flowers & plants',   'Hoa & cây cảnh',      'shopping',   10.3178, 105.7461, 'Sa Dec flower village, Dong Thap',     '{"mon":["06:00","18:00"],"tue":["06:00","18:00"],"wed":["06:00","18:00"],"thu":["06:00","18:00"],"fri":["06:00","18:00"],"sat":["06:00","18:00"],"sun":["06:00","18:00"]}', now() + interval '1 year', now()),
  ('v10', 'Chau Doc Mam Kitchen',      'Local eatery',       'Quán ăn địa phương',  'food_drink', 10.7115, 105.1195, 'Near Chau Doc market, An Giang',       '{"mon":["09:00","21:00"],"tue":["09:00","21:00"],"wed":["09:00","21:00"],"thu":["09:00","21:00"],"fri":["09:00","21:00"],"sat":["09:00","21:00"],"sun":["09:00","21:00"]}', now() + interval '1 year', now()),
  ('v11', 'Tra Su Forest Boat Rides',  'Boat tours',         'Tour xuồng',          'activity',   10.5862, 105.0589, 'Tra Su cajuput forest, An Giang',      '{"mon":["07:00","17:00"],"tue":["07:00","17:00"],"wed":["07:00","17:00"],"thu":["07:00","17:00"],"fri":["07:00","17:00"],"sat":["06:30","17:30"],"sun":["06:30","17:30"]}', now() + interval '1 year', now()),
  ('v12', 'Mang Thit Pottery Studio',  'Pottery & crafts',   'Gốm & thủ công',      'shopping',   10.1262, 106.0904, 'Mang Thit, Vinh Long',                 '{"mon":["08:00","17:00"],"tue":["08:00","17:00"],"wed":["08:00","17:00"],"thu":["08:00","17:00"],"fri":["08:00","17:00"],"sat":["08:00","17:00"]}', now() + interval '1 year', now()),
  ('v13', 'My Tho Coconut Cafe',       'Cafe',               'Quán cà phê',         'food_drink', 10.3574, 106.3680, 'Near My Tho market, Dong Thap',        '{"mon":["06:30","21:00"],"tue":["06:30","21:00"],"wed":["06:30","21:00"],"thu":["06:30","21:00"],"fri":["06:30","21:00"],"sat":["06:30","22:00"],"sun":["06:30","22:00"]}', now() + interval '1 year', now()),
  ('v14', 'Sam Mountain Bike Tours',   'Bike tours',         'Tour xe đạp',         'activity',   10.6763, 105.0786, 'Foot of Sam Mountain, Chau Doc',       '{"mon":["07:00","17:00"],"tue":["07:00","17:00"],"wed":["07:00","17:00"],"thu":["07:00","17:00"],"fri":["07:00","17:00"],"sat":["07:00","17:00"],"sun":["07:00","17:00"]}', now() + interval '1 year', now())
on conflict (id) do nothing;

-- every demo shop (new or old) that nobody has claimed stays paid up, with the right category
update public.vendors set plan_paid_until = now() + interval '1 year', plan_started_at = coalesce(plan_started_at, now())
  where id in ('v1','v2','v3','v4','v5','v6','v7','v8','v9','v10','v11','v12','v13','v14') and owner_id is null;
update public.vendors set kind = 'food_drink' where id in ('v1', 'v2', 'v3', 'v7', 'v10', 'v13');
update public.vendors set kind = 'shopping'   where id in ('v4', 'v5', 'v8', 'v9', 'v12');
update public.vendors set kind = 'activity'   where id in ('v6', 'v11', 'v14');

-- ============================================================================ 3. three coupons for every shop
-- Prices: a discount (percent or amount off) is the cheapest, a combo costs more, and a free gift costs the most.
-- columns: id, vendor, English title, Vietnamese title, percent (0 unless percent), deal type, amount off (VND, only for amount), coin price, short code, days valid (7, the most allowed)
insert into public.coupon_offers (id, vendor_id, title_en, title_vi, discount_pct, deal_type, deal_value, cost_coins, code, valid_days) values
  -- v1 Ba Tu Fruit Boat (food and drink)
  ('c1',   'v1', 'Fresh fruit discount',                      'Giảm giá trái cây tươi',                 10, 'percent', null,  75, 'BT10',    7),
  ('c1b',  'v1', 'Free coconut water with a fruit basket',    'Tặng nước dừa khi mua giỏ trái cây',      0, 'free',    null,  205, 'BTFREE',  7),
  ('c1c',  'v1', 'Fruit + smoothie combo',                    'Combo trái cây + sinh tố',                0, 'combo',   null,  150, 'BTCOMBO', 7),
  -- v2 Cafe Sen Xanh (food and drink)
  ('c2',   'v2', 'Coffee discount',                           'Giảm giá cà phê',                        15, 'percent', null,  95, 'SX15',    7),
  ('c2b',  'v2', 'Coffee + pastry combo',                     'Combo cà phê + bánh ngọt',                0, 'combo',   null,  170, 'SXCOMBO', 7),
  ('c2c',  'v2', 'Iced coffee, 20k off',                      'Cà phê đá, giảm 20.000đ',                 0, 'amount',  20000, 85, 'SX20K',   7),
  -- v3 Banh Xeo Co Lan (food and drink)
  ('c3',   'v3', 'Banh xeo discount',                         'Giảm giá bánh xèo',                      20, 'percent', null,  115, 'CL20',    7),
  ('c3b',  'v3', 'Free spring rolls with a banh xeo set',     'Tặng gỏi cuốn khi gọi set bánh xèo',      0, 'free',    null,  225, 'CLFREE',  7),
  ('c3c',  'v3', 'Banh xeo + sweet soup combo',               'Combo bánh xèo + chè',                    0, 'combo',   null,  180, 'CLCOMBO', 7),
  -- v4 Coconut Candy Ben Tre (shopping)
  ('c4',   'v4', 'Coconut candy discount',                    'Giảm giá kẹo dừa',                       10, 'percent', null,  85, 'CB10',    7),
  ('c4b',  'v4', 'Free candy sample box with a gift pack',    'Tặng hộp kẹo dùng thử khi mua quà',       0, 'free',    null,  225, 'CBFREE',  7),
  ('c4c',  'v4', 'Gift pack, 30k off',                        'Hộp quà, giảm 30.000đ',                   0, 'amount',  30000, 130, 'CB30K',   7),
  -- v5 Mekong Craft Corner (shopping)
  ('c5',   'v5', 'Crafts discount',                           'Giảm giá đồ thủ công',                   25, 'percent', null,  150, 'MC25',    7),
  ('c5b',  'v5', 'Handmade item, 50k off',                    'Đồ thủ công, giảm 50.000đ',               0, 'amount',  50000, 170, 'MC50K',   7),
  ('c5c',  'v5', 'Free engraving on a wooden craft',          'Tặng khắc tên lên đồ gỗ',                 0, 'free',    null,  280, 'MCFREE',  7),
  -- v6 Green Bike Rental (activity)
  ('c6',   'v6', 'Bike rental discount',                      'Giảm giá thuê xe đạp',                   20, 'percent', null,  105, 'GB20',    7),
  ('c6b',  'v6', 'Free helmet and water with a day rental',   'Tặng mũ bảo hiểm và nước khi thuê cả ngày', 0, 'free',  null,  245, 'GBFREE',  7),
  ('c6c',  'v6', 'Bike + river tour combo',                   'Combo xe đạp + tour sông',                0, 'combo',   null,  195, 'GBCOMBO', 7),
  -- v7 An Binh Orchard Cafe (food and drink)
  ('c7',   'v7', 'Orchard fruit plate, 15% off',              'Đĩa trái cây vườn, giảm 15%',            15, 'percent', null,  85, 'AB15',    7),
  ('c7b',  'v7', 'Free fruit tea with any plate',             'Tặng trà trái cây khi gọi đĩa trái cây',  0, 'free',    null,  205, 'ABFREE',  7),
  ('c7c',  'v7', 'Fruit plate + coffee combo',                'Combo đĩa trái cây + cà phê',             0, 'combo',   null,  160, 'ABCOMBO', 7),
  -- v8 Thoi Son Honey House (shopping)
  ('c8',   'v8', 'Honey discount',                            'Giảm giá mật ong',                       10, 'percent', null,  75, 'TS10',    7),
  ('c8b',  'v8', 'Honey jar, 25k off',                        'Hũ mật ong, giảm 25.000đ',                0, 'amount',  25000, 95, 'TS25K',   7),
  ('c8c',  'v8', 'Free honey tea tasting',                    'Tặng thử trà mật ong',                    0, 'free',    null,  170, 'TSFREE',  7),
  -- v9 Sa Dec Flower Garden (shopping)
  ('c9',   'v9', 'Plants and flowers, 15% off',               'Cây và hoa, giảm 15%',                   15, 'percent', null,  105, 'SD15',    7),
  ('c9b',  'v9', 'Small plant, 20k off',                      'Chậu cây nhỏ, giảm 20.000đ',              0, 'amount',  20000, 85, 'SD20K',   7),
  ('c9c',  'v9', 'Free pot with any plant',                   'Tặng chậu khi mua cây',                   0, 'free',    null,  190, 'SDFREE',  7),
  -- v10 Chau Doc Mam Kitchen (food and drink)
  ('c10',  'v10', 'Local dishes discount',                    'Giảm giá món địa phương',                10, 'percent', null,  85, 'CD10',    7),
  ('c10b', 'v10', 'Fish noodle + tea combo',                  'Combo bún cá + trà',                      0, 'combo',   null,  160, 'CDCOMBO', 7),
  ('c10c', 'v10', 'Free side dish with a main',               'Tặng món phụ khi gọi món chính',          0, 'free',    null,  205, 'CDFREE',  7),
  -- v11 Tra Su Forest Boat Rides (activity)
  ('c11',  'v11', 'Boat ride, 15% off',                       'Đi xuồng, giảm 15%',                     15, 'percent', null,  130, 'TR15',    7),
  ('c11b', 'v11', 'Free sunrise drink with a boat ride',      'Tặng nước uống khi đi xuồng buổi sáng',   0, 'free',    null,  280, 'TRFREE',  7),
  ('c11c', 'v11', 'Boat ride + local lunch combo',            'Combo đi xuồng + bữa trưa địa phương',    0, 'combo',   null, 245, 'TRCOMBO', 7),
  -- v12 Mang Thit Pottery Studio (shopping)
  ('c12',  'v12', 'Pottery discount',                         'Giảm giá đồ gốm',                        20, 'percent', null,  140, 'MT20',    7),
  ('c12b', 'v12', 'Pottery piece, 40k off',                   'Sản phẩm gốm, giảm 40.000đ',              0, 'amount',  40000, 150, 'MT40K',   7),
  ('c12c', 'v12', 'Free try-it-yourself clay session',        'Tặng buổi nặn gốm thử',                   0, 'free',    null,  265, 'MTFREE',  7),
  -- v13 My Tho Coconut Cafe (food and drink)
  ('c13',  'v13', 'Coconut coffee discount',                  'Giảm giá cà phê dừa',                    15, 'percent', null,  95, 'MY15',    7),
  ('c13b', 'v13', 'Coconut coffee + pastry combo',            'Combo cà phê dừa + bánh ngọt',            0, 'combo',   null,  170, 'MYCOMBO', 7),
  ('c13c', 'v13', 'Any drink, 15k off',                       'Mọi loại thức uống, giảm 15.000đ',        0, 'amount',  15000, 75, 'MY15K',   7),
  -- v14 Sam Mountain Bike Tours (activity)
  ('c14',  'v14', 'Bike tour discount',                       'Giảm giá tour xe đạp',                   20, 'percent', null,  115, 'SM20',    7),
  ('c14b', 'v14', 'Free water and a map',                     'Tặng nước và bản đồ',                     0, 'free',    null,  245, 'SMFREE',  7),
  ('c14c', 'v14', 'Bike + temple tour combo',                 'Combo xe đạp + tham quan đền',            0, 'combo',   null, 190, 'SMCOMBO', 7);
