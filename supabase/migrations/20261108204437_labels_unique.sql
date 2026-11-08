-- One label per reviewer, entry and virtue. NULLS NOT DISTINCT so a general
-- agree/disagree label (virtue_id null) is also protected.

create unique index if not exists labels_entry_labeler_virtue_uniq
  on public.labels (entry_id, labeler_id, virtue_id) nulls not distinct;

comment on index public.labels_entry_labeler_virtue_uniq is
  'One label per reviewer, entry and virtue. Without this a reviewer could label the same entry twice and both rows would count.';
