'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { guildsApi } from '@/lib/api';
import { StatCard } from '@/components/StatCard';
import { Shield, Users, TrendingUp, MessageSquare } from 'lucide-react';
import { useWebSocket } from '@/lib/socket';
import { useState } from 'react';

export default function GuildOverviewPage() {
  const { guildId } = useParams() as { guildId: string };
  const [liveEvents, setLiveEvents] = useState<string[]>([]);

  const { data: analyticsRes } = useQuery({
    queryKey: ['guild-analytics', guildId],
    queryFn: () => guildsApi.analytics(guildId),
    refetchInterval: 30000,
  });

  const { data: guildRes } = useQuery({
    queryKey: ['guild', guildId],
    queryFn: () => guildsApi.get(guildId),
  });

  const analytics = analyticsRes?.data?.data;
  const guild = guildRes?.data?.data;

  // Real-time events via WebSocket
  useWebSocket('member:join', (event) => {
    if (event.guildId === guildId) {
      setLiveEvents((prev) => [`Member joined: ${(event.data as { userTag: string }).userTag}`, ...prev.slice(0, 9)]);
    }
  });

  useWebSocket('moderation:action', (event) => {
    if (event.guildId === guildId) {
      const d = event.data as { type: string; userTag: string };
      setLiveEvents((prev) => [`Mod action: ${d.type} on ${d.userTag}`, ...prev.slice(0, 9)]);
    }
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-gray-400 text-sm">Last 24 hours of activity</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Mod Actions"
          value={analytics?.moderationActions24h ?? 0}
          icon={Shield}
          color="red"
        />
        <StatCard
          title="New Members"
          value={analytics?.newMembers24h ?? 0}
          icon={Users}
          color="green"
        />
        <StatCard
          title="Members Left"
          value={analytics?.leftMembers24h ?? 0}
          icon={Users}
          color="yellow"
        />
        <StatCard
          title="Log Events"
          value={analytics?.logEvents?.reduce((a, b) => a + b._count.type, 0) ?? 0}
          icon={MessageSquare}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Settings Status */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Feature Status</h3>
          <div className="space-y-3">
            {[
              { label: 'Moderation', key: 'moderationEnabled' },
              { label: 'Auto-Mod', key: 'autoModEnabled' },
              { label: 'Leveling', key: 'levelingEnabled' },
              { label: 'Welcome Messages', key: 'welcomeEnabled' },
              { label: 'Logging', key: 'loggingEnabled' },
              { label: 'Music', key: 'musicEnabled' },
            ].map((feature) => (
              <div key={feature.key} className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{feature.label}</span>
                <span className={`badge ${(guild as Record<string, unknown>)?.settings && ((guild as Record<string, Record<string, unknown>>).settings)?.[feature.key] ? 'badge-success' : 'badge-danger'}`}>
                  {(guild as Record<string, unknown>)?.settings && ((guild as Record<string, Record<string, unknown>>).settings)?.[feature.key] ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Events Feed */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Live Events</h3>
            <span className="flex items-center gap-1.5 text-xs text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </span>
          </div>
          {liveEvents.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent events. Events will appear here in real-time.</p>
          ) : (
            <div className="space-y-2">
              {liveEvents.map((event, i) => (
                <div key={i} className="text-xs text-gray-400 bg-discord-darkest-bg rounded px-2 py-1.5 animate-fade-in">
                  {event}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
