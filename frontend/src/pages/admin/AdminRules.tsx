import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApi } from '../../utils/useApi';
import { createRule, deleteRule } from '../../utils/adminApi';
import type { AvailabilityRule, Resource } from '../../types/admin';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function AdminRules() {
  const { resourceId } = useParams<{ resourceId: string }>();
  const [refreshKey, setRefreshKey] = useState(0);
  const [dow, setDow] = useState(0);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [err, setErr] = useState<string | null>(null);

  const { data: resource } = useApi<Resource>(
    resourceId ? `/resources/${resourceId}` : null
  );
  const { data: rules } = useApi<AvailabilityRule[]>(
    resourceId ? `/resources/${resourceId}/availability-rules?_=${refreshKey}` : null
  );

  const refresh = () => setRefreshKey((k) => k + 1);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await createRule(resourceId!, {
        day_of_week: dow,
        start_time: `${startTime}:00`,
        end_time: `${endTime}:00`,
      });
      refresh();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this rule?')) return;
    try {
      await deleteRule(id);
      refresh();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <section className="flex-1 p-8 max-w-2xl">
      <Link to="/admin/resources" className="text-sm text-gray-500 hover:underline">
        ← Resources
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-6">
        Availability · {resource?.name ?? '…'}
      </h1>

      <form onSubmit={handleCreate} className="border border-gray-200 rounded p-4 mb-6 bg-gray-50">
        <h2 className="text-sm font-medium mb-3">Add a weekly rule</h2>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Day</label>
            <select
              value={dow}
              onChange={(e) => setDow(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            >
              {DAYS.map((d, i) => (
                <option key={i} value={i}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Start</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">End</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            />
          </div>
        </div>
        {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
        <button
          type="submit"
          className="mt-3 px-3 py-2 bg-black text-white rounded text-sm"
        >
          Add rule
        </button>
      </form>

      {!rules ? (
        <p>Loading…</p>
      ) : rules.length === 0 ? (
        <p className="text-gray-500 text-sm">No rules yet. Add one above.</p>
      ) : (
        <div className="space-y-2">
          {rules.map((r) => (
            <div
              key={r.id}
              className="border border-gray-200 rounded px-4 py-3 flex items-center justify-between"
            >
              <div>
                <span className="font-medium">{DAYS[r.day_of_week]}</span>
                <span className="text-gray-600 ml-3">
                  {r.start_time.slice(0, 5)} – {r.end_time.slice(0, 5)}
                </span>
              </div>
              <button
                onClick={() => handleDelete(r.id)}
                className="text-sm text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}