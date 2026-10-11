-- Sample listings are for viewing, never real exchange requests.
begin;
alter function public.bookswap_action(text,jsonb) rename to bookswap_action_v2;
revoke all on function public.bookswap_action_v2(text,jsonb) from public,anon,authenticated;
create function public.bookswap_action(action text,args jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if action = 'createRequest' and exists (
    select 1 from public.books where id=(args->>'bookId')::uuid and data->>'isDemo'='true'
  ) then raise exception 'This is a demo listing. Fictional readers cannot receive requests.'; end if;
  return public.bookswap_action_v2(action,args);
end;
$$;
revoke all on function public.bookswap_action(text,jsonb) from public,anon;
grant execute on function public.bookswap_action(text,jsonb) to authenticated;
commit;
