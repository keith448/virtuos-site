-- Catholic as its own tradition, under the Christianity root. It displays as
-- Catholic and counts once for lineage purposes, which is the distinction the
-- tree exists to hold.

insert into public.traditions (name, description, parent_id)
values ('Catholic', 'The Catholic churches, counted under the Christianity root', '723afcec-2f2f-46ca-8326-ef8c598ffd85')
on conflict (name) do nothing;
