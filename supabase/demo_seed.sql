-- Run as database administrator after migration 003. Safe to run again.
-- Fictional users have no email, password or login identity.
begin;
do $$
declare
  anchor jsonb; lat double precision; lng double precision;
  names text[]:=array['Maya (demo)','Jordan (demo)','Sam (demo)','Riley (demo)','Alex (demo)','Taylor (demo)'];
  titles jsonb:= '[
    ["The Midnight Library","Matt Haig","fiction","9780525559474"],
    ["Atomic Habits","James Clear","selfhelp","9780735211292"],
    ["Dune","Frank Herbert","scifi","9780441172719"],
    ["Pride and Prejudice","Jane Austen","classics","9780141439518"],
    ["The Thursday Murder Club","Richard Osman","mystery","9781984880987"],
    ["The Hobbit","J. R. R. Tolkien","fiction","9780547928227"],
    ["Educated","Tara Westover","nonfiction","9780399590504"],
    ["The Very Hungry Caterpillar","Eric Carle","kids","9780399226908"],
    ["The Martian","Andy Weir","scifi","9780553418026"],
    ["Little Women","Louisa May Alcott","classics","9780147514011"],
    ["Sapiens","Yuval Noah Harari","history","9780062316097"],
    ["Beach Read","Emily Henry","romance","9781984806734"],
    ["The Silent Patient","Alex Michaelides","mystery","9781250301697"],
    ["Charlotte’s Web","E. B. White","kids","9780064400558"],
    ["The Alchemist","Paulo Coelho","fiction","9780061122415"],
    ["The Psychology of Money","Morgan Housel","nonfiction","9780857197689"],
    ["A Brief History of Time","Stephen Hawking","nonfiction","9780553380163"],
    ["1984","George Orwell","classics","9780451524935"],
    ["The Love Hypothesis","Ali Hazelwood","romance","9780593336823"],
    ["Deep Work","Cal Newport","selfhelp","9781455586691"],
    ["The Book Thief","Markus Zusak","fiction","9780375842207"],
    ["Good Omens","Terry Pratchett & Neil Gaiman","fiction","9780060853983"],
    ["A Wrinkle in Time","Madeleine L’Engle","kids","9780312367541"],
    ["The Design of Everyday Things","Don Norman","other","9780465050659"]
  ]'::jsonb;
  i integer; owner uuid; bid uuid; item jsonb; payload jsonb; ts bigint;
  offsets double precision[]:=array[0.002,-0.003,0.006,-0.008,0.012,-0.015,0.02,-0.025];
begin
  select data into anchor from public.books where data->>'isDemo' is distinct from 'true'
    and data->>'lat' is not null and data->>'lng' is not null
    order by (data->>'title'='Ctrl+Us test listing') desc limit 1;
  if anchor is null then raise exception 'Post a real listing first so samples can use your neighborhood.'; end if;
  lat:=(anchor->>'lat')::double precision; lng:=(anchor->>'lng')::double precision;
  ts:=(extract(epoch from clock_timestamp())*1000)::bigint;
  for i in 1..6 loop
    owner:=('de000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;
    insert into auth.users(id) values(owner) on conflict(id) do nothing;
  end loop;
  for i in 1..24 loop
    item:=titles->(i-1);
    owner:=('de000000-0000-4000-8000-'||lpad((((i-1)%6)+1)::text,12,'0'))::uuid;
    bid:=('db000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;
    payload:=jsonb_build_object('id',bid,'ownerId',owner,'ownerName',names[((i-1)%6)+1],
      'title',item->>0,'author',item->>1,'genre',item->>2,
      'imageDataUrl','https://covers.openlibrary.org/b/isbn/'||(item->>3)||'-M.jpg?default=false',
      'condition',(array['Like new','Good','Worn'])[((i-1)%3)+1],
      'status',case when i in (5,13) then 'requested' else 'available' end,
      'exchangeMode',case when i%4=0 then 'loan' else 'gift' end,'loanDays',case when i%8=0 then 7 else 14 end,
      'lat',lat+offsets[((i-1)%8)+1],'lng',lng+offsets[((i+2)%8)+1],
      'originLat',lat,'originLng',lng,'createdAt',ts-i*3600000::bigint,
      'isDemo',true,'demoSeed','ctrl-us-v1',
      'note',(array['Loved this one—ready for another reader.','A few pencil notes, plenty of story left.','Perfect for a weekend read.','Please return after enjoying it.'])[((i-1)%4)+1],
      'bundleItems',case when i=6 then jsonb_build_array('The Hobbit','The Fellowship of the Ring','The Two Towers') when i=8 then jsonb_build_array('The Very Hungry Caterpillar','Brown Bear, Brown Bear, What Do You See?') else '[]'::jsonb end,
      'journey',case when i%3=0 then jsonb_build_array(
        jsonb_build_object('userName','Casey (demo)','note','Sample stop: a rainy-day favorite.','ts',ts-172800000,'lat',lat+0.01,'lng',lng-0.01),
        jsonb_build_object('userName',names[((i-1)%6)+1],'note','Sample stop: sharing the story again.','ts',ts-86400000,'lat',lat+offsets[((i-1)%8)+1],'lng',lng+offsets[((i+2)%8)+1])) else '[]'::jsonb end,
      'stickyNotes',case when i%3=0 then jsonb_build_array(jsonb_build_object('id','demo-note-'||i,'text','Sample reader note: the ending stayed with me.','ts',ts-86400000)) else '[]'::jsonb end);
    insert into public.books(id,owner_id,data) values(bid,owner,payload) on conflict(id) do nothing;
  end loop;
end $$;
commit;
select count(*) as demo_books, count(*) filter(where data->>'exchangeMode'='loan') as sample_loans,
  count(*) filter(where jsonb_array_length(data->'bundleItems')>0) as sample_bundles
from public.books where data->>'demoSeed'='ctrl-us-v1';
