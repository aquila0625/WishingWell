create table if not exists churches (
  id bigint primary key,
  created_at bigint not null,
  data jsonb not null
);

create table if not exists users (
  id bigint primary key,
  created_at bigint not null,
  data jsonb not null
);

create table if not exists wishes (
  id bigint primary key,
  created_at bigint not null,
  data jsonb not null
);

create table if not exists comments (
  id bigint primary key,
  created_at bigint not null,
  data jsonb not null
);

create table if not exists notifications (
  id bigint primary key,
  created_at bigint not null,
  data jsonb not null
);

create table if not exists settings (
  id bigint primary key,
  created_at bigint not null,
  data jsonb not null
);

create table if not exists email_logs (
  id bigint primary key,
  created_at bigint not null,
  data jsonb not null
);

create index if not exists wishes_created_at_idx on wishes (created_at desc);
create index if not exists users_email_idx on users ((lower(data->>'email')));
create index if not exists notifications_user_id_idx on notifications (((data->>'user_id')::bigint));

create table if not exists staging_churches (
  id bigint primary key,
  created_at bigint not null,
  data jsonb not null
);

create table if not exists staging_users (
  id bigint primary key,
  created_at bigint not null,
  data jsonb not null
);

create table if not exists staging_wishes (
  id bigint primary key,
  created_at bigint not null,
  data jsonb not null
);

create table if not exists staging_comments (
  id bigint primary key,
  created_at bigint not null,
  data jsonb not null
);

create table if not exists staging_notifications (
  id bigint primary key,
  created_at bigint not null,
  data jsonb not null
);

create table if not exists staging_settings (
  id bigint primary key,
  created_at bigint not null,
  data jsonb not null
);

create table if not exists staging_email_logs (
  id bigint primary key,
  created_at bigint not null,
  data jsonb not null
);

create index if not exists staging_wishes_created_at_idx on staging_wishes (created_at desc);
create index if not exists staging_users_email_idx on staging_users ((lower(data->>'email')));
create index if not exists staging_notifications_user_id_idx on staging_notifications (((data->>'user_id')::bigint));
