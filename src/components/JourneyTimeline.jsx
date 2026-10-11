export default function JourneyTimeline({ book }) {
  const stops = [...(book.journey || [])].sort((a,b)=>a.ts-b.ts);
  const firstTs = stops.length ? Math.min(book.createdAt,stops[0].ts) : book.createdAt;
  const entries = [{userName:'First bookshelf',note:'The story started here.',ts:firstTs},...stops];
  return <section className="card p-5 space-y-4" aria-label="Book journey timeline">
    <div className="flex justify-between gap-2 items-center"><h3 className="font-bold text-warm-800">A story passed along</h3><span className="badge bg-sage-100 text-sage-700">{stops.length} {book.isDemo ? 'sample stops' : 'handoffs'}</span></div>
    <ol className="journey-timeline space-y-4">
      {entries.map((entry,i)=><li key={`${entry.ts}-${i}`} className="relative pl-10">
        <span className={`journey-stop ${i===entries.length-1 ? 'bg-sage-600' : 'bg-warm-600'}`}>{i+1}</span>
        <div className="rounded-2xl bg-warm-50 p-3"><div className="flex justify-between gap-2 flex-wrap"><p className="text-sm font-semibold text-warm-800">{entry.userName}</p><time className="text-xs text-warm-500" dateTime={new Date(entry.ts).toISOString()}>{new Date(entry.ts).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</time></div><p className="text-sm text-warm-600 mt-1">{entry.note || 'Passed on to another reader.'}</p>{i===entries.length-1 && <p className="text-xs text-sage-700 font-semibold mt-2">Latest stop</p>}</div>
      </li>)}
    </ol>
    {book.isDemo && <p className="text-xs text-blue-700">Illustrative history from fictional readers.</p>}
  </section>;
}
