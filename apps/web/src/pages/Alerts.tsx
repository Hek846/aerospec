import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { AlertRule, AlertEvent } from '../types';

export default function Alerts() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'acknowledged' | 'closed'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getAlerts();
      setRules(data.rules);
      setEvents(data.events);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcknowledge = async (eventId: string) => {
    try {
      await api.acknowledgeAlert(eventId);
      // Update local state optimistically
      setEvents(events.map(e =>
        e.id === eventId ? { ...e, status: 'acknowledged' as const } : e
      ));
    } catch (err) {
      alert('Failed to acknowledge alert');
    }
  };

  const handleDismiss = async (eventId: string) => {
    try {
      await api.dismissAlert(eventId);
      // Update local state optimistically
      setEvents(events.map(e =>
        e.id === eventId ? { ...e, status: 'closed' as const } : e
      ));
    } catch (err) {
      alert('Failed to dismiss alert');
    }
  };

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    return event.status === filter;
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'acknowledged':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'closed':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'pm25':
      case 'pm10':
        return '🌫️';
      case 'co2':
        return '💨';
      case 'vocIndex':
        return '🧪';
      case 'noiseDb':
        return '🔊';
      default:
        return '⚠️';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading alerts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <p className="font-medium">Error loading alerts</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={loadAlerts}
            className="mt-3 text-sm underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Alerts</h1>
        <p className="text-gray-600">Manage air quality alerts and notifications</p>
      </div>

      {/* Alert Rules Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Alert Rules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rules.map(rule => (
            <div
              key={rule.id}
              className="p-4 border border-gray-200 rounded-lg bg-gray-50"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-2xl">{getMetricIcon(rule.metric)}</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  rule.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {rule.enabled ? 'Active' : 'Disabled'}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 capitalize mb-1">
                {rule.metric.replace(/([A-Z])/g, ' $1')}
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                Alert when {rule.thresholdType} {rule.thresholdValue}
              </p>
              <div className="text-xs text-gray-500">
                <p>Email: {rule.notifyEmail}</p>
                {rule.quietHours && (
                  <p>Quiet: {rule.quietHours.start} - {rule.quietHours.end}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alert Events Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Alert Events</h2>
          <div className="flex gap-2">
            {(['all', 'open', 'acknowledged', 'closed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No {filter !== 'all' ? filter : ''} alerts found</p>
            <p className="text-sm mt-1">All clear!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map(event => (
              <div
                key={event.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4 flex-1">
                  <span className="text-2xl">{getMetricIcon(event.metric)}</span>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 capitalize">
                        {event.metric.replace(/([A-Z])/g, ' $1')}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded border ${getStatusBadgeClass(event.status)}`}>
                        {event.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Value: <span className="font-medium">{event.value}</span> • Device: {event.deviceId}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatTimestamp(event.timestamp)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  {event.status === 'open' && (
                    <button
                      onClick={() => handleAcknowledge(event.id)}
                      className="px-3 py-1.5 text-sm font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md hover:bg-yellow-100 transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}
                  {(event.status === 'open' || event.status === 'acknowledged') && (
                    <button
                      onClick={() => handleDismiss(event.id)}
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
