import { useState } from 'react';
import { BookOpen, HeartHandshake, Tags, Users } from 'lucide-react';
import { getBooks, canSeeBook, GENRES } from '../store';
import { monthlyHandoffs } from '../lib/community';
import { useStoreVersion } from '../lib/cloud';

export default function CommunityDashboard() {
  useStoreVersion();
  const [sampleView,setSampleView] = useState(false);
  const visible = getBooks().filter(canSeeBook);
  const real = visible.filter(book=>!book.isDemo);
  const samples = visible.filter(book=>book.isDemo);
  const cards = [
    {label:'Ready to share',value:real.filter(book=>book.status==='available').length,Icon:BookOpen,color:'bg-warm-100 text-warm-700'},
    {label:'Active listings',value:real.filter(book=>book.status==='available').length,Icon:Tags,color:'bg-blue-50 text-blue-700'},
    {label:'Completed handoffs',value:monthlyHandoffs(real),Icon:HeartHandshake,color:'bg-sage-100 text-sage-700'},
    {label:'Readers with listings',value:new Set(real.map(book=>book.ownerId)).size,Icon:Users,color:'bg-amber-50 text-amber-700'},
  ];
  const inventory = (sampleView ? samples : real).filter(book=>['available','requested'].includes(book.status));
  const genres = GENRES.map(genre=>({...genre,count:inventory.filter(book=>book.genre===genre.id).length})).filter(genre=>genre.count).sort((a,b)=>b.count-a.count);
  return <section className="space-y-4" aria-label="Community dashboard">
    <div className="rounded-3xl p-5 community-hero text-white"><p className="text-xs uppercase tracking-widest opacity-80">The reading circle</p><h2 className="text-2xl font-bold mt-2">More stories.<br />More neighbors.</h2><p className="text-sm mt-3 text-white/80">Every shared book starts a new connection.</p></div>
    <div className="grid grid-cols-2 gap-3">{cards.map(({label,value,Icon,color})=><div key={label} className="card p-4"><span className={`inline-flex p-2 rounded-xl ${color}`}><Icon className="w-5 h-5" aria-hidden="true" /></span><p className="text-3xl font-bold text-warm-900 mt-3 tabular-nums">{value}</p><p className="text-xs text-warm-600 mt-1">{label}</p></div>)}</div>
    <p className="text-xs text-warm-500">Real activity from listings you can access. Demo books are excluded.</p>
    {samples.length>0 && <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-3 text-xs text-blue-800"><strong>School preview</strong> · {samples.length} sample listings · {samples.filter(book=>book.exchangeMode==='exchange').length} exchange examples · {samples.filter(book=>book.bundleItems?.length).length} bundles</div>}
    <div className="card p-4 space-y-3"><div className="flex justify-between items-center gap-2"><h3 className="text-sm font-bold text-warm-800">On the bookshelf</h3>{samples.length>0 && <button className="btn-ghost text-xs" aria-pressed={sampleView} onClick={()=>setSampleView(!sampleView)}>{sampleView ? 'Show real books' : 'Show demo mix'}</button>}</div><p className="text-xs text-warm-500">{sampleView ? 'Sample genre mix · fictional listings' : 'Genre mix · real listings'} · {inventory.length} listings</p>
      {genres.length ? <ul className="space-y-3">{genres.map(genre=><li key={genre.id}><div className="flex justify-between text-xs text-warm-700 mb-1"><span>{genre.emoji} {genre.label}</span><span>{genre.count}</span></div><div className="h-2 bg-warm-50 rounded-full overflow-hidden" role="img" aria-label={`${genre.label}: ${genre.count} of ${inventory.length} listings`}><div className={`h-full rounded-full ${sampleView ? 'bg-blue-400' : 'bg-warm-500'}`} style={{width:`${genre.count/inventory.length*100}%`}} /></div></li>)}</ul> : <p className="text-sm text-warm-600 py-3">Your community’s shelf is just getting started. Share a book to add its genre here.</p>}
    </div>
  </section>;
}
