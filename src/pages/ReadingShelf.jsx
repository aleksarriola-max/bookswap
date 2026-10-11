import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStoreVersion, runAction } from '../lib/cloud';
import { getPersonal, saveReading, removeReading } from '../lib/personal';
import { getBooks, canSeeBook, GENRES } from '../store';
import BookCard from '../components/BookCard';

const blank={title:'',author:'',genre:'fiction',status:'want',pages:0,total:0,note:''};
const labels={want:'Want to read',reading:'Reading',finished:'Finished'};
export default function ReadingShelf({user}) {
  useStoreVersion();
  const [tab,setTab]=useState('reading');
  const [form,setForm]=useState(blank);
  const [editing,setEditing]=useState(false);
  const data=getPersonal(user.id);
  const favorites=getBooks().filter(book=>data.favorites.includes(book.id) && canSeeBook(book));
  const change=(key,value)=>setForm({...form,[key]:value});
  return <div className="h-full overflow-y-auto p-4 space-y-4">
    <Link to="/my-books" className="text-sm text-warm-600">← My Books</Link>
    <div className="community-hero rounded-3xl p-5 text-white"><h1 className="text-2xl font-bold">Your reading life</h1><p className="text-sm text-white/80 mt-2">Save discoveries. Track your next chapter.</p><p className="text-xs mt-4">{data.reading.filter(book=>book.status==='finished').length} finished · {data.reading.filter(book=>book.status==='reading').length} in progress · {data.favorites.length} favorites</p></div>
    <p className="text-xs text-warm-500">Personal shelf and favorites are saved in this browser for your account. They do not sync across devices.</p>
    <div className="flex gap-2">{['reading','favorites'].map(value=><button key={value} className={tab===value?'btn-primary flex-1 text-sm':'btn-secondary flex-1 text-sm'} aria-pressed={tab===value} onClick={()=>setTab(value)}>{value==='reading'?'Reading tracker':'Favorites'}</button>)}</div>
    {tab==='favorites' ? <><p className="text-xs text-warm-500">Only listings you can still access appear here.</p>{favorites.length ? <div className="grid grid-cols-2 gap-3">{favorites.map(book=><BookCard key={book.id} book={book} layout="grid" />)}</div> : <div className="card p-6 text-center text-warm-600">Open a book and tap Save to favorites to start your collection.</div>}</> : <>
      <button className="btn-secondary w-full" onClick={()=>{setForm(blank);setEditing(true);}}>+ Add a book to my tracker</button>
      {editing && <form className="card p-4 space-y-3" onSubmit={async e=>{e.preventDefault();const saved=await runAction(()=>{saveReading(user.id,form);return true;});if(saved){setEditing(false);setForm(blank);}}}><h2 className="font-bold text-warm-800">{form.id?'Update your progress':'Add a read'}</h2>
        <label className="block text-xs text-warm-700">Title<input className="input mt-1" required maxLength={160} value={form.title} onChange={e=>change('title',e.target.value)} /></label>
        <label className="block text-xs text-warm-700">Author<input className="input mt-1" maxLength={100} value={form.author} onChange={e=>change('author',e.target.value)} /></label>
        <div className="flex gap-2"><label className="flex-1 text-xs text-warm-700">Genre<select className="input mt-1" value={form.genre} onChange={e=>change('genre',e.target.value)}>{GENRES.map(genre=><option key={genre.id} value={genre.id}>{genre.label}</option>)}</select></label><label className="flex-1 text-xs text-warm-700">Status<select className="input mt-1" value={form.status} onChange={e=>change('status',e.target.value)}>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div>
        <div className="flex gap-2">{[['pages','Pages read'],['total','Total pages (optional)']].map(([key,label])=><label key={key} className="flex-1 text-xs text-warm-700">{label}<input className="input mt-1" type="number" min="0" max="100000" value={form[key]} onChange={e=>change(key,e.target.value)} /></label>)}</div>
        <label className="block text-xs text-warm-700">Private reading note<textarea className="input mt-1" maxLength={500} value={form.note} onChange={e=>change('note',e.target.value)} /></label>
        <div className="flex gap-2"><button type="button" className="btn-secondary flex-1" onClick={()=>setEditing(false)}>Cancel</button><button className="btn-primary flex-1">Save progress</button></div>
      </form>}
      {!data.reading.length && !editing && <div className="card p-6 text-center text-warm-600">Start with the book on your nightstand. You can track any book, even one outside Ctrl+Us.</div>}
      {Object.entries(labels).map(([status,label])=>{const items=data.reading.filter(book=>book.status===status);return items.length>0 && <section key={status} className="space-y-2"><h2 className="font-bold text-warm-800">{label} · {items.length}</h2>{items.map(book=><article className="card p-4 space-y-2" key={book.id}><h3 className="font-bold text-warm-900">{book.title}</h3><p className="text-xs text-warm-500">{book.author}</p>{book.total>0 && <><progress className="challenge-progress w-full" max={book.total} value={book.pages} aria-label={`${book.title} reading progress`} /><p className="text-xs text-warm-600">{book.pages}/{book.total} pages · {Math.round(book.pages/book.total*100)}%</p></>}{book.note && <p className="text-sm text-warm-600 whitespace-pre-wrap">{book.note}</p>}<div className="flex gap-2"><button className="btn-secondary text-xs" onClick={()=>{setForm(book);setEditing(true);}}>Edit progress</button><button className="btn-ghost text-xs" onClick={()=>{if(window.confirm('Remove this book from your personal tracker?')) runAction(()=>removeReading(user.id,book.id));}}>Remove</button></div></article>)}</section>;})}
    </>}
  </div>;
}
