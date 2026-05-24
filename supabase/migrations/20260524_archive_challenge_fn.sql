-- Fix: soft-delete blocked by SELECT RLS policy
--
-- PostgreSQL 17 applies SELECT policies' USING expressions as WITH CHECK
-- constraints on new row values during UPDATE. The SELECT policy
-- `archived_at IS NULL` therefore rejects the UPDATE that sets archived_at,
-- even though the admin UPDATE policy passes.
--
-- Solution: a SECURITY DEFINER function that bypasses RLS while still
-- enforcing the admin check via has_role(). The client calls
-- supabase.rpc('archive_challenge', { id }) instead of a direct PATCH.

create or replace function public.archive_challenge(_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'permission denied: admin role required'
      using errcode = 'insufficient_privilege';
  end if;

  update public.challenges
  set archived_at = now()
  where id = _id;

  if not found then
    raise exception 'challenge not found'
      using errcode = 'no_data_found';
  end if;
end;
$$;

-- Only authenticated users may call this; anon cannot
revoke execute on function public.archive_challenge(uuid) from public, anon;
grant execute on function public.archive_challenge(uuid) to authenticated;
