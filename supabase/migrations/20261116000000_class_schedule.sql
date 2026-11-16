-- Weekly class schedule ("meetings") per course, Canvas-style.
-- One row per weekday slot; a course can meet on several days, at different times.

create table public.course_meetings (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7), -- ISO: 1 = Monday … 7 = Sunday
  start_time time,
  end_time time,
  location text check (char_length(location) <= 300),
  created_at timestamptz not null default now(),
  check (start_time is null or end_time is null or end_time > start_time)
);
create index course_meetings_course_idx on public.course_meetings (course_id, weekday, start_time);

alter table public.course_meetings enable row level security;
grant select, insert, update, delete on public.course_meetings to authenticated;

create policy "meetings: members read" on public.course_meetings for select to authenticated
  using (public.is_course_member(course_id));
create policy "meetings: editors insert" on public.course_meetings for insert to authenticated
  with check (public.is_course_member(course_id, 'editor'));
create policy "meetings: editors update" on public.course_meetings for update to authenticated
  using (public.is_course_member(course_id, 'editor')) with check (public.is_course_member(course_id, 'editor'));
create policy "meetings: editors delete" on public.course_meetings for delete to authenticated
  using (public.is_course_member(course_id, 'editor'));

-- import_course now also reads payload.schedule: [{ "day": "mon", "start": "09:00", "end": "10:00", "location": "…" }]
create or replace function public.import_course(payload jsonb, p_owner uuid default null)
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

  insert into public.course_meetings (course_id, weekday, start_time, end_time, location)
  select
    v_course,
    array_position(array['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], m ->> 'day')::smallint,
    (m ->> 'start')::time,
    (m ->> 'end')::time,
    m ->> 'location'
  from jsonb_array_elements(coalesce(payload -> 'schedule', '[]'::jsonb)) as m;

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

revoke execute on function public.import_course(jsonb, uuid) from public, anon;
grant execute on function public.import_course(jsonb, uuid) to authenticated, service_role;
