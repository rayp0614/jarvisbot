import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Zap, Play, Pause } from 'lucide-react';
import { apiFetch, apiPut } from '../lib/api';
import { useState } from 'react';

function TriggerCard({ trigger, onToggle }) {
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await onToggle(trigger.name, !trigger.enabled);
    } finally {
      setIsToggling(false);
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

  const handleToggle = (name, enabled) => {
    return toggleMutation.mutateAsync({ name, enabled });
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
      </div>

      {triggers?.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {triggers.map((trigger) => (
            <TriggerCard key={trigger.name} trigger={trigger} onToggle={handleToggle} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Zap size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No triggers configured</p>
          <p className="text-sm text-gray-400 mt-1">
            Add triggers to operating_system/TRIGGERS.json
          </p>
        </div>
      )}
    </div>
  );
}

export default Triggers;
