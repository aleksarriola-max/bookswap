-- Run once in the Supabase SQL Editor for a new Ctrl+Us project.
-- Browser clients may read rows allowed by RLS. All writes use the checked RPC below.
begin;
create table public.books (
  id uuid primary key, owner_id uuid not null references auth.users(id), data jsonb not null
);
create table public.requests (
  id uuid primary key, book_id uuid not null references public.books(id) on delete cascade,
  owner_id uuid not null references auth.users(id), requester_id uuid not null references auth.users(id),
  data jsonb not null, unique(book_id, requester_id)
);
create table public.messages (
  id uuid primary key, request_id uuid not null references public.requests(id) on delete cascade,
  sender_id uuid not null references auth.users(id), data jsonb not null
);
create table public.wishlist (
  id uuid primary key, user_id uuid not null references auth.users(id), data jsonb not null
);
create index requests_owner on public.requests(owner_id);
create index requests_requester on public.requests(requester_id);
create index messages_request on public.messages(request_id);
create index wishlist_user on public.wishlist(user_id);
alter table public.books enable row level security;
alter table public.requests enable row level security;
alter table public.messages enable row level security;
alter table public.wishlist enable row level security;
create policy read_books on public.books for select to authenticated using (true);
create policy read_requests on public.requests for select to authenticated using (auth.uid() in (owner_id, requester_id));
create policy read_messages on public.messages for select to authenticated using (
  exists(select 1 from public.requests r where r.id = request_id and auth.uid() in (r.owner_id, r.requester_id))
);
create policy read_wishlist on public.wishlist for select to authenticated using (user_id = auth.uid());
revoke all on public.books, public.requests, public.messages, public.wishlist from anon, authenticated;
grant select on public.books, public.requests, public.messages, public.wishlist to authenticated;

create function public.bookswap_action(action text, args jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  new_id uuid := gen_random_uuid();
  now_ms bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  display_name text := left(coalesce(nullif(trim(auth.jwt()->'user_metadata'->>'name'), ''), 'Reader'), 60);
  b public.books%rowtype;
  r public.requests%rowtype;
  payload jsonb;
  result jsonb;
  next_status text;
begin
  if actor is null then raise exception 'Please sign in first.'; end if;
  if action in ('addBook', 'addWish') then
    if length(trim(coalesce(args->>'title', ''))) not between 1 and 200 then raise exception 'Enter a title of 1–200 characters.'; end if;
    if length(coalesce(args->>'author','')) > 200 then raise exception 'Author is too long.'; end if;
    if coalesce(args->>'genre', 'other') not in ('fiction','scifi','nonfiction','selfhelp','history','romance','mystery','kids','classics','other') then raise exception 'Invalid genre.'; end if;
  end if;
  if action = 'addBook' then
    if length(trim(coalesce(args->>'author',''))) = 0 then raise exception 'Enter an author.'; end if;
    if coalesce(args->>'condition','') not in ('Like new','Good','Worn') then raise exception 'Choose a book condition.'; end if;
    if length(coalesce(args->>'note','')) > 200 then raise exception 'Note is too long.'; end if;
    if args->>'lat' is null or args->>'lng' is null or (args->>'lat')::numeric not between -90 and 90 or (args->>'lng')::numeric not between -180 and 180 then raise exception 'Choose a valid neighborhood.'; end if;
    if coalesce(args->>'imageDataUrl','') <> '' and args->>'imageDataUrl' not like 'https://%' then raise exception 'Cover must use a secure image URL.'; end if;
    payload := jsonb_build_object('id',new_id,'title',trim(args->>'title'),'author',trim(args->>'author'),
      'genre',coalesce(args->>'genre','other'),'condition',args->>'condition','note',coalesce(args->>'note',''),
      'imageDataUrl',args->'imageDataUrl','ownerId',actor,'ownerName',display_name,
      'lat',round((args->>'lat')::numeric,2),'lng',round((args->>'lng')::numeric,2),'status','available','createdAt',now_ms);
    insert into public.books values(new_id,actor,payload); return payload;
  elsif action = 'addWish' then
    payload := jsonb_build_object('id',new_id,'title',trim(args->>'title'),'author',coalesce(args->>'author',''),
      'genre',coalesce(args->>'genre','other'),'userId',actor,'userName',display_name,'createdAt',now_ms);
    insert into public.wishlist values(new_id,actor,payload); return payload;
  elsif action = 'removeWish' then
    delete from public.wishlist where id = (args->>'wishId')::uuid and user_id = actor;
    if not found then raise exception 'Wishlist item not found.'; end if;
    return 'true'::jsonb;
  elsif action in ('createRequest','deleteBook','addStickyNote') then
    select * into b from public.books where id = (args->>'bookId')::uuid for update;
    if not found then raise exception 'Book no longer exists.'; end if;
    if action = 'deleteBook' then
      if b.owner_id <> actor then raise exception 'Only the owner can remove a book.'; end if;
      if exists(select 1 from public.requests where book_id=b.id and data->>'status' in ('pending','accepted')) then raise exception 'Finish or decline active requests before removing this book.'; end if;
      delete from public.books where id=b.id; return 'true'::jsonb;
    elsif action = 'createRequest' then
      if b.owner_id = actor then raise exception 'You cannot request your own book.'; end if;
      select data into result from public.requests where book_id=b.id and requester_id=actor;
      if found then return result; end if;
      if b.data->>'status'='gone' or exists(select 1 from public.requests where book_id=b.id and data->>'status'='accepted') then raise exception 'This book is no longer available for requests.'; end if;
      payload := jsonb_build_object('id',new_id,'bookId',b.id,'bookTitle',b.data->>'title',
        'requesterId',actor,'requesterName',display_name,'ownerId',b.owner_id,'status','pending','createdAt',now_ms);
      insert into public.requests values(new_id,b.id,b.owner_id,actor,payload);
      update public.books set data=jsonb_set(data,'{status}','"requested"') where id=b.id;
      return payload;
    else
      if b.owner_id <> actor and not exists(select 1 from public.requests where book_id=b.id and requester_id=actor and data->>'status'='done') then raise exception 'Only the owner or a recipient can leave a reader note.'; end if;
      if length(trim(coalesce(args->>'text',''))) not between 1 and 200 then raise exception 'Enter a note of 1–200 characters.'; end if;
      payload := jsonb_build_object('id',new_id,'userId',actor,'userName',display_name,'text',trim(args->>'text'),'ts',now_ms);
      update public.books set data=jsonb_set(data,'{stickyNotes}',coalesce(data->'stickyNotes','[]') || jsonb_build_array(payload)) where id=b.id;
      return payload;
    end if;
  elsif action in ('sendMessage','updateRequestStatus','setRequestAvailability','confirmSlot') then
    -- Lock book before request, consistently with createRequest/deleteBook.
    select * into b from public.books where id=(select book_id from public.requests where id=(args->>'requestId')::uuid) for update;
    select * into r from public.requests where id=(args->>'requestId')::uuid for update;
    if not found or actor not in (r.owner_id,r.requester_id) then raise exception 'Conversation not found.'; end if;
    if action = 'sendMessage' then
      if r.data->>'status' not in ('pending','accepted') then raise exception 'This exchange is closed.'; end if;
      if length(trim(coalesce(args->>'text',''))) not between 1 and 2000 then raise exception 'Enter a message of 1–2000 characters.'; end if;
      payload := jsonb_build_object('id',new_id,'requestId',r.id,'senderId',actor,'senderName',display_name,'text',trim(args->>'text'),'sentAt',now_ms);
      insert into public.messages values(new_id,r.id,actor,payload); return payload;
    elsif action = 'setRequestAvailability' then
      if actor<>r.requester_id or r.data->>'status'<>'accepted' or r.data ? 'confirmedSlot' then raise exception 'Availability cannot be changed now.'; end if;
      if jsonb_typeof(args->'slots') is distinct from 'array' or jsonb_array_length(args->'slots') not between 1 and 12 then raise exception 'Choose at least one time slot.'; end if;
      if exists(select 1 from jsonb_array_elements_text(args->'slots') s(value) where value not in ('mon_am','mon_pm','tue_am','tue_pm','wed_am','wed_pm','thu_am','thu_pm','fri_am','fri_pm','sat','sun')) then raise exception 'Invalid time slot.'; end if;
      update public.requests set data=jsonb_set(data,'{offeredSlots}',args->'slots') where id=r.id; return 'true'::jsonb;
    elsif action = 'confirmSlot' then
      if actor<>r.owner_id or r.data->>'status'<>'accepted' then raise exception 'Only the owner can confirm an accepted meetup.'; end if;
      if not coalesce((r.data->'offeredSlots') ? (args->>'slot'),false) then raise exception 'Choose an offered time slot.'; end if;
      if length(trim(coalesce(args->>'spot',''))) not between 1 and 200 then raise exception 'Choose a meetup spot.'; end if;
      update public.requests set data=data || jsonb_build_object('confirmedSlot',args->>'slot','confirmedSpot',args->>'spot') where id=r.id; return 'true'::jsonb;
    else
      if actor<>r.owner_id then raise exception 'Only the owner can change an exchange status.'; end if;
      next_status := args->>'status';
      if not ((r.data->>'status'='pending' and next_status in ('accepted','declined')) or (r.data->>'status'='accepted' and next_status in ('done','declined'))) then raise exception 'Invalid exchange status change.'; end if;
      if next_status='accepted' and exists(select 1 from public.requests where book_id=b.id and id<>r.id and data->>'status'='accepted') then raise exception 'Another exchange is already accepted.'; end if;
      if next_status='done' and not (r.data ? 'confirmedSlot' and r.data ? 'confirmedSpot') then raise exception 'Confirm a meetup before completing the exchange.'; end if;
      if length(coalesce(args->>'journeyNote','')) > 120 then raise exception 'Journey note is too long.'; end if;
      update public.requests set data=jsonb_set(data,'{status}',to_jsonb(next_status)) where id=r.id;
      if next_status='done' then
        payload := jsonb_build_object('userId',r.requester_id,'userName',r.data->>'requesterName','note',coalesce(args->>'journeyNote',''),'ts',now_ms);
        update public.books set data=jsonb_set(jsonb_set(data,'{status}','"gone"'),'{journey}',coalesce(data->'journey','[]') || jsonb_build_array(payload)) where id=b.id;
        update public.requests set data=jsonb_set(data,'{status}','"declined"') where book_id=b.id and id<>r.id and data->>'status'='pending';
      else
        update public.books set data=jsonb_set(data,'{status}',to_jsonb(case when exists(select 1 from public.requests where book_id=b.id and data->>'status' in ('pending','accepted')) then 'requested'::text else 'available'::text end)) where id=b.id;
      end if;
      return 'true'::jsonb;
    end if;
  end if;
  raise exception 'Unknown action.';
end;
$$;
revoke all on function public.bookswap_action(text,jsonb) from public, anon;
grant execute on function public.bookswap_action(text,jsonb) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('book-covers','book-covers',true,5242880,array['image/jpeg','image/png','image/webp']);
create policy upload_own_cover on storage.objects for insert to authenticated with check (
  bucket_id='book-covers' and (storage.foldername(name))[1]=auth.uid()::text
);
create policy remove_own_cover on storage.objects for delete to authenticated using (
  bucket_id='book-covers' and (storage.foldername(name))[1]=auth.uid()::text
);
alter publication supabase_realtime add table public.books, public.requests, public.messages, public.wishlist;
commit;
