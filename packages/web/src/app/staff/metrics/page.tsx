'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function StaffMetricsPage() {
  const [memHistory, setMemHistory] = useState<Array<{ time: string; value: number }>>([]);

  const { data: statsRes } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getStats(),
    refetchInterval: 10000,
  });

  const stats = statsRes?.data?.data;

  // Build memory history
  useEffect(() => {
    if (stats?.memoryUsage) {
      const now = new Date().toLocaleTimeString();
      setMemHistory((prev) => [...prev.slice(-29), { time: now, value: stats.memoryUsage }]);
    }
  }, [stats?.memoryUsage]);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <BarChart3 className="w-6 h-6 text-discord-blurple" />
        <h1 className="text-2xl font-bold text-white">System Metrics</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Memory Usage Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Memory Usage (MB)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={memHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="time"
                  tick={{ fill: '#6B7280', fontSize: 10 }}
                  interval="preserveEnd"
                />
                <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: '#2F3136', border: '1px solid #374151', borderRadius: 6 }}
                  labelStyle={{ color: '#9CA3AF' }}
                  itemStyle={{ color: '#5865F2' }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#5865F2"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Current Stats */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Current Stats</h3>
          <dl className="space-y-3">
            {[
              { label: 'Total Guilds', value: stats?.totalGuilds ?? '—' },
              { label: 'Active Guilds', value: stats?.activeGuilds ?? '—' },
              { label: 'Total Users', value: stats?.totalUsers ?? '—' },
              { label: 'Memory Usage', value: stats?.memoryUsage ? `${stats.memoryUsage} MB` : '—' },
              { label: 'Uptime', value: stats?.uptime ? `${Math.floor(stats.uptime / 3600)}h ${Math.floor((stats.uptime % 3600) / 60)}m` : '—' },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center py-1 border-b border-gray-700/50">
                <dt className="text-gray-400 text-sm">{item.label}</dt>
                <dd className="text-white font-mono text-sm">{String(item.value)}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-gray-600 mt-3">Updates every 10 seconds</p>
        </div>
      </div>

      {/* Prometheus Link */}
      <div className="card mt-6">
        <h3 className="text-lg font-semibold text-white mb-2">Prometheus Metrics</h3>
        <p className="text-gray-400 text-sm mb-3">
          Raw Prometheus metrics are available at the API endpoint for scraping with Grafana.
        </p>
        <a
          href={`${process.env.NEXT_PUBLIC_API_URL}/admin/metrics`}
          target="_blank"
          rel="noreferrer"
          className="btn-secondary text-sm"
        >
          View Raw Metrics →
        </a>
      </div>
    </div>
  );
}
