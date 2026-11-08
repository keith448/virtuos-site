-- New enum values only. ALTER TYPE ... ADD VALUE cannot be used in the same
-- transaction that references the new value, so this is its own migration.

alter type public.labeler_role add value if not exists 'reviewer_translation';
alter type public.labeler_role add value if not exists 'reviewer_virtue';
alter type public.labeler_role add value if not exists 'reviewer_adjudicator';
