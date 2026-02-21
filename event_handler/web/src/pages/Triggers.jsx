import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Zap, Play, Pause, Plus, Pencil, Trash2, X } from 'lucide-react';
import { apiFetch, apiPut, apiPost, apiDelete } from '../lib/api';
import { useState } from 'react';

function ActionEditor({ action, onChange, onRemove }) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
      <div className="flex justify-between items-start mb-3">
        <select
          value={action.type || 'command'}
          onChange={(e) => onChange({ ...action, type: e.target.value })}
          className="px-2 py-1 border rounded text-sm"
        >
          <option value="command">Command</option>
          <option value="agent">Agent</option>
          <option value="http">HTTP</option>
        </select>
        <button
          type="button"
          onClick={onRemove}
          className="p-1 text-red-500 hover:bg-red-50 rounded"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {action.type === 'command' && (
        <input
          type="text"
          value={action.command || ''}
          onChange={(e) => onChange({ ...action, command: e.target.value })}
          placeholder="echo 'triggered!'"
          className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
        />
      )}

      {action.type === 'agent' && (
        <textarea
          value={action.job || ''}
          onChange={(e) => onChange({ ...action, job: e.target.value })}
          placeholder="Describe what the AI agent should do..."
          className="w-full px-3 py-2 border rounded-lg text-sm"
          rows={2}
        />
      )}

      {action.type === 'http' && (
        <input
          type="url"
          value={action.url || ''}
          onChange={(e) => onChange({ ...action, url: e.target.value })}
          placeholder="https://example.com/webhook"
          className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
        />
      )}
    </div>
  );
}

function TriggerModal({ trigger, onClose, onSave, isNew }) {
  const [form, setForm] = useState(trigger || {
    name: '',
    watch_path: '/github/webhook',
    actions: [{ type: 'command', command: '' }],
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

  const addAction = () => {
    setForm({
      ...form,
      actions: [...form.actions, { type: 'command', command: '' }],
    });
  };

  const updateAction = (index, action) => {
    const newActions = [...form.actions];
    newActions[index] = action;
    setForm({ ...form, actions: newActions });
  };

  const removeAction = (index) => {
    setForm({
      ...form,
      actions: form.actions.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">{isNew ? 'Add Trigger' : 'Edit Trigger'}</h2>
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
              placeholder="my-trigger"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Watch Path</label>
            <input
              type="text"
              value={form.watch_path}
              onChange={(e) => setForm({ ...form, watch_path: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="/github/webhook"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Endpoint path to watch (e.g., /github/webhook, /telegram/webhook)
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Actions</label>
              <button
                type="button"
                onClick={addAction}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus size={14} /> Add Action
              </button>
            </div>
            <div className="space-y-3">
              {form.actions.map((action, idx) => (
                <ActionEditor
                  key={idx}
                  action={action}
                  onChange={(a) => updateAction(idx, a)}
                  onRemove={() => removeAction(idx)}
                />
              ))}
              {form.actions.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No actions. Add at least one action.
                </p>
              )}
            </div>
          </div>

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
              disabled={saving || form.actions.length === 0}
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

function TriggerCard({ trigger, onToggle, onEdit, onDelete }) {
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await onToggle(trigger.name, !trigger.enabled);
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete trigger "${trigger.name}"?`)) return;
    setIsDeleting(true);
    try {
      await onDelete(trigger.name);
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
          <div className={`p-2 rounded-lg ${trigger.enabled ? 'bg-yellow-100' : 'bg-gray-100'}`}>
            <Zap size={20} className={trigger.enabled ? 'text-yellow-600' : 'text-gray-400'} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{trigger.name}</h3>
            <p className="text-sm text-gray-500 font-mono">{trigger.watch_path}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(trigger)}
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
              trigger.enabled
                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
            title={trigger.enabled ? 'Disable' : 'Enable'}
          >
            {isToggling ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : trigger.enabled ? (
              <Pause size={20} />
            ) : (
              <Play size={20} />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${trigger.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {trigger.enabled ? 'Enabled' : 'Disabled'}
          </span>
          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
            {trigger.actions?.length ?? 0} action{trigger.actions?.length !== 1 ? 's' : ''}
          </span>
        </div>

        {trigger.actions?.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase">Actions:</p>
            {trigger.actions.map((action, idx) => (
              <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[action.type] || typeColors.agent}`}>
                    {action.type || 'agent'}
                  </span>
                </div>
                {action.job && (
                  <p className="text-sm text-gray-600 line-clamp-2">{action.job}</p>
                )}
                {action.command && (
                  <p className="text-sm text-gray-600 font-mono">{action.command}</p>
                )}
                {action.url && (
                  <p className="text-sm text-gray-600 font-mono truncate">{action.url}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Triggers() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState(null);

  const { data: triggers, isLoading } = useQuery({
    queryKey: ['triggers'],
    queryFn: () => apiFetch('/api/triggers'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ name, enabled }) => apiPut(`/api/triggers/${encodeURIComponent(name)}`, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triggers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => apiPost('/api/triggers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triggers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ name, ...data }) => apiPut(`/api/triggers/${encodeURIComponent(name)}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triggers'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (name) => apiDelete(`/api/triggers/${encodeURIComponent(name)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triggers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const handleToggle = (name, enabled) => {
    return toggleMutation.mutateAsync({ name, enabled });
  };

  const handleEdit = (trigger) => {
    setEditingTrigger(trigger);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditingTrigger(null);
    setModalOpen(true);
  };

  const handleSave = async (data) => {
    if (editingTrigger) {
      await updateMutation.mutateAsync({ name: editingTrigger.name, ...data });
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

  const enabledCount = triggers?.filter((t) => t.enabled).length ?? 0;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Triggers</h1>
          <p className="text-gray-500">
            {enabledCount} of {triggers?.length ?? 0} triggers enabled
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Add Trigger
        </button>
      </div>

      {triggers?.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {triggers.map((trigger) => (
            <TriggerCard
              key={trigger.name}
              trigger={trigger}
              onToggle={handleToggle}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Zap size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No triggers configured</p>
          <button
            onClick={handleAdd}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Add your first trigger
          </button>
        </div>
      )}

      {modalOpen && (
        <TriggerModal
          trigger={editingTrigger}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          isNew={!editingTrigger}
        />
      )}
    </div>
  );
}

export default Triggers;
