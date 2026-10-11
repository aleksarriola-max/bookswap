import { getBooks, canSeeBook } from '../store';
import { monthlyHandoffs } from '../lib/community';
import { useStoreVersion } from '../lib/cloud';

export default function CommunityChallenge({ groupId = '' }) {
  useStoreVersion();
  const books = getBooks().filter(book => canSeeBook(book) && (!groupId || book.groupId === groupId));
  const count = monthlyHandoffs(books.filter(book => !book.isDemo));
  const samples = monthlyHandoffs(books.filter(book => book.isDemo));
  const target = 50;
  return <section className="card p-3 space-y-2" aria-label="Community challenge">
    <h2 className="text-sm font-bold text-warm-800">🌱 {groupId ? 'Group' : 'Community'} reading challenge</h2>
    <p className="text-xs text-warm-600">Share 50 books this month · {count}/{target} verified handoffs</p>
    <progress className="challenge-progress w-full" max={target} value={Math.min(count, target)} aria-label="Monthly handoff progress" />
    <p className="text-xs text-sage-700">{Math.max(0,target-count)} more books to reach this month’s goal.</p>
    {samples > 0 && <p className="text-xs text-gray-500">{samples} sample journey stops shown separately for the demo.</p>}
    {count >= target && <p className="text-xs font-bold text-sage-700">Goal reached! Every handoff keeps the story going.</p>}
  </section>;
}
