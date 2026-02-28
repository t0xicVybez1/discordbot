'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { moderationApi } from '@/lib/api';
import { FileText } from 'lucide-react';

const TYPE_LABELS: Record<string, string> = {
  member_join: 'Member Join',
  member_leave: 'Member Leave',
  message_delete: 'Message Deleted',
  message_edit: 'Message Edited',
  member_ban: 'Member Banned',
  member_unban: 'Member Unbanned',
  member_kick: 'Member Kicked',
  member_timeout: 'Member Timed Out',
  role_create: 'Role Created',
  role_delete: 'Role Deleted',
  channel_create: 'Channel Created',
  channel_delete: 'Channel Deleted',
};

function getDetails(type: string, data: Record<string, unknown> | null): string {
  if (!data) return '—';
  if (type === 'message_edit' || type === 'message_delete') {
    return data.channelId ? `#${data.channelId}` : '—';
  }
  if (type.startsWith('member_') && data.reason) return String(data.reason);
  if (data.userTag) return String(data.userTag);
  return '—';
}

export default function LogsPage() {
  const { guildId } = useParams() as { guildId: string };

  const { data: logsRes, isLoading } = useQuery({
    queryKey: ['logs', guildId],
    queryFn: () => moderationApi.getLogs(guildId),
    refetchInterval: 15000,
  });

  const logs = (logsRes?.data?.data?.items ?? []) as Array<{
    id: string;
    type: string;
    userId: string | null;
    data: Record<string, unknown> | null;
    createdAt: string;
  }>;

  if (isLoading) {
    return (
      <div className="p-6 space-y-2">
        {[...Array(8)].map((_, i) => <div key={i} className="card h-12 animate-pulse bg-gray-700" />)}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <FileText className="w-6 h-6 text-discord-blurple" />
        <div>
          <h1 className="text-2xl font-bold text-white">Server Logs</h1>
          <p className="text-gray-400 text-sm">Recent activity in this server (auto-refreshes every 15s)</p>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead className="bg-discord-darkest-bg">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Event</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">User ID</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Details</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-gray-500">
                  No log entries yet. Enable logging in Settings to start capturing events.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-discord-dark-bg/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-sm text-white">
                      {TYPE_LABELS[log.type] ?? log.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400 font-mono">
                    {log.userId ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {getDetails(log.type, log.data)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
