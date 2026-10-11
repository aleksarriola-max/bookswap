import { getBooks, canSeeBook } from '../store';
import { monthlyHandoffs } from '../lib/community';
import { useStoreVersion } from '../lib/cloud';

export default function CommunityChallenge({ groupId = '' }) {
  useStoreVersion();
  const count = monthlyHandoffs(getBooks().filter(book => canSeeBook(book) && (!groupId || book.groupId === groupId)));
  const target = 50;
  return <section className="card p-3 space-y-2" aria-label="Community challenge">
    <h2 className="text-sm font-bold text-warm-800">🌱 {groupId ? 'Group' : 'Community'} reading challenge</h2>
    <p className="text-xs text-warm-600">Share 50 books this month · {count}/{target} verified handoffs</p>
    <progress className="w-full accent-green-700" max={target} value={Math.min(count, target)} aria-label="Monthly handoff progress" />
    {count >= target && <p className="text-xs font-bold text-sage-700">Goal reached! Every handoff keeps the story going.</p>}
  </section>;
}
