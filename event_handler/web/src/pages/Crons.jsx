import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Play, Pause, Settings } from 'lucide-react';
import { apiFetch, apiPut } from '../lib/api';
import { useState } from 'react';

function CronCard({ cron, onToggle }) {
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await onToggle(cron.name, !cron.enabled);
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
          <div className={`p-2 rounded-lg ${cron.enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
            <Clock size={20} className={cron.enabled ? 'text-green-600' : 'text-gray-400'} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{cron.name}</h3>
            <p className="text-sm text-gray-500 font-mono">{cron.schedule}</p>
          </div>
        </div>
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

  const { data: crons, isLoading } = useQuery({
    queryKey: ['crons'],
    queryFn: () => apiFetch('/api/crons'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ name, enabled }) => apiPut(`/api/crons/${encodeURIComponent(name)}`, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crons'] });
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
      </div>

      {crons?.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {crons.map((cron) => (
            <CronCard key={cron.name} cron={cron} onToggle={handleToggle} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Clock size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No cron jobs configured</p>
          <p className="text-sm text-gray-400 mt-1">
            Add jobs to operating_system/CRONS.json
          </p>
        </div>
      )}
    </div>
  );
}

export default Crons;
