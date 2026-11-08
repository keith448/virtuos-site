-- The first account for a role has no prior approver. Rather than disguise that as
-- an approval, record it as its own decision type, so the audit can see the
-- bootstrap for what it is.

alter table public.reviewer_decisions drop constraint if exists reviewer_decisions_decision_check;
alter table public.reviewer_decisions
  add constraint reviewer_decisions_decision_check
  check (decision in ('approved','rejected','bootstrap'));

comment on column public.reviewer_decisions.decision is
  'approved | rejected | bootstrap. bootstrap is the first account for a role, recorded explicitly rather than disguised as an approval.';
