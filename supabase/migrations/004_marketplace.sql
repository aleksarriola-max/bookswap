-- Move Ctrl+Us from lending/gifting to a sale and book-exchange marketplace.
-- Run after 003_demo_preview.sql. Existing books remain listed as book exchanges.
begin;
alter function public.bookswap_action(text,jsonb) rename to bookswap_action_v3;
revoke all on function public.bookswap_action_v3(text,jsonb) from public,anon,authenticated;

create function public.bookswap_action(action text,args jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  actor uuid:=auth.uid(); result jsonb; payload jsonb; legacy_args jsonb; b public.books%rowtype; r public.requests%rowtype;
  new_id uuid:=gen_random_uuid(); ts bigint:=(extract(epoch from clock_timestamp())*1000)::bigint; n int;
begin
  if actor is null then raise exception 'Sign in first.'; end if;
  if action='addBook' then
    if coalesce(args->>'exchangeMode','') not in ('sale','exchange') then raise exception 'Choose sale or exchange.'; end if;
    if args->>'exchangeMode'='sale' and (coalesce(args->>'askPrice','') !~ '^([0-9]+)(\.[0-9]{1,2})?$' or (args->>'askPrice')::numeric<=0) then raise exception 'Enter a valid asking price.'; end if;
    if args->>'exchangeMode'='exchange' and length(trim(coalesce(args->>'exchangeWanted',''))) not between 1 and 200 then raise exception 'Say what you would like in exchange.'; end if;
    if jsonb_typeof(coalesce(args->'photoUrls','[]'))<>'array' or jsonb_array_length(coalesce(args->'photoUrls','[]'))>3 then raise exception 'Choose up to three additional photos.'; end if;
    if exists(select 1 from jsonb_array_elements_text(coalesce(args->'photoUrls','[]')) p where p.value not like 'https://%') then raise exception 'Book photos must use secure image URLs.'; end if;
    if jsonb_typeof(coalesce(args->'conditionChecks','{}'))<>'object' then raise exception 'Check the book condition details.'; end if;
    if coalesce(args->>'isbn','')<>'' and args->>'isbn' !~ '^[0-9]{10,13}$' then raise exception 'Enter a valid ISBN.'; end if;
    if coalesce(args->>'format','') not in ('','hardcover','softcover','ebook','other') then raise exception 'Choose a valid book format.'; end if;
    legacy_args:=args||jsonb_build_object('exchangeMode','gift','loanDays',14);
    result:=public.bookswap_action_v3('addBook',legacy_args);
    result:=result||jsonb_build_object('exchangeMode',args->>'exchangeMode','askPrice',case when args->>'exchangeMode'='sale' then (args->>'askPrice')::numeric else null end,
      'exchangeWanted',coalesce(args->>'exchangeWanted',''),'isbn',coalesce(args->>'isbn',''),'format',coalesce(args->>'format',''),
      'conditionChecks',coalesce(args->'conditionChecks','{}'::jsonb),'photoUrls',coalesce(args->'photoUrls','[]'::jsonb));
    update public.books set data=result where id=(result->>'id')::uuid;
    return result;
  elsif action='createRequest' then
    select * into b from public.books where id=(args->>'bookId')::uuid;
    if not found then raise exception 'Book no longer exists.'; end if;
    if coalesce(b.data->>'exchangeMode','exchange')='exchange' and length(trim(coalesce(args->>'requesterOffer',''))) not between 1 and 200 then raise exception 'Describe the book you can offer.'; end if;
    result:=public.bookswap_action_v3(action,args);
    result:=result||jsonb_build_object('exchangeMode',coalesce(b.data->>'exchangeMode','exchange'),'askPrice',b.data->'askPrice','requesterOffer',coalesce(args->>'requesterOffer',''));
    update public.requests set data=result where id=(result->>'id')::uuid;
    return result;
  elsif action='relistBook' then
    select * into b from public.books where id=(args->>'bookId')::uuid for update;
    if not found or b.data->>'status'<>'gone' or not exists(select 1 from public.requests where book_id=b.id and requester_id=actor and data->>'status'='done' and (data->>'completedAt')::bigint=(b.data->>'lastHandoffAt')::bigint) then raise exception 'Only the latest recipient can relist this book.'; end if;
    if args->>'lat' is null or args->>'lng' is null or (args->>'lat')::numeric not between -90 and 90 or (args->>'lng')::numeric not between -180 and 180 then raise exception 'Choose a valid neighborhood.'; end if;
    result:=b.data||jsonb_build_object('ownerId',actor,'ownerName',left(coalesce(nullif(trim(auth.jwt()->'user_metadata'->>'name'),''),'Reader'),60),'lat',round((args->>'lat')::numeric,2),'lng',round((args->>'lng')::numeric,2),'status','available','groupId',null,'createdAt',ts);
    update public.books set owner_id=actor,data=result where id=b.id; return result;
  elsif action='completeHandoff' then
    select * into r from public.requests where id=(args->>'requestId')::uuid;
    if found and r.data->>'exchangeMode'='sale' and (coalesce(args->>'agreedPrice','') !~ '^([0-9]+)(\.[0-9]{1,2})?$' or (args->>'agreedPrice')::numeric<=0) then raise exception 'Enter the agreed sale price.'; end if;
    result:=public.bookswap_action_v3(action,args);
    select * into r from public.requests where id=(args->>'requestId')::uuid;
    if found then
      if r.data->>'exchangeMode'='sale' then update public.requests set data=data||jsonb_build_object('agreedPrice',(args->>'agreedPrice')::numeric) where id=r.id; end if;
      select * into b from public.books where id=r.book_id for update;
      n:=jsonb_array_length(coalesce(b.data->'journey','[]'::jsonb));
      if n>0 then
        payload:=coalesce(b.data->'journey'->(n-1),'{}'::jsonb)||jsonb_build_object('transactionType',coalesce(r.data->>'exchangeMode','exchange'));
        if r.data->>'exchangeMode'='sale' then payload:=payload||jsonb_build_object('agreedPrice',(args->>'agreedPrice')::numeric); end if;
        update public.books set data=jsonb_set(data,array['journey',(n-1)::text],payload,true) where id=b.id;
      end if;
    end if;
    return result;
  elsif action='returnLoan' then
    raise exception 'Borrowing is not supported. Ctrl+Us listings are for sale or exchange.';
  end if;
  return public.bookswap_action_v3(action,args);
end;
$$;
revoke all on function public.bookswap_action(text,jsonb) from public,anon;
grant execute on function public.bookswap_action(text,jsonb) to authenticated;

-- Legacy gifts and loans become exchange listings without inventing prices.
update public.books set data=(data-'loanDays')||jsonb_build_object('exchangeMode','exchange','exchangeWanted',coalesce(nullif(data->>'exchangeWanted',''),'Open to book offers'))
where coalesce(data->>'exchangeMode','gift') in ('gift','loan') or not (data ? 'exchangeMode');
update public.requests set data=(data-'loanDays'-'dueAt'-'returnedAt')||jsonb_build_object('exchangeMode','exchange');
update public.requests set data=jsonb_set(data,'{status}','"done"') where data->>'status' in ('loaned','returned');
update public.books set data=jsonb_set(data,'{status}','"gone"') where data->>'status'='lent';

commit;
