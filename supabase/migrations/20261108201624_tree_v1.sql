-- tree_v1: the first lineage assignments. Only merges that pass L2/L3 of the
-- codebook are applied; everything else stays a separate root until adjudicated.
--
-- Effect on raw reach: reciprocity 6 (unchanged), gratitude 4 -> 3, mercy 3 -> 2.
-- Both drops come from traditions that shared a root: Japanese folk with Japanese,
-- Greek fable with Roman, Christian with Gnostic Christian.

insert into public.traditions (name, description) values
  ('Christianity', 'Lineage root: traditions deriving authority from the Christian scriptures and creeds'),
  ('Judaism', 'Lineage root: traditions deriving authority from the Hebrew Bible and rabbinic literature'),
  ('Greco-Roman fable', 'Lineage root: the Aesopic fable tradition through Babrius, Phaedrus and their successors'),
  ('Celtic', 'Lineage root: the Celtic-language oral and literary traditions')
on conflict (name) do nothing;

update public.traditions c
set parent_id = p.id
from public.traditions p
where (c.name, p.name) in (
  ('Christian', 'Christianity'),
  ('Gnostic Christian (Nag Hammadi)', 'Christianity'),
  ('Hebrew Bible', 'Judaism'),
  ('Rabbinic Judaism', 'Judaism'),
  ('Jewish folk tradition', 'Judaism'),
  ('Greek fable (Aesopic)', 'Greco-Roman fable'),
  ('Roman', 'Greco-Roman fable'),
  ('French fable (La Fontaine)', 'Greco-Roman fable'),
  ('Japanese folk tradition', 'Japanese'),
  ('Japanese (Bushido)', 'Japanese'),
  ('Chinese folk tradition', 'Chinese'),
  ('Indian story literature', 'Indian'),
  ('English', 'British'),
  ('English folk tradition', 'British'),
  ('Celtic folk tradition', 'Celtic'),
  ('Irish', 'Celtic')
);
