import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Search,
  MapPin,
  Mail,
  Users,
  Bot,
  Play,
  Loader2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Target,
  Globe,
  Share2,
  Cpu
} from 'lucide-react';
import { apiPost, apiFetch } from '../lib/api';

// Services you offer (for AI-tailored outreach)
const SERVICE_OPTIONS = [
  {
    id: 'website',
    label: 'Website Development',
    description: 'Full websites, landing pages, redesigns',
    icon: Globe
  },
  {
    id: 'social',
    label: 'Social Media Content',
    description: 'Posts, graphics, content calendars',
    icon: Share2
  },
  {
    id: 'ai',
    label: 'AI Automation',
    description: 'Chatbots, workflow automation, AI tools',
    icon: Cpu
  },
];

// Available business categories to search
const BUSINESS_CATEGORIES = [
  { id: "plumber", label: "Plumber" },
  { id: "electrician", label: "Electrician" },
  { id: "hvac contractor", label: "HVAC Contractor" },
  { id: "landscaper", label: "Landscaper" },
  { id: "house cleaning service", label: "House Cleaning" },
  { id: "auto repair shop", label: "Auto Repair" },
  { id: "dentist", label: "Dentist" },
  { id: "accountant", label: "Accountant" },
  { id: "hair salon", label: "Hair Salon" },
  { id: "restaurant", label: "Restaurant" },
  { id: "cafe", label: "Cafe" },
  { id: "bakery", label: "Bakery" },
  { id: "florist", label: "Florist" },
  { id: "pet groomer", label: "Pet Groomer" },
  { id: "dry cleaner", label: "Dry Cleaner" },
  { id: "chiropractor", label: "Chiropractor" },
  { id: "physical therapist", label: "Physical Therapist" },
  { id: "real estate agent", label: "Real Estate Agent" },
  { id: "insurance agent", label: "Insurance Agent" },
  { id: "lawyer", label: "Lawyer" },
];

function LeadFinder() {
  // Form state
  const [formData, setFormData] = useState({
    zipCode: '06002',
    radiusMiles: 20,
    leadCount: 20,
    categories: [], // Empty = all categories
    services: ['website'], // Services you offer (default: website)
    recipientEmail: '',
    sendEmail: true,
    sendToJarvis: true,
  });

  // Track last run result
  const [lastRun, setLastRun] = useState(null);

  // Check status of a running job
  const { data: jobStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['lead-finder-status', lastRun?.runId],
    queryFn: () => apiFetch(`/api/lead-finder/status/${lastRun?.runId}`),
    enabled: !!lastRun?.runId,
    // Poll every 5s while running, stop when completed or failed
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Stop polling when job is done
      if (status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELED') {
        return false;
      }
      // Keep polling for running/queued states
      return 5000;
    },
  });

  // Mutation to trigger lead search
  const searchMutation = useMutation({
    mutationFn: (data) => apiPost('/api/lead-finder/search', data),
    onSuccess: (data) => {
      setLastRun(data);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    searchMutation.mutate(formData);
  };

  const handleCategoryToggle = (categoryId) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(c => c !== categoryId)
        : [...prev.categories, categoryId]
    }));
  };

  const handleServiceToggle = (serviceId) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(serviceId)
        ? prev.services.filter(s => s !== serviceId)
        : [...prev.services, serviceId]
    }));
  };

  const selectAllCategories = () => {
    setFormData(prev => ({
      ...prev,
      categories: BUSINESS_CATEGORIES.map(c => c.id)
    }));
  };

  const clearAllCategories = () => {
    setFormData(prev => ({
      ...prev,
      categories: []
    }));
  };

  // Consider running if mutation is pending OR job is queued/executing
  const isRunning = searchMutation.isPending ||
    ['QUEUED', 'EXECUTING', 'REATTEMPTING', 'FROZEN'].includes(jobStatus?.status);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Lead Finder</h1>
        <p className="text-gray-500">Find local businesses that need a website</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Search Parameters</h2>

            {/* Location Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin size={16} className="inline mr-1" />
                  Zip Code
                </label>
                <input
                  type="text"
                  value={formData.zipCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, zipCode: e.target.value }))}
                  pattern="\d{5}"
                  maxLength={5}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. 06002"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Radius (miles)
                </label>
                <input
                  type="number"
                  value={formData.radiusMiles}
                  onChange={(e) => setFormData(prev => ({ ...prev, radiusMiles: parseInt(e.target.value) || 20 }))}
                  min={5}
                  max={50}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Lead Count */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users size={16} className="inline mr-1" />
                Number of Leads to Find
              </label>
              <input
                type="number"
                value={formData.leadCount}
                onChange={(e) => setFormData(prev => ({ ...prev, leadCount: parseInt(e.target.value) || 20 }))}
                min={1}
                max={50}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">1-50 leads per search</p>
            </div>

            {/* Business Categories */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Business Categories
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllCategories}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={clearAllCategories}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                {formData.categories.length === 0
                  ? "No categories selected = search ALL categories"
                  : `${formData.categories.length} categories selected`}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {BUSINESS_CATEGORIES.map((cat) => (
                  <label
                    key={cat.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                      formData.categories.includes(cat.id)
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.categories.includes(cat.id)}
                      onChange={() => handleCategoryToggle(cat.id)}
                      className="sr-only"
                    />
                    <span className="text-sm">{cat.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Email Settings */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-4">
                <Mail size={16} className="inline mr-1" />
                Email Settings
              </h3>

              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-700">Send leads via email</p>
                  <p className="text-xs text-gray-500">Receive a formatted email with all leads</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, sendEmail: !prev.sendEmail }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.sendEmail ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.sendEmail ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {formData.sendEmail && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipient Email (optional)
                  </label>
                  <input
                    type="email"
                    value={formData.recipientEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, recipientEmail: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Leave empty to use default"
                  />
                  <p className="text-xs text-gray-500 mt-1">Uses LEAD_RECIPIENT_EMAIL env var if empty</p>
                </div>
              )}
            </div>

            {/* JarvisBot Settings */}
            <div className="mb-6 p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Bot size={16} />
                    Send to JarvisBot
                  </h3>
                  <p className="text-xs text-gray-500">AI will prioritize leads and send analysis via Telegram + Email</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, sendToJarvis: !prev.sendToJarvis }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.sendToJarvis ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.sendToJarvis ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Services You Offer */}
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
              <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Target size={16} />
                Services You Offer
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Select the services you want to pitch — AI will tailor outreach scripts accordingly
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {SERVICE_OPTIONS.map((service) => {
                  const Icon = service.icon;
                  const isSelected = formData.services.includes(service.id);
                  return (
                    <label
                      key={service.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-white border-blue-300 ring-2 ring-blue-500/20 shadow-sm'
                          : 'bg-white/50 border-gray-200 hover:bg-white hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleServiceToggle(service.id)}
                        className="sr-only"
                      />
                      <div className={`mt-0.5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <span className={`font-medium text-sm ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
                          {service.label}
                        </span>
                        <p className="text-xs text-gray-500 mt-0.5">{service.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
              {formData.services.length === 0 && (
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <AlertCircle size={12} />
                  Select at least one service for better AI analysis
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isRunning}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white flex items-center justify-center gap-2 transition-colors ${
                isRunning
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isRunning ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Searching for Leads...
                </>
              ) : (
                <>
                  <Play size={20} />
                  Find Leads
                </>
              )}
            </button>
          </form>
        </div>

        {/* Status Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Search Status</h2>

            {!lastRun && !searchMutation.isError && (
              <div className="text-center py-8">
                <Search size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Configure your search and click "Find Leads" to get started</p>
              </div>
            )}

            {searchMutation.isError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle size={20} />
                  <span className="font-medium">Error</span>
                </div>
                <p className="text-sm text-red-600 mt-2">
                  {searchMutation.error?.message || 'Failed to start search'}
                </p>
              </div>
            )}

            {lastRun && (
              <div className="space-y-4">
                {/* Run Status */}
                <div className={`p-4 rounded-lg ${
                  jobStatus?.status === 'COMPLETED' ? 'bg-green-50' :
                  jobStatus?.status === 'FAILED' || jobStatus?.status === 'CANCELED' ? 'bg-red-50' :
                  'bg-blue-50'
                }`}>
                  <div className="flex items-center gap-2">
                    {jobStatus?.status === 'COMPLETED' ? (
                      <CheckCircle size={20} className="text-green-600" />
                    ) : jobStatus?.status === 'FAILED' || jobStatus?.status === 'CANCELED' ? (
                      <AlertCircle size={20} className="text-red-600" />
                    ) : (
                      <Loader2 size={20} className="text-blue-600 animate-spin" />
                    )}
                    <span className="font-medium">
                      {jobStatus?.status === 'COMPLETED' ? 'Search Complete' :
                       jobStatus?.status === 'FAILED' ? 'Search Failed' :
                       jobStatus?.status === 'CANCELED' ? 'Search Canceled' :
                       jobStatus?.status === 'QUEUED' ? 'Queued...' :
                       jobStatus?.status === 'EXECUTING' ? 'Searching...' :
                       jobStatus?.status ? `Status: ${jobStatus.status}` :
                       'Starting...'}
                    </span>
                  </div>
                </div>

                {/* Run ID */}
                <div>
                  <p className="text-xs text-gray-500 mb-1">Run ID</p>
                  <p className="text-sm font-mono text-gray-700 truncate">{lastRun.runId}</p>
                </div>

                {/* Link to Trigger.dev */}
                {lastRun.runUrl && (
                  <a
                    href={lastRun.runUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    View in Trigger.dev
                    <ExternalLink size={14} />
                  </a>
                )}

                {/* Results Summary */}
                {jobStatus?.output && (
                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Results</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-gray-50 p-2 rounded">
                        <p className="text-gray-500">Businesses Found</p>
                        <p className="font-semibold">{jobStatus.output.businessesFound ?? 0}</p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <p className="text-gray-500">Leads Generated</p>
                        <p className="font-semibold">{jobStatus.output.leadsGenerated ?? 0}</p>
                      </div>
                      <div className="bg-green-50 p-2 rounded">
                        <p className="text-green-600">Hot Leads</p>
                        <p className="font-semibold text-green-700">{jobStatus.output.hotLeads ?? 0}</p>
                      </div>
                      <div className="bg-yellow-50 p-2 rounded">
                        <p className="text-yellow-600">Warm Leads</p>
                        <p className="font-semibold text-yellow-700">{jobStatus.output.warmLeads ?? 0}</p>
                      </div>
                    </div>

                    {jobStatus.output.emailResult?.success && (
                      <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                        <Mail size={14} />
                        Email sent successfully
                      </p>
                    )}

                    {jobStatus.output.jarvisResult && (
                      <p className="text-sm text-purple-600 mt-1 flex items-center gap-1">
                        <Bot size={14} />
                        JarvisBot analyzing leads...
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LeadFinder;
