import { useState } from 'react';
import { Link } from 'react-router-dom';
import { recordComparison } from '../lib/trackedActions';
import { hasTracked, isAnalyticsActive } from '../lib/analytics';

const TASKS = [
  ['listing', 'Listing a book'],
  ['discovery', 'Finding a book to request'],
];
const COMPARISONS = [
  ['less_effort', 'Less effort'],
  ['same_effort', 'About the same effort'],
  ['more_effort', 'More effort'],
];

// Fixed-choice study question. No free text is collected.
export default function StudyFeedback() {
  const [task, setTask] = useState('');
  const [comparison, setComparison] = useState('');
  const [sent, setSent] = useState(() => TASKS.filter(([value]) => hasTracked(`comparison_submitted:${value}`)).map(([value]) => value));
  const active = isAnalyticsActive();
  const alreadySent = sent.includes(task);

  const submit = event => {
    event.preventDefault();
    if (!task || !comparison || alreadySent) return;
    if (recordComparison(task, comparison)) { setSent(previous => [...previous, task]); setTask(''); setComparison(''); }
  };

  return <div className="h-full overflow-y-auto p-5 space-y-4">
    <Link to="/" className="text-sm text-warm-600">← Browse</Link>
    <h1 className="text-xl font-bold text-warm-800">Study feedback</h1>
    <p className="text-sm text-warm-600">Compared with how you usually buy, sell, or swap books, how much effort did this task take in Ctrl+Us?</p>
    {!active && <p role="status" className="card p-3 text-sm text-warm-600">Feedback is only recorded for signed-in accounts on the shared app. Nothing will be saved in this session.</p>}
    <form className="card p-4 space-y-4" onSubmit={submit}>
      <fieldset className="space-y-2"><legend className="text-sm font-semibold text-warm-700 mb-1">Task</legend>
        {TASKS.map(([value, label]) => <label key={value} className="flex items-center gap-2 text-sm text-warm-700"><input type="radio" name="task" value={value} checked={task === value} onChange={() => setTask(value)} />{label}{sent.includes(value) && <span className="text-xs text-sage-700">· sent</span>}</label>)}
      </fieldset>
      <fieldset className="space-y-2"><legend className="text-sm font-semibold text-warm-700 mb-1">Compared with your usual way</legend>
        {COMPARISONS.map(([value, label]) => <label key={value} className="flex items-center gap-2 text-sm text-warm-700"><input type="radio" name="comparison" value={value} checked={comparison === value} onChange={() => setComparison(value)} />{label}</label>)}
      </fieldset>
      {alreadySent && <p role="status" className="text-xs text-warm-600">You already answered for this task. Thank you!</p>}
      <button className="btn-primary w-full" disabled={!active || !task || !comparison || alreadySent}>Submit</button>
    </form>
    {sent.length > 0 && <p role="status" className="text-sm text-sage-700">Thanks — your answer was recorded.</p>}
  </div>;
}
