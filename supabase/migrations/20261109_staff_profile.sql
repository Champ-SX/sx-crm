-- Staff page: extra profile fields on the staff registry.
alter table staff_members
  add column if not exists line_id         text,
  add column if not exists skills          text[] not null default '{}',
  add column if not exists default_fee_thb numeric,
  add column if not exists note            text,
  add column if not exists is_active       boolean not null default true;
