-- Lets signed-in admins (emails listed in public.admins) read and delete
-- Advika's RSVPs from the admin dashboard. Guests are unaffected: the anon
-- role can still only insert. Touches no other table's data.

create or replace function public.is_advika_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_advika_admin() from public;
grant execute on function public.is_advika_admin() to authenticated;

grant select, delete on public.advika_rsvps to authenticated;

drop policy if exists "advika admins can read" on public.advika_rsvps;
create policy "advika admins can read" on public.advika_rsvps
  for select to authenticated using (public.is_advika_admin());

drop policy if exists "advika admins can delete" on public.advika_rsvps;
create policy "advika admins can delete" on public.advika_rsvps
  for delete to authenticated using (public.is_advika_admin());
