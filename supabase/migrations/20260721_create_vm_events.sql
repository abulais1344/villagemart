create table if not exists vm_events (
  id           bigint generated always as identity primary key,
  event_type   text not null,
  reason       text,
  source       text,
  customer_id  text,
  merchant_id  uuid,
  session_id   text,
  metadata     jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists idx_vm_events_type_created
  on vm_events (event_type, created_at desc);

create index if not exists idx_vm_events_reason_created
  on vm_events (reason, created_at desc)
  where reason is not null;
