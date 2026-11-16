-- Curriculum planner: initial schema
-- Courses -> units -> items, shared via course_members, per-user progress in item_progress.

create type public.course_role as enum ('viewer', 'editor', 'owner'); -- declaration order = rank
create type public.item_kind as enum ('read', 'watch', 'do', 'other');

-- ---------------------------------------------------------------- tables

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 5000),
  color text not null default '#4f46e5' check (color ~ '^#[0-9a-fA-F]{6}$'),
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_date is null or end_date is null or end_date >= start_date)
);

create table public.course_members (
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.course_role not null default 'viewer',
  joined_at timestamptz not null default now(),
  primary key (course_id, user_id)
);
create index course_members_user_idx on public.course_members (user_id);

create table public.course_invites (
  code text primary key default replace(gen_random_uuid()::text, '-', ''),
  course_id uuid not null references public.courses (id) on delete cascade,
  role public.course_role not null default 'viewer' check (role <> 'owner'),
  expires_at timestamptz not null default now() + interval '14 days',
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index course_invites_course_idx on public.course_invites (course_id);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 5000),
  position integer not null default 0,
  start_date date,
  due_date date,
  created_at timestamptz not null default now()
);
create index units_course_idx on public.units (course_id, position);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  kind public.item_kind not null default 'read',
  url text check (url ~* '^https?://'),
  notes text check (char_length(notes) <= 5000),
  est_minutes integer check (est_minutes >= 0),
  due_date date, -- null = inherits the unit's due date
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index items_unit_idx on public.items (unit_id, position);

create table public.item_progress (
  item_id uuid not null references public.items (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (item_id, user_id)
);
create index item_progress_user_idx on public.item_progress (user_id);

-- ---------------------------------------------------------------- helpers (security definer so policies don't recurse)

create function public.is_course_member(p_course uuid, p_min public.course_role default 'viewer')
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.course_members m
    where m.course_id = p_course and m.user_id = auth.uid() and m.role >= p_min
  );
$$;

create function public.unit_course_id(p_unit uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select course_id from public.units where id = p_unit;
$$;

create function public.item_course_id(p_item uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select u.course_id from public.items i join public.units u on u.id = i.unit_id where i.id = p_item;
$$;

create function public.shares_course_with(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.course_members a
    join public.course_members b on b.course_id = a.course_id
    where a.user_id = auth.uid() and b.user_id = p_user
  );
$$;

-- ---------------------------------------------------------------- triggers

create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, ''), '@', 1))
  );
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

create function public.handle_new_course()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.course_members (course_id, user_id, role) values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;
create trigger on_course_created
  after insert on public.courses for each row execute function public.handle_new_course();

create function public.protect_course_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.owner_id := old.owner_id;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;
create trigger on_course_update
  before update on public.courses for each row execute function public.protect_course_columns();

-- ---------------------------------------------------------------- row level security

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_members enable row level security;
alter table public.course_invites enable row level security;
alter table public.units enable row level security;
alter table public.items enable row level security;
alter table public.item_progress enable row level security;

create policy "profiles: read self or co-members" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_course_with(id));
create policy "profiles: update self" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "courses: members read" on public.courses for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_course_member(id));
create policy "courses: create own" on public.courses for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "courses: editors update" on public.courses for update to authenticated
  using (public.is_course_member(id, 'editor')) with check (public.is_course_member(id, 'editor'));
create policy "courses: owner deletes" on public.courses for delete to authenticated
  using (public.is_course_member(id, 'owner'));

-- memberships are only created by the course trigger and redeem_invite()
create policy "members: members read" on public.course_members for select to authenticated
  using (public.is_course_member(course_id));
create policy "members: owner changes roles" on public.course_members for update to authenticated
  using (public.is_course_member(course_id, 'owner') and role <> 'owner') with check (role <> 'owner');
create policy "members: owner removes / user leaves" on public.course_members for delete to authenticated
  using (role <> 'owner' and (user_id = (select auth.uid()) or public.is_course_member(course_id, 'owner')));

create policy "invites: owner manages" on public.course_invites for all to authenticated
  using (public.is_course_member(course_id, 'owner')) with check (public.is_course_member(course_id, 'owner'));

create policy "units: members read" on public.units for select to authenticated
  using (public.is_course_member(course_id));
create policy "units: editors insert" on public.units for insert to authenticated
  with check (public.is_course_member(course_id, 'editor'));
create policy "units: editors update" on public.units for update to authenticated
  using (public.is_course_member(course_id, 'editor')) with check (public.is_course_member(course_id, 'editor'));
create policy "units: editors delete" on public.units for delete to authenticated
  using (public.is_course_member(course_id, 'editor'));

create policy "items: members read" on public.items for select to authenticated
  using (public.is_course_member(public.unit_course_id(unit_id)));
create policy "items: editors insert" on public.items for insert to authenticated
  with check (public.is_course_member(public.unit_course_id(unit_id), 'editor'));
create policy "items: editors update" on public.items for update to authenticated
  using (public.is_course_member(public.unit_course_id(unit_id), 'editor'))
  with check (public.is_course_member(public.unit_course_id(unit_id), 'editor'));
create policy "items: editors delete" on public.items for delete to authenticated
  using (public.is_course_member(public.unit_course_id(unit_id), 'editor'));

create policy "progress: own read" on public.item_progress for select to authenticated
  using (user_id = (select auth.uid()));
create policy "progress: own insert" on public.item_progress for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_course_member(public.item_course_id(item_id)));
create policy "progress: own delete" on public.item_progress for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------- RPCs

create function public.invite_info(p_code text)
returns table (course_id uuid, course_title text, role public.course_role, expired boolean)
language sql stable security definer set search_path = '' as $$
  select c.id, c.title, i.role, i.expires_at < now()
  from public.course_invites i join public.courses c on c.id = i.course_id
  where i.code = p_code;
$$;

create function public.redeem_invite(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.course_invites;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not signed in';
  end if;
  select * into v_inv from public.course_invites where code = p_code;
  if not found or v_inv.expires_at < now() then
    raise exception 'This invite is invalid or has expired';
  end if;
  insert into public.course_members (course_id, user_id, role)
  values (v_inv.course_id, v_uid, v_inv.role)
  on conflict (course_id, user_id)
  do update set role = greatest(public.course_members.role, excluded.role);
  return v_inv.course_id;
end;
$$;

-- Atomic import of a validated course JSON (see src/lib/schema/course-json.ts).
-- Runs as the caller, so RLS applies. p_owner is only honoured for the service role (CLI import).
create function public.import_course(payload jsonb, p_owner uuid default null)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_owner uuid := coalesce(auth.uid(), p_owner);
  v_course uuid;
  v_unit uuid;
  u jsonb;
  u_pos bigint;
begin
  if v_owner is null then
    raise exception 'An owner is required';
  end if;

  insert into public.courses (owner_id, title, description, color, start_date, end_date)
  values (
    v_owner,
    payload ->> 'title',
    payload ->> 'description',
    coalesce(payload ->> 'color', '#4f46e5'),
    (payload ->> 'start_date')::date,
    (payload ->> 'end_date')::date
  )
  returning id into v_course;

  for u, u_pos in
    select value, ordinality - 1 from jsonb_array_elements(coalesce(payload -> 'units', '[]'::jsonb)) with ordinality
  loop
    insert into public.units (course_id, title, description, position, start_date, due_date)
    values (v_course, u ->> 'title', u ->> 'description', u_pos, (u ->> 'start_date')::date, (u ->> 'due_date')::date)
    returning id into v_unit;

    insert into public.items (unit_id, title, kind, url, notes, est_minutes, due_date, position)
    select
      v_unit,
      x.value ->> 'title',
      coalesce(x.value ->> 'kind', 'read')::public.item_kind,
      x.value ->> 'url',
      x.value ->> 'notes',
      (x.value ->> 'est_minutes')::integer,
      (x.value ->> 'due_date')::date,
      (x.ordinality - 1)::integer
    from jsonb_array_elements(coalesce(u -> 'items', '[]'::jsonb)) with ordinality as x(value, ordinality);
  end loop;

  return v_course;
end;
$$;

revoke execute on function public.invite_info(text) from public, anon;
revoke execute on function public.redeem_invite(text) from public, anon;
revoke execute on function public.import_course(jsonb, uuid) from public, anon;
grant execute on function public.invite_info(text) to authenticated;
grant execute on function public.redeem_invite(text) to authenticated;
grant execute on function public.import_course(jsonb, uuid) to authenticated, service_role;
