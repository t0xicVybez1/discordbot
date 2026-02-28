'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { StatCard } from '@/components/StatCard';
import { Server, Users, Shield, Puzzle, TrendingUp, Clock } from 'lucide-react';
import type { SystemStats } from '@discordbot/shared';

export default function StaffDashboard() {
  const { data: statsRes, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getStats(),
    refetchInterval: 30000,
  });

  const stats = statsRes?.data?.data as SystemStats | undefined;

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Staff Dashboard</h1>
        <p className="text-gray-400 text-sm">System-wide overview and management</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card h-24 animate-pulse bg-gray-700" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Guilds" value={stats?.totalGuilds ?? 0} icon={Server} color="blue" />
          <StatCard title="Active Guilds" value={stats?.activeGuilds ?? 0} icon={Server} color="green" />
          <StatCard title="Total Users" value={stats?.totalUsers ?? 0} icon={Users} color="purple" />
          <StatCard title="Mod Cases" value={stats?.totalCases ?? 0} icon={Shield} color="red" />
          <StatCard title="Active Warnings" value={stats?.totalWarnings ?? 0} icon={Shield} color="yellow" />
          <StatCard title="Addons" value={stats?.totalAddons ?? 0} icon={Puzzle} color="blue" />
          <StatCard
            title="Uptime"
            value={stats?.uptime ? formatUptime(stats.uptime) : '—'}
            icon={Clock}
            color="green"
          />
          <StatCard
            title="Memory Usage"
            value={stats?.memoryUsage ? `${stats.memoryUsage} MB` : '—'}
            icon={TrendingUp}
            color="yellow"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <a href="/staff/guilds" className="btn-secondary w-full justify-start">
              <Server className="w-4 h-4" /> Browse All Guilds
            </a>
            <a href="/staff/users" className="btn-secondary w-full justify-start">
              <Users className="w-4 h-4" /> Manage Portal Users
            </a>
            <a href="/staff/addons" className="btn-secondary w-full justify-start">
              <Puzzle className="w-4 h-4" /> Manage Addons Registry
            </a>
            <a href="/staff/logs" className="btn-secondary w-full justify-start">
              <Server className="w-4 h-4" /> View System Logs
            </a>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">System Info</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-gray-400 text-sm">Version</dt>
              <dd className="text-white text-sm font-mono">{stats?.version ?? '1.0.0'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400 text-sm">Node.js</dt>
              <dd className="text-white text-sm font-mono">v{process.versions?.node ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400 text-sm">Environment</dt>
              <dd className="text-white text-sm">
                <span className={`badge ${process.env.NODE_ENV === 'production' ? 'badge-success' : 'badge-warning'}`}>
                  {process.env.NODE_ENV ?? 'development'}
                </span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400 text-sm">Memory</dt>
              <dd className="text-white text-sm">{stats?.memoryUsage ?? '—'} MB heap used</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
