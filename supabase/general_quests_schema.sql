-- Eco-Pet: two kinds of quests. Safe to re-run. Run AFTER quests_and_expiry_schema.sql.
--
--   place   quest: only doable at one spot (destination + lat/lng + radius), pays MORE coins.
--                  Shown in the itinerary for the places the traveler is going to.
--   general quest: doable anywhere (no place, no location check), pays FEWER coins.
--                  Always listed in the Quests tab.
--
-- To add a quest later: Supabase -> Table Editor -> quests. For a general quest set scope = general and
-- leave destination, lat, lng and radius_m empty.

alter table public.quests add column if not exists scope text not null default 'place';
alter table public.quests drop constraint if exists quests_scope_check;
alter table public.quests add constraint quests_scope_check check (scope in ('place', 'general'));

-- what the photo must show as evidence of the purchase / the sustainable action (the AI is told to check it)
alter table public.quests add column if not exists photo_proof text;

alter table public.quests alter column destination drop not null;
alter table public.quests alter column lat drop not null;
alter table public.quests alter column lng drop not null;
alter table public.quests alter column radius_m drop not null;

-- more kinds of places and things a photo can show (the AI is told "a photo taken at: <scene>")
alter table public.quests drop constraint if exists quests_required_scene_check;
alter table public.quests add constraint quests_required_scene_check check (required_scene in ('floating market', 'traditional market', 'hiking trail', 'nature landmark', 'river or canal', 'orchard or garden', 'temple or historic building', 'local food stall', 'wildlife or birds', 'hand-rowed boat without a motor', 'bicycle', 'family craft workshop', 'fruit orchard', 'local product stall'));

-- a place quest must have its place; a general quest must not need one
alter table public.quests drop constraint if exists quests_place_needs_spot;
alter table public.quests add constraint quests_place_needs_spot check (
  scope = 'general' or (destination is not null and lat is not null and lng is not null and radius_m is not null)
);

-- Quests that do not depend on a place become general (and pay less).
-- Rewards follow the effort: bottle 10, utensils 12, coupon 15, bus 20 (all below any place quest).
update public.quests set scope = 'general', destination = null, lat = null, lng = null, radius_m = null, reward_coins = 20 where id = 'q5';
update public.quests set scope = 'general', destination = null, lat = null, lng = null, radius_m = null, reward_coins = 10 where id = 'q6';
update public.quests set scope = 'general', destination = null, lat = null, lng = null, radius_m = null, reward_coins = 12 where id = 'q7';
update public.quests set scope = 'general', destination = null, lat = null, lng = null, radius_m = null, reward_coins = 15 where id = 'q8';

-- The place quests: every destination has 3, and every one is either sustainable (on foot, by bicycle, in a
-- hand-rowed boat) or supports small local businesses (UMKM: stalls, family eateries, workshops, orchards).
-- Rewards by effort, at most 40 coins for any quest: easy stalls and eateries 25-28, workshops/orchards/floating
-- market 30-32, hand-rowed boats 35-36, hiking 38, cycling 40 (the most demanding and the most sustainable).
-- Re-running this updates them to these texts. Coordinates are placeholders: replace them with the real spots.
insert into public.quests
  (id, type, title_en, title_vi, description_en, description_vi, destination, lat, lng, radius_m, reward_coins, required_object, required_scene, sort, scope)
values
  ('q1', 'floating_market', 'Shop at the floating market', 'Mua sắm ở chợ nổi', 'Buy something from a boat vendor and take a photo of the market scene.', 'Mua một món từ tiểu thương trên ghe và chụp ảnh khung cảnh chợ.', 'Cai Rang Floating Market', 10.0035, 105.7479, 300, 32, null, 'floating market', 1, 'place'),
  ('q2', 'traditional_market', 'Explore a traditional market', 'Khám phá chợ truyền thống', 'Shop at a traditional market and support small local businesses.', 'Mua sắm ở chợ truyền thống và ủng hộ các tiểu thương địa phương.', 'Can Tho', 10.0452, 105.7469, 200, 25, null, 'traditional market', 2, 'place'),
  ('q3', 'hiking', 'Explore Tra Su on foot', 'Khám phá Trà Sư bằng đôi chân', 'Walk a trail on foot (no motor) and take a photo of the path.', 'Đi bộ trên đường mòn (không dùng xe) và chụp ảnh con đường.', 'Tra Su', 10.5833, 105.0667, 400, 38, null, 'hiking trail', 3, 'place'),
  ('q4', 'craft', 'Visit a coconut candy workshop', 'Ghé xưởng kẹo dừa', 'Visit a small family workshop, buy something made by hand, and take a photo of the workshop or your purchase.', 'Ghé một xưởng gia đình nhỏ, mua một món làm thủ công và chụp ảnh xưởng hoặc món bạn mua.', 'Ben Tre', 10.2434, 106.3756, 300, 30, null, 'family craft workshop', 4, 'place'),
  ('q9', 'orchard', 'Buy fruit at a family orchard', 'Mua trái cây ở vườn của gia đình', 'Visit a family-run fruit orchard, buy fruit straight from the grower, and take a photo of the orchard or your fruit.', 'Ghé một vườn trái cây của gia đình, mua trái cây trực tiếp từ nhà vườn và chụp ảnh vườn hoặc trái cây của bạn.', 'Vinh Long', 10.2537, 105.9722, 400, 30, null, 'fruit orchard', 9, 'place'),
  ('q10', 'cycling', 'Cycle along the Hau River', 'Đạp xe dọc sông Hậu', 'See Ninh Kieu by bicycle instead of a motorbike or car, and take a photo of your bike by the river.', 'Ngắm bến Ninh Kiều bằng xe đạp thay vì xe máy hay ô tô, và chụp ảnh chiếc xe đạp của bạn bên sông.', 'Can Tho', 10.0334, 105.7878, 300, 40, null, 'bicycle', 10, 'place'),
  ('q11', 'local_food', 'Eat at a family-run eatery', 'Ăn ở quán ăn gia đình', 'Try a local dish at a small family-run eatery and take a photo of your meal.', 'Thử một món địa phương ở quán ăn nhỏ của gia đình và chụp ảnh bữa ăn của bạn.', 'Can Tho', 10.0674, 105.7344, 300, 25, null, 'local food stall', 11, 'place'),
  ('q12', 'local_food', 'Breakfast on the water', 'Ăn sáng trên sông', 'Eat a noodle breakfast at a small floating-market stall and take a photo of your bowl.', 'Ăn sáng món nước ở một quầy nhỏ trên chợ nổi và chụp ảnh tô của bạn.', 'Cai Rang Floating Market', 10.0038, 105.7483, 300, 28, null, 'local food stall', 12, 'place'),
  ('q13', 'rowing', 'Row through the canals with a local family', 'Chèo xuồng qua kênh rạch cùng gia đình địa phương', 'Hire a hand-rowed boat from a local family (no motor, no pollution) and take a photo of your boat on the water.', 'Thuê xuồng chèo tay của một gia đình địa phương (không động cơ, không khói) và chụp ảnh chiếc xuồng của bạn trên mặt nước.', 'Cai Rang Floating Market', 10.002, 105.75, 400, 35, null, 'hand-rowed boat without a motor', 13, 'place'),
  ('q14', 'cycling', 'Cycle through the coconut villages', 'Đạp xe qua các làng dừa', 'Explore the village lanes by bicycle and take a photo of your bike among the coconut trees.', 'Khám phá những con đường làng bằng xe đạp và chụp ảnh chiếc xe đạp của bạn giữa hàng dừa.', 'Ben Tre', 10.248, 106.368, 400, 40, null, 'bicycle', 14, 'place'),
  ('q15', 'rowing', 'Take a hand-rowed boat in Ben Tre', 'Đi xuồng chèo tay ở Bến Tre', 'Ride a hand-rowed boat through the narrow canals, run by a local boatman, and take a photo of it.', 'Đi xuồng chèo tay qua những con kênh nhỏ do người dân địa phương chèo, và chụp ảnh chiếc xuồng.', 'Ben Tre', 10.238, 106.38, 400, 35, null, 'hand-rowed boat without a motor', 15, 'place'),
  ('q16', 'rowing', 'Paddle through the cajuput forest', 'Chèo xuồng qua rừng tràm', 'Take a hand-rowed boat run by the local community and take a photo of the boat among the trees.', 'Đi xuồng chèo tay do cộng đồng địa phương vận hành và chụp ảnh chiếc xuồng giữa rừng tràm.', 'Tra Su', 10.579, 105.064, 400, 36, null, 'hand-rowed boat without a motor', 16, 'place'),
  ('q17', 'local_goods', 'Buy a local specialty at a small stall', 'Mua đặc sản địa phương ở quầy nhỏ', 'Buy a local product (honey, dried fish, snacks) from a small stall and take a photo of the stall or your purchase.', 'Mua một sản phẩm địa phương (mật ong, khô cá, bánh kẹo) ở một quầy nhỏ và chụp ảnh quầy hoặc món bạn mua.', 'Tra Su', 10.585, 105.069, 400, 25, null, 'local product stall', 17, 'place'),
  ('q18', 'craft', 'Visit a family pottery workshop', 'Ghé xưởng gốm của gia đình', 'Visit a small family pottery or brick workshop, buy something made by hand, and take a photo of it.', 'Ghé một xưởng gốm hoặc gạch nhỏ của gia đình, mua một món làm thủ công và chụp ảnh.', 'Vinh Long', 10.2476, 105.9655, 300, 32, null, 'family craft workshop', 18, 'place'),
  ('q19', 'local_food', 'Taste Vinh Long street food', 'Thưởng thức ẩm thực đường phố Vĩnh Long', 'Try a local dish at a street food stall and take a photo of it.', 'Thử một món địa phương ở quầy ăn vặt đường phố và chụp ảnh món ăn.', 'Vinh Long', 10.2531, 105.9731, 300, 25, null, 'local food stall', 19, 'place')
on conflict (id) do update set
  type = excluded.type, title_en = excluded.title_en, title_vi = excluded.title_vi,
  description_en = excluded.description_en, description_vi = excluded.description_vi,
  destination = excluded.destination, lat = excluded.lat, lng = excluded.lng, radius_m = excluded.radius_m,
  reward_coins = excluded.reward_coins, required_object = excluded.required_object,
  required_scene = excluded.required_scene, sort = excluded.sort, scope = excluded.scope;

-- Evidence the photo must show (UMKM purchases, bicycle, hand-rowed boat, on foot). Edit these in the Table Editor too.
update public.quests set photo_proof = case id
    when 'q1' then 'an item bought from a boat vendor (fruit, drink or food) held or on the boat, with the floating market around it, or the vendor boat with its goods'
    when 'q2' then 'something bought at the market (produce or goods) in hand or in a bag, or a market stall with its seller and goods'
    when 'q3' then 'the trail walked on foot, with the person''s feet or path in view and no motor vehicle on the path'
    when 'q4' then 'the family workshop where the product is made, or a handmade product (for example coconut candy) that was bought there'
    when 'q9' then 'fruit bought from the grower, or the family orchard with its fruit trees or fruit on display'
    when 'q10' then 'a bicycle (clearly a bicycle, not a motorbike) with the river or riverside in the background'
    when 'q11' then 'a served dish or meal on the table of a small family-run eatery'
    when 'q12' then 'a bowl of food served at a small floating-market stall, with the water or boats visible'
    when 'q13' then 'a small boat moved by oars or a paddle (no engine) on the water, ideally with the boatman or rower'
    when 'q14' then 'a bicycle (clearly a bicycle, not a motorbike) on a village lane or among coconut trees'
    when 'q15' then 'a small boat moved by oars or a paddle (no engine) on a narrow canal, ideally with the boatman or rower'
    when 'q16' then 'a small boat moved by oars or a paddle (no engine) among the cajuput trees on the water'
    when 'q17' then 'a local product that was bought, or the small stall selling it with its goods on display'
    when 'q18' then 'handmade pottery or brick products bought, or the small family workshop where they are made'
    when 'q19' then 'a dish served at a street food stall, with the stall or vendor setting visible'
  end
  where id in ('q1', 'q2', 'q3', 'q4', 'q9', 'q10', 'q11', 'q12', 'q13', 'q14', 'q15', 'q16', 'q17', 'q18', 'q19');
