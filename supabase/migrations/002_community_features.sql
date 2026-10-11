-- Additive migration for the existing school project. Run once after schema.sql.
begin;
create table public.groups (id uuid primary key, creator_id uuid references auth.users(id) not null, data jsonb not null);
create table public.group_members (group_id uuid references public.groups(id) on delete cascade, user_id uuid references auth.users(id), data jsonb not null, primary key(group_id,user_id));
create table public.blocks (user_id uuid references auth.users(id), target_id uuid references auth.users(id), data jsonb not null, primary key(user_id,target_id), check(user_id<>target_id));
create table public.reports (id uuid primary key, reporter_id uuid references auth.users(id) not null, book_id uuid references public.books(id) on delete set null, data jsonb not null);
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
create policy read_groups on public.groups for select to authenticated using(true);
create policy read_membership on public.group_members for select to authenticated using(user_id=auth.uid());
create policy read_blocks on public.blocks for select to authenticated using(user_id=auth.uid());
create policy read_reports on public.reports for select to authenticated using(reporter_id=auth.uid());
revoke all on public.groups,public.group_members,public.blocks,public.reports from anon,authenticated;
grant select on public.groups,public.group_members,public.blocks,public.reports to authenticated;
create function public.contact_blocked(other_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.blocks where (user_id=auth.uid() and target_id=other_id) or (target_id=auth.uid() and user_id=other_id));
$$;
revoke all on function public.contact_blocked(uuid) from public,anon;
grant execute on function public.contact_blocked(uuid) to authenticated;
drop policy read_books on public.books;
create policy read_books on public.books for select to authenticated using(
  owner_id=auth.uid() or (not public.contact_blocked(owner_id) and
    (data->>'groupId' is null or exists(select 1 from public.group_members where group_id=(books.data->>'groupId')::uuid and user_id=auth.uid())))
);
alter function public.bookswap_action(text,jsonb) rename to bookswap_action_v1;
revoke all on function public.bookswap_action_v1(text,jsonb) from public,anon,authenticated;
create function public.bookswap_action(action text,args jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor uuid:=auth.uid(); new_id uuid:=gen_random_uuid(); ts bigint:=(extract(epoch from clock_timestamp())*1000)::bigint;
  b public.books%rowtype; r public.requests%rowtype; result jsonb; payload jsonb; gid uuid; target uuid; item jsonb;
  display_name text:=left(coalesce(nullif(trim(auth.jwt()->'user_metadata'->>'name'),''),'Reader'),60);
begin
  if actor is null then raise exception 'Please sign in first.'; end if;
  if action='createGroup' then
    if length(trim(coalesce(args->>'name',''))) not between 3 and 80 then raise exception 'Group names need 3–80 characters.'; end if;
    payload:=jsonb_build_object('id',new_id,'name',trim(args->>'name'),'creatorId',actor,'createdAt',ts);
    insert into public.groups values(new_id,actor,payload);
    insert into public.group_members values(new_id,actor,jsonb_build_object('groupId',new_id,'userId',actor,'createdAt',ts)); return payload;
  elsif action in ('joinGroup','leaveGroup') then
    gid:=(args->>'groupId')::uuid;
    if not exists(select 1 from public.groups where id=gid) then raise exception 'Group not found.'; end if;
    if action='joinGroup' then insert into public.group_members values(gid,actor,jsonb_build_object('groupId',gid,'userId',actor,'createdAt',ts)) on conflict do nothing;
    else delete from public.group_members where group_id=gid and user_id=actor; end if;
    return 'true'::jsonb;
  elsif action in ('blockUser','unblockUser') then
    target:=(args->>'targetId')::uuid;
    if target=actor then raise exception 'You cannot block yourself.'; end if;
    if action='blockUser' then insert into public.blocks values(actor,target,jsonb_build_object('userId',actor,'targetId',target,'targetName',left(coalesce(args->>'targetName','Reader'),60),'createdAt',ts)) on conflict do nothing;
    else delete from public.blocks where user_id=actor and target_id=target; end if;
    return 'true'::jsonb;
  elsif action='reportBook' then
    select * into b from public.books where id=(args->>'bookId')::uuid;
    if not found or b.owner_id=actor then raise exception 'Listing not found or belongs to you.'; end if;
    if public.contact_blocked(b.owner_id) or (b.data->>'groupId' is not null and not exists(select 1 from public.group_members where group_id=(b.data->>'groupId')::uuid and user_id=actor)) then raise exception 'Listing is unavailable.'; end if;
    if coalesce(args->>'reason','') not in ('Misleading listing','Inappropriate content','Spam','Other') or length(coalesce(args->>'details',''))>500 then raise exception 'Choose a reason and keep details under 500 characters.'; end if;
    payload:=jsonb_build_object('id',new_id,'bookId',b.id,'bookTitle',b.data->>'title','reporterId',actor,'reason',args->>'reason','details',coalesce(args->>'details',''),'status','submitted','createdAt',ts);
    insert into public.reports values(new_id,actor,b.id,payload); return payload;
  elsif action='addBook' then
    if coalesce(args->>'exchangeMode','gift') not in ('gift','loan') then raise exception 'Choose gift or loan.'; end if;
    if args->>'exchangeMode'='loan' and ((args->>'loanDays') is null or (args->>'loanDays')::int not between 1 and 90) then raise exception 'Choose a loan length of 1–90 days.'; end if;
    gid:=nullif(args->>'groupId','')::uuid;
    if gid is not null and not exists(select 1 from public.group_members where group_id=gid and user_id=actor) then raise exception 'Join this group before posting.'; end if;
    if jsonb_typeof(coalesce(args->'bundleItems','[]'))<>'array' or jsonb_array_length(coalesce(args->'bundleItems','[]'))>10 then raise exception 'A bundle can contain up to 10 books.'; end if;
    for item in select value from jsonb_array_elements(coalesce(args->'bundleItems','[]')) loop
      if jsonb_typeof(item)<>'string' or length(trim(item#>>'{}')) not between 1 and 200 then raise exception 'Each bundle title needs 1–200 characters.'; end if;
    end loop;
    result:=public.bookswap_action_v1(action,args);
    result:=result||jsonb_build_object('exchangeMode',coalesce(args->>'exchangeMode','gift'),'loanDays',coalesce((args->>'loanDays')::int,14),'groupId',gid,'bundleItems',coalesce(args->'bundleItems','[]'));
    update public.books set data=result where id=(result->>'id')::uuid; return result;
  end if;
  if action in ('createRequest','relistBook') then
    select * into b from public.books where id=(args->>'bookId')::uuid for update;
    if not found then raise exception 'Book not found.'; end if;
    if action='relistBook' then
      if b.data->>'status'<>'gone' or not exists(select 1 from public.requests where book_id=b.id and requester_id=actor and data->>'status'='done' and coalesce(data->>'exchangeMode','gift')='gift' and (data->>'completedAt')::bigint=(b.data->>'lastHandoffAt')::bigint) then raise exception 'Only the latest recipient of a gift can pass it on.'; end if;
      if args->>'lat' is null or args->>'lng' is null or (args->>'lat')::numeric not between -90 and 90 or (args->>'lng')::numeric not between -180 and 180 then raise exception 'Choose a valid neighborhood.'; end if;
      payload:=b.data||jsonb_build_object('ownerId',actor,'ownerName',display_name,'lat',round((args->>'lat')::numeric,2),'lng',round((args->>'lng')::numeric,2),'status','available','groupId',null,'createdAt',ts);
      update public.books set owner_id=actor,data=payload where id=b.id; return payload;
    end if;
    if public.contact_blocked(b.owner_id) then raise exception 'Contact with this reader is blocked.'; end if;
    if b.data->>'groupId' is not null and not exists(select 1 from public.group_members where group_id=(b.data->>'groupId')::uuid and user_id=actor) then raise exception 'Join the group to request this listing.'; end if;
    if b.data->>'status' not in ('available','requested') then raise exception 'This book is unavailable.'; end if;
    select * into r from public.requests where book_id=b.id and requester_id=actor for update;
    if found and r.data->>'status'='returned' and b.data->>'exchangeMode'='loan' then
      if exists(select 1 from public.requests where book_id=b.id and data->>'status'='accepted') then raise exception 'Another exchange is already accepted.'; end if;
      result:=(r.data-'confirmedSlot'-'confirmedSpot'-'offeredSlots'-'completedAt'-'dueAt'-'returnedAt')||jsonb_build_object('status','pending','createdAt',ts);
      update public.books set data=jsonb_set(data,'{status}','"requested"') where id=b.id;
    else result:=public.bookswap_action_v1(action,args); end if;
    if result->>'status' in ('done','declined','returned') then raise exception 'You already have an exchange history for this listing.'; end if;
    result:=result||jsonb_build_object('exchangeMode',coalesce(b.data->>'exchangeMode','gift'),'loanDays',coalesce((b.data->>'loanDays')::int,14));
    update public.requests set data=result where id=(result->>'id')::uuid; return result;
  end if;
  if args ? 'requestId' then
    select * into b from public.books where id=(select book_id from public.requests where id=(args->>'requestId')::uuid) for update;
    select * into r from public.requests where id=(args->>'requestId')::uuid for update;
    if not found or actor not in (r.owner_id,r.requester_id) then raise exception 'Conversation not found.'; end if;
    if action<>'returnLoan' and not(action='updateRequestStatus' and args->>'status'='declined') and public.contact_blocked(case when actor=r.owner_id then r.requester_id else r.owner_id end) then raise exception 'Contact with this reader is blocked.'; end if;
    if action='mintHandoff' then
      if actor<>r.owner_id or r.data->>'status'<>'accepted' or not (r.data ? 'confirmedSlot') then raise exception 'Only the owner can create a code for a confirmed meetup.'; end if;
      if (r.data->>'handoffExpiresAt')::bigint>ts then return r.data; end if;
      payload:=r.data||jsonb_build_object('handoffCode',new_id,'handoffExpiresAt',ts+86400000);
      update public.requests set data=payload where id=r.id; return payload;
    elsif action='completeHandoff' then
      if actor<>r.requester_id or r.data->>'status'<>'accepted' or coalesce(args->>'code','')='' or args->>'code' is distinct from r.data->>'handoffCode' or coalesce((r.data->>'handoffExpiresAt')::bigint,0)<ts then raise exception 'This handoff code is invalid, expired, or belongs to another reader.'; end if;
      if length(coalesce(args->>'note',''))>120 or args->>'lat' is null or args->>'lng' is null or (args->>'lat')::numeric not between -90 and 90 or (args->>'lng')::numeric not between -180 and 180 then raise exception 'Enter a valid neighborhood and a note under 120 characters.'; end if;
      payload:=jsonb_build_object('userId',actor,'userName',r.data->>'requesterName','note',coalesce(args->>'note',''),'lat',round((args->>'lat')::numeric,2),'lng',round((args->>'lng')::numeric,2),'ts',ts);
      update public.books set data=data||jsonb_build_object('originLat',coalesce(data->'originLat',data->'lat'),'originLng',coalesce(data->'originLng',data->'lng'),'status',case when r.data->>'exchangeMode'='loan' then 'lent' else 'gone' end,'lastHandoffAt',ts,'handoffCount',coalesce((data->>'handoffCount')::int,0)+1,'journey',coalesce(data->'journey','[]')||jsonb_build_array(payload)) where id=b.id;
      update public.requests set data=(data-'handoffCode'-'handoffExpiresAt')||jsonb_build_object('status',case when data->>'exchangeMode'='loan' then 'loaned' else 'done' end,'completedAt',ts,'dueAt',case when data->>'exchangeMode'='loan' then ts+coalesce((data->>'loanDays')::bigint,14)*86400000 else null end) where id=r.id;
      update public.requests set data=jsonb_set(data,'{status}','"declined"') where book_id=b.id and id<>r.id and data->>'status'='pending'; return 'true'::jsonb;
    elsif action='returnLoan' then
      if actor<>r.owner_id or r.data->>'status'<>'loaned' then raise exception 'Only the lender can confirm a loan return.'; end if;
      update public.requests set data=data||jsonb_build_object('status','returned','returnedAt',ts) where id=r.id;
      update public.books set data=jsonb_set(data,'{status}','"available"') where id=b.id; return 'true'::jsonb;
    elsif action='updateRequestStatus' and args->>'status'='done' then raise exception 'The recipient must scan the handoff code to confirm receipt.';
    elsif action='sendMessage' and r.data->>'status'='loaned' then
      if length(trim(coalesce(args->>'text',''))) not between 1 and 2000 then raise exception 'Enter a message of 1–2000 characters.'; end if;
      payload:=jsonb_build_object('id',new_id,'requestId',r.id,'senderId',actor,'senderName',display_name,'text',trim(args->>'text'),'sentAt',ts);
      insert into public.messages values(new_id,r.id,actor,payload); return payload;
    end if;
  end if;
  if action='deleteBook' and exists(select 1 from public.requests where book_id=(args->>'bookId')::uuid and data->>'status'='loaned') then raise exception 'Confirm the loan return before removing this listing.'; end if;
  return public.bookswap_action_v1(action,args);
end;
$$;
revoke all on function public.bookswap_action(text,jsonb) from public,anon;
grant execute on function public.bookswap_action(text,jsonb) to authenticated;
alter publication supabase_realtime add table public.groups,public.group_members,public.blocks,public.reports;
commit;
