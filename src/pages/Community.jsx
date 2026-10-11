import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getGroups, getJoinedGroups, getBlocks, getReports, communityAction } from '../store';
import { useStoreVersion, runAction } from '../lib/cloud';
import CommunityChallenge from '../components/CommunityChallenge';

export default function Community() {
  useStoreVersion();
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const joined = getJoinedGroups();
  const act = async (action, args) => { setBusy(true); const saved = await runAction(() => communityAction(action, args)); setBusy(false); return saved; };
  return <div className="h-full overflow-y-auto p-4 space-y-4">
    <Link to="/" className="text-sm text-warm-600">← Browse</Link>
    <h1 className="text-xl font-bold text-warm-800">Your community 🌱</h1>
    <CommunityChallenge />
    <section className="card p-4 space-y-3">
      <h2 className="font-bold text-warm-800">Campus & dorm groups</h2>
      <p className="text-xs text-warm-500">Open groups: anyone with an account can join. Group listings appear to members.</p>
      <input className="input" aria-label="Find groups" placeholder="Find your campus or dorm" value={search} onChange={e => setSearch(e.target.value)} />
      {getGroups().filter(group => group.name.toLowerCase().includes(search.toLowerCase())).map(group => {
        const member = joined.some(item => item.id === group.id);
        return <div className="flex items-center gap-2 border-b border-warm-100 pb-2" key={group.id}>
          <span className="text-sm flex-1 text-warm-700">{group.name}</span>
          <button className="btn-secondary text-xs" disabled={busy} onClick={() => act(member ? 'leaveGroup' : 'joinGroup', { groupId: group.id })}>{member ? 'Leave' : 'Join'}</button>
        </div>;
      })}
      <form className="flex gap-2" onSubmit={async e => { e.preventDefault(); if (await act('createGroup', { name })) setName(''); }}>
        <input className="input min-w-0" aria-label="New group name" placeholder="Create a campus group" minLength={3} maxLength={80} required value={name} onChange={e => setName(e.target.value)} />
        <button disabled={busy} className="btn-primary text-xs">Create</button>
      </form>
    </section>
    {joined.map(group => <CommunityChallenge key={group.id} groupId={group.id} />)}
    <section className="card p-4 space-y-2">
      <h2 className="font-bold text-warm-800">Blocked readers</h2>
      {!getBlocks().length && <p className="text-xs text-warm-500">No blocked readers.</p>}
      {getBlocks().map(block => <div key={block.targetId} className="flex items-center justify-between gap-2 text-sm"><span>{block.targetName || 'Reader'}</span><button disabled={busy} className="btn-secondary text-xs" onClick={() => act('unblockUser', { targetId: block.targetId })}>Unblock</button></div>)}
    </section>
    <section className="card p-4 space-y-2">
      <h2 className="font-bold text-warm-800">Your reports</h2>
      <p className="text-xs text-warm-500">Reports are saved for the project administrator to review. Submitting one does not automatically remove a listing.</p>
      {getReports().map(report => <p className="text-xs text-warm-700" key={report.id}>{report.bookTitle}: {report.reason} · {report.status}</p>)}
    </section>
  </div>;
}
