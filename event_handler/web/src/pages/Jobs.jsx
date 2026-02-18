import { useQuery } from '@tanstack/react-query';
import { Briefcase, CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react';
import { apiFetch } from '../lib/api';

function StatusBadge({ status }) {
  const styles = {
    completed: 'bg-green-100 text-green-700',
    in_progress: 'bg-blue-100 text-blue-700',
    queued: 'bg-yellow-100 text-yellow-700',
    failed: 'bg-red-100 text-red-700',
  };

  const icons = {
    completed: CheckCircle,
    in_progress: Clock,
    queued: Clock,
    failed: XCircle,
  };

  const Icon = icons[status] || Clock;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      <Icon size={12} />
      {status?.replace('_', ' ') || 'unknown'}
    </span>
  );
}

function JobRow({ job }) {
  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString();
  };

  const formatDuration = (start, end) => {
    if (!start) return '-';
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const seconds = Math.floor((endTime - startTime) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Briefcase size={16} className="text-gray-500" />
          </div>
          <div>
            <p className="font-mono text-sm text-gray-900">{job.id?.slice(0, 8)}...</p>
            <p className="text-xs text-gray-500">Branch: job/{job.id?.slice(0, 8)}</p>
          </div>
        </div>
      </td>
      <td className="py-4 px-4">
        <p className="text-sm text-gray-900 line-clamp-2 max-w-md">{job.description || '-'}</p>
      </td>
      <td className="py-4 px-4">
        <StatusBadge status={job.status} />
      </td>
      <td className="py-4 px-4 text-sm text-gray-500">
        {formatDate(job.created_at)}
      </td>
      <td className="py-4 px-4 text-sm text-gray-500">
        {formatDuration(job.created_at, job.completed_at)}
      </td>
      <td className="py-4 px-4">
        {job.pr_url && (
          <a
            href={job.pr_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
          >
            View PR <ExternalLink size={14} />
          </a>
        )}
      </td>
    </tr>
  );
}

function Jobs() {
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => apiFetch('/api/jobs'),
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const runningJobs = jobs?.filter((j) => j.status === 'in_progress' || j.status === 'queued').length ?? 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
        <p className="text-gray-500">
          {runningJobs > 0 ? `${runningJobs} job${runningJobs !== 1 ? 's' : ''} running` : 'No jobs running'}
        </p>
      </div>

      {jobs?.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">Job ID</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <JobRow key={job.id} job={job} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Briefcase size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No jobs yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Jobs will appear here when created via Telegram or webhook
          </p>
        </div>
      )}
    </div>
  );
}

export default Jobs;
