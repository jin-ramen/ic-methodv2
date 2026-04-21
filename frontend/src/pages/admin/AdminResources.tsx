import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../utils/useApi';
import { createResource, updateResource, deactivateResource } from '../../utils/adminApi';
import type { Resource } from '../../types/admin';

export default function AdminResources() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const { data: resources, error } = useApi<Resource[]>(
    `/resources?include_inactive=true&_=${refreshKey}`
  );

  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <section className="flex-1 p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Resources</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-3 py-2 bg-black text-white rounded text-sm"
        >
          {showCreate ? 'Cancel' : '+ New resource'}
        </button>
      </div>

      {showCreate && (
        <CreateResourceForm
          onCreated={() => {
            refresh();
            setShowCreate(false);
          }}
        />
      )}

      {error && <p className="text-red-600">{error}</p>}
      {!resources ? (
        <p>Loading…</p>
      ) : (
        <div className="space-y-2">
          {resources.map((r) => (
            <ResourceRow key={r.id} resource={r} onChange={refresh} />
          ))}
        </div>
      )}
    </section>
  );
}

function CreateResourceForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [duration, setDuration] = useState(30);
  const [buffer, setBuffer] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    try {
      await createResource({
        name,
        duration_minutes: duration,
        buffer_minutes: buffer,
      });
      onCreated();
    } catch (e) {
      setErr((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-gray-200 rounded p-4 mb-4 space-y-3 bg-gray-50">
      <div>
        <label className="block text-xs text-gray-600 mb-1">Name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Duration (min)</label>
          <input
            type="number"
            min={1}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Buffer (min)</label>
          <input
            type="number"
            min={0}
            value={buffer}
            onChange={(e) => setBuffer(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          />
        </div>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="px-3 py-2 bg-black text-white rounded text-sm disabled:opacity-50"
      >
        {submitting ? 'Creating…' : 'Create resource'}
      </button>
    </form>
  );
}

function ResourceRow({ resource, onChange }: { resource: Resource; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(resource.name);
  const [duration, setDuration] = useState(resource.duration_minutes);
  const [buffer, setBuffer] = useState(resource.buffer_minutes);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateResource(resource.id, {
        name,
        duration_minutes: duration,
        buffer_minutes: buffer,
      });
      setEditing(false);
      onChange();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!confirm(`Deactivate "${resource.name}"? Existing bookings will be preserved.`)) return;
    try {
      await deactivateResource(resource.id);
      onChange();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  if (editing) {
    return (
      <div className="border border-gray-200 rounded p-4 space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded text-sm"
            placeholder="Duration"
          />
          <input
            type="number"
            value={buffer}
            onChange={(e) => setBuffer(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded text-sm"
            placeholder="Buffer"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1 bg-black text-white rounded text-sm"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`border border-gray-200 rounded p-4 flex items-center justify-between ${!resource.is_active ? 'opacity-50' : ''}`}>
      <div>
        <div className="font-medium">
          {resource.name}
          {!resource.is_active && <span className="ml-2 text-xs text-gray-500">(inactive)</span>}
        </div>
        <div className="text-xs text-gray-500">
          {resource.duration_minutes} min sessions · {resource.buffer_minutes} min buffer
        </div>
      </div>
      <div className="flex gap-2">
        <Link
          to={`/admin/resources/${resource.id}/rules`}
          className="text-sm text-blue-600 hover:underline"
        >
          Availability
        </Link>
        <button
          onClick={() => setEditing(true)}
          className="text-sm text-gray-700 hover:underline"
        >
          Edit
        </button>
        {resource.is_active && (
          <button
            onClick={handleDeactivate}
            className="text-sm text-red-600 hover:underline"
          >
            Deactivate
          </button>
        )}
      </div>
    </div>
  );
}