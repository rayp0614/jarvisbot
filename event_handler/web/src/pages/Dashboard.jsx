import { useQuery } from '@tanstack/react-query';
import { Clock, Zap, Briefcase, CheckCircle, AlertCircle, Activity } from 'lucide-react';
import { apiFetch } from '../lib/api';

function StatCard({ icon: Icon, label, value, subtext, color }) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon size={24} />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
          {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ type, description, timestamp }) {
  const icons = {
    job_created: Briefcase,
    job_completed: CheckCircle,
    job_failed: AlertCircle,
    cron_ran: Clock,
    trigger_fired: Zap,
  };
  const Icon = icons[type] || Activity;

  const colors = {
    job_created: 'text-blue-500',
    job_completed: 'text-green-500',
    job_failed: 'text-red-500',
    cron_ran: 'text-purple-500',
    trigger_fired: 'text-yellow-500',
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <Icon size={18} className={colors[type] || 'text-gray-400'} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 truncate">{description}</p>
        <p className="text-xs text-gray-400">{new Date(timestamp).toLocaleString()}</p>
      </div>
    </div>
  );
}

function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiFetch('/api/dashboard/stats'),
    refetchInterval: 30000,
  });

  const { data: activity } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: () => apiFetch('/api/dashboard/activity'),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Overview of your Jarvisbot automation</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={Clock}
          label="Active Cron Jobs"
          value={stats?.enabledCrons ?? 0}
          subtext={`${stats?.totalCrons ?? 0} total configured`}
          color="purple"
        />
        <StatCard
          icon={Zap}
          label="Active Triggers"
          value={stats?.enabledTriggers ?? 0}
          subtext={`${stats?.totalTriggers ?? 0} total configured`}
          color="yellow"
        />
        <StatCard
          icon={Briefcase}
          label="Jobs Today"
          value={stats?.jobsToday ?? 0}
          subtext={`${stats?.jobsRunning ?? 0} running now`}
          color="blue"
        />
        <StatCard
          icon={CheckCircle}
          label="Success Rate"
          value={stats?.successRate ? `${stats.successRate}%` : 'N/A'}
          subtext="Last 7 days"
          color="green"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="p-4">
          {activity?.length > 0 ? (
            activity.map((item, idx) => (
              <ActivityItem key={idx} {...item} />
            ))
          ) : (
            <p className="text-gray-500 text-center py-8">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
