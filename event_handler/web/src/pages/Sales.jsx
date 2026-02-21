import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { DollarSign, TrendingUp, Users, Target, Award, BarChart3 } from 'lucide-react';
import { apiFetch } from '../lib/api';

function StatCard({ icon: Icon, label, value, subtext, color }) {
  const colors = {
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    yellow: 'bg-yellow-100 text-yellow-600',
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

function PeriodSelector({ value, onChange, customDates, onCustomDatesChange }) {
  const periods = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'all', label: 'All Time' },
    { key: 'custom', label: 'Custom' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {periods.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            value === key
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {label}
        </button>
      ))}
      {value === 'custom' && (
        <div className="flex items-center gap-2 ml-2">
          <input
            type="date"
            value={customDates.startDate}
            onChange={(e) => onCustomDatesChange({ ...customDates, startDate: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={customDates.endDate}
            onChange={(e) => onCustomDatesChange({ ...customDates, endDate: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      )}
    </div>
  );
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function Sales() {
  const [period, setPeriod] = useState('all');
  const [customDates, setCustomDates] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  // Build query params based on period
  const getQueryParams = () => {
    if (period === 'custom') {
      return `period=custom&startDate=${customDates.startDate}&endDate=${customDates.endDate}`;
    }
    return `period=${period}`;
  };

  const { data: status } = useQuery({
    queryKey: ['sales-status'],
    queryFn: () => apiFetch('/api/sales/status'),
  });

  const { data: summary, isLoading } = useQuery({
    queryKey: ['sales-summary', period, customDates],
    queryFn: () => apiFetch(`/api/sales/summary?${getQueryParams()}`),
    enabled: status?.enabled,
    refetchInterval: 60000,
  });

  const { data: repsData } = useQuery({
    queryKey: ['sales-reps', period, customDates],
    queryFn: () => apiFetch(`/api/sales/reps?${getQueryParams()}`),
    enabled: status?.enabled,
  });

  const { data: teamsData } = useQuery({
    queryKey: ['sales-teams', period, customDates],
    queryFn: () => apiFetch(`/api/sales/teams?${getQueryParams()}`),
    enabled: status?.enabled,
  });

  const { data: sourcesData } = useQuery({
    queryKey: ['sales-sources', period, customDates],
    queryFn: () => apiFetch(`/api/sales/sources?${getQueryParams()}`),
    enabled: status?.enabled,
  });

  const { data: recentData } = useQuery({
    queryKey: ['sales-recent'],
    queryFn: () => apiFetch('/api/sales/recent?limit=10'),
    enabled: status?.enabled,
  });

  if (!status?.enabled) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Sales Analytics</h1>
          <p className="text-gray-500">Track your team's sales performance</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <h3 className="text-yellow-800 font-medium mb-2">Sales Integration Not Configured</h3>
          <p className="text-yellow-700 text-sm">
            To enable sales analytics, configure the following environment variables:
          </p>
          <ul className="mt-3 text-sm text-yellow-700 list-disc list-inside">
            <li><code>GOOGLE_SHEETS_CREDENTIALS</code> - Base64-encoded service account JSON</li>
            <li><code>SALES_SPREADSHEET_ID</code> - Your Google Sheets spreadsheet ID</li>
            <li><code>SALES_SHEET_RANGE</code> - Sheet range (default: Sheet1!A:I)</li>
          </ul>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Analytics</h1>
          <p className="text-gray-500">Track your team's sales performance</p>
        </div>
        <PeriodSelector
          value={period}
          onChange={setPeriod}
          customDates={customDates}
          onCustomDatesChange={setCustomDates}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={DollarSign}
          label="Total Sales"
          value={formatCurrency(summary?.totalSales)}
          subtext={`${summary?.totalDeals || 0} deals closed`}
          color="green"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Deal Size"
          value={formatCurrency(summary?.avgDealSize)}
          color="blue"
        />
        <StatCard
          icon={Target}
          label="Pipeline"
          value={summary?.pipelineStats?.submitted || 0}
          subtext={`${summary?.pipelineStats?.installed || 0} installed`}
          color="purple"
        />
        <StatCard
          icon={Users}
          label="Active Reps"
          value={repsData?.reps?.length || 0}
          color="yellow"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Reps */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <Award className="text-yellow-500" size={20} />
            <h2 className="text-lg font-semibold text-gray-900">Top Sales Reps</h2>
          </div>
          <div className="p-4">
            {repsData?.reps?.length > 0 ? (
              <div className="space-y-3">
                {repsData.reps.slice(0, 5).map((rep, idx) => (
                  <div key={rep.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                        idx === 1 ? 'bg-gray-100 text-gray-700' :
                        idx === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-50 text-gray-500'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="font-medium text-gray-900">{rep.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(rep.totalSA)}</p>
                      <p className="text-xs text-gray-500">{rep.deals} deals</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No sales data</p>
            )}
          </div>
        </div>

        {/* Team Leaderboard */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <Users className="text-blue-500" size={20} />
            <h2 className="text-lg font-semibold text-gray-900">Team Leaderboard</h2>
          </div>
          <div className="p-4">
            {teamsData?.teams?.length > 0 ? (
              <div className="space-y-3">
                {teamsData.teams.slice(0, 5).map((team, idx) => (
                  <div key={team.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-blue-100 text-blue-700' :
                        idx === 1 ? 'bg-blue-50 text-blue-600' :
                        'bg-gray-50 text-gray-500'
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-medium text-gray-900">{team.name}</span>
                        {team.group && (
                          <span className="ml-2 text-xs text-gray-400">{team.group}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(team.totalSA)}</p>
                      <p className="text-xs text-gray-500">{team.deals} deals</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No team data</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Sources */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <BarChart3 className="text-purple-500" size={20} />
            <h2 className="text-lg font-semibold text-gray-900">Lead Sources</h2>
          </div>
          <div className="p-4">
            {sourcesData?.sources?.length > 0 ? (
              <div className="space-y-3">
                {sourcesData.sources.slice(0, 5).map((source) => {
                  const maxSA = sourcesData.sources[0]?.totalSA || 1;
                  const percentage = (source.totalSA / maxSA) * 100;
                  return (
                    <div key={source.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{source.name}</span>
                        <span className="text-sm text-gray-500">{formatCurrency(source.totalSA)}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No source data</p>
            )}
          </div>
        </div>

        {/* Recent Deals */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <TrendingUp className="text-green-500" size={20} />
            <h2 className="text-lg font-semibold text-gray-900">Recent Deals</h2>
          </div>
          <div className="p-4">
            {recentData?.deals?.length > 0 ? (
              <div className="space-y-3">
                {recentData.deals.slice(0, 5).map((deal, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{deal.sales_rep}</p>
                      <p className="text-xs text-gray-500">{deal.team_name} • {deal.source}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">{formatCurrency(deal.SA)}</p>
                      <p className="text-xs text-gray-400">{deal.sold_date?.split(' ')[0]}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No recent deals</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sales;
