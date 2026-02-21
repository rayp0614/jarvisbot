import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Play, Pause, Plus, Pencil, Trash2, X, CheckCircle, XCircle, History } from 'lucide-react';
import { apiFetch, apiPut, apiPost, apiDelete } from '../lib/api';
import { useState } from 'react';

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function ExecutionHistory({ executions, isLoading }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!executions || executions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <History size={32} className="mx-auto mb-2 text-gray-300" />
        <p>No executions yet</p>
        <p className="text-sm">Cron history will appear here after jobs run</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-sm text-gray-500 border-b">
            <th className="pb-2 font-medium">Cron</th>
            <th className="pb-2 font-medium">Status</th>
            <th className="pb-2 font-medium">Duration</th>
            <th className="pb-2 font-medium">Time</th>
            <th className="pb-2 font-medium">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {executions.map((exec) => (
            <tr key={exec.id} className="text-sm">
              <td className="py-3">
                <span className="font-medium text-gray-900">{exec.name}</span>
                <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                  exec.type === 'command' ? 'bg-green-100 text-green-700' :
                  exec.type === 'http' ? 'bg-purple-100 text-purple-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {exec.type || 'agent'}
                </span>
              </td>
              <td className="py-3">
                {exec.status === 'success' ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle size={16} />
                    Success
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-600">
                    <XCircle size={16} />
                    Failed
                  </span>
                )}
              </td>
              <td className="py-3 text-gray-600">
                {exec.duration_ms ? `${exec.duration_ms}ms` : '-'}
              </td>
              <td className="py-3 text-gray-500">
                {formatTimeAgo(exec.executed_at)}
              </td>
              <td className="py-3">
                {exec.status === 'failed' && exec.error_message && (
                  <span className="text-red-600 text-xs bg-red-50 px-2 py-1 rounded max-w-xs truncate block" title={exec.error_message}>
                    {exec.error_message.slice(0, 50)}{exec.error_message.length > 50 ? '...' : ''}
                  </span>
                )}
                {exec.status === 'success' && exec.result && (
                  <span className="text-gray-500 text-xs bg-gray-50 px-2 py-1 rounded max-w-xs truncate block" title={exec.result}>
                    {exec.result.slice(0, 50)}{exec.result.length > 50 ? '...' : ''}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CronModal({ cron, onClose, onSave, isNew }) {
  const [form, setForm] = useState(cron || {
    name: '',
    schedule: '0 * * * *',
    type: 'command',
    job: '',
    command: '',
    url: '',
    enabled: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{isNew ? 'Add Cron Job' : 'Edit Cron Job'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              disabled={!isNew}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              placeholder="my-cron-job"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Schedule (Cron Expression)</label>
            <input
              type="text"
              value={form.schedule}
              onChange={(e) => setForm({ ...form, schedule: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="*/5 * * * *"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Format: minute hour day month weekday (e.g., "0 9 * * 1-5" = 9am weekdays)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="command">Command (shell)</option>
              <option value="agent">Agent (AI job)</option>
              <option value="http">HTTP Request</option>
            </select>
          </div>

          {form.type === 'command' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Command</label>
              <input
                type="text"
                value={form.command}
                onChange={(e) => setForm({ ...form, command: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="echo 'Hello World'"
              />
            </div>
          )}

          {form.type === 'agent' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Description</label>
              <textarea
                value={form.job}
                onChange={(e) => setForm({ ...form, job: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Describe the task for the AI agent..."
              />
            </div>
          )}

          {form.type === 'http' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com/webhook"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enabled"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300"
            />
            <label htmlFor="enabled" className="text-sm text-gray-700">Enabled</label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : isNew ? 'Create' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CronCard({ cron, onToggle, onEdit, onDelete }) {
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await onToggle(cron.name, !cron.enabled);
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete cron job "${cron.name}"?`)) return;
    setIsDeleting(true);
    try {
      await onDelete(cron.name);
    } finally {
      setIsDeleting(false);
    }
  };

  const typeColors = {
    agent: 'bg-blue-100 text-blue-700',
    command: 'bg-green-100 text-green-700',
    http: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${cron.enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
            <Clock size={20} className={cron.enabled ? 'text-green-600' : 'text-gray-400'} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{cron.name}</h3>
            <p className="text-sm text-gray-500 font-mono">{cron.schedule}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(cron)}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit"
          >
            <Pencil size={18} />
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 size={18} />
          </button>
          <button
            onClick={handleToggle}
            disabled={isToggling}
            className={`p-2 rounded-lg transition-colors ${
              cron.enabled
                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
            title={cron.enabled ? 'Disable' : 'Enable'}
          >
            {isToggling ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : cron.enabled ? (
              <Pause size={20} />
            ) : (
              <Play size={20} />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${typeColors[cron.type] || typeColors.agent}`}>
            {cron.type || 'agent'}
          </span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${cron.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {cron.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        {cron.job && (
          <p className="text-sm text-gray-600 line-clamp-2">{cron.job}</p>
        )}
        {cron.command && (
          <p className="text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded">{cron.command}</p>
        )}
        {cron.url && (
          <p className="text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded truncate">{cron.url}</p>
        )}
      </div>
    </div>
  );
}

function Crons() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCron, setEditingCron] = useState(null);

  const { data: crons, isLoading } = useQuery({
    queryKey: ['crons'],
    queryFn: () => apiFetch('/api/crons'),
  });

  const { data: executions, isLoading: executionsLoading } = useQuery({
    queryKey: ['cron-executions'],
    queryFn: () => apiFetch('/api/crons/executions?limit=20'),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const toggleMutation = useMutation({
    mutationFn: ({ name, enabled }) => apiPut(`/api/crons/${encodeURIComponent(name)}`, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crons'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => apiPost('/api/crons', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crons'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ name, ...data }) => apiPut(`/api/crons/${encodeURIComponent(name)}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crons'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (name) => apiDelete(`/api/crons/${encodeURIComponent(name)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crons'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const handleToggle = (name, enabled) => {
    return toggleMutation.mutateAsync({ name, enabled });
  };

  const handleEdit = (cron) => {
    setEditingCron(cron);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditingCron(null);
    setModalOpen(true);
  };

  const handleSave = async (data) => {
    if (editingCron) {
      await updateMutation.mutateAsync({ name: editingCron.name, ...data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleDelete = (name) => {
    return deleteMutation.mutateAsync(name);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const enabledCount = crons?.filter((c) => c.enabled).length ?? 0;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cron Jobs</h1>
          <p className="text-gray-500">
            {enabledCount} of {crons?.length ?? 0} jobs enabled
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Add Cron
        </button>
      </div>

      {crons?.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {crons.map((cron) => (
            <CronCard
              key={cron.name}
              cron={cron}
              onToggle={handleToggle}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Clock size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No cron jobs configured</p>
          <button
            onClick={handleAdd}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Add your first cron job
          </button>
        </div>
      )}

      {/* Execution History Section */}
      <div className="mt-12">
        <div className="flex items-center gap-2 mb-4">
          <History size={24} className="text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-900">Recent Executions</h2>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <ExecutionHistory executions={executions} isLoading={executionsLoading} />
        </div>
      </div>

      {modalOpen && (
        <CronModal
          cron={editingCron}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          isNew={!editingCron}
        />
      )}
    </div>
  );
}

export default Crons;
