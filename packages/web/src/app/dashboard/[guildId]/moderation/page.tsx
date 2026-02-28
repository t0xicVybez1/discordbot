'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { moderationApi } from '@/lib/api';
import { useState } from 'react';
import { Shield, Search } from 'lucide-react';

export default function ModerationPage() {
  const { guildId } = useParams() as { guildId: string };
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');

  const { data: casesRes, isLoading } = useQuery({
    queryKey: ['cases', guildId, page, typeFilter],
    queryFn: () => moderationApi.getCases(guildId, { page, type: typeFilter || undefined }),
    refetchInterval: 15000,
  });

  const cases = casesRes?.data?.data?.items ?? [];
  const total = casesRes?.data?.data?.total ?? 0;
  const hasMore = casesRes?.data?.data?.hasMore ?? false;

  const typeColors: Record<string, string> = {
    ban: 'badge-danger',
    tempban: 'badge-danger',
    kick: 'badge-warning',
    mute: 'badge-warning',
    unmute: 'badge-success',
    unban: 'badge-success',
    warn: 'badge-info',
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Shield className="w-6 h-6 text-discord-blurple" />
          <h1 className="text-2xl font-bold text-white">Moderation</h1>
        </div>
        <p className="text-gray-400 text-sm">View and manage moderation cases. Total: {total}</p>
      </div>

      {/* Filters */}
      <div className="card mb-6 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by user ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="input sm:w-48"
        >
          <option value="">All Types</option>
          <option value="ban">Ban</option>
          <option value="kick">Kick</option>
          <option value="mute">Mute</option>
          <option value="warn">Warn</option>
          <option value="unban">Unban</option>
        </select>
      </div>

      {/* Cases Table */}
      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead className="bg-discord-darkest-bg">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">#</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Type</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">User</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Moderator</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Reason</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {isLoading ? (
              [...Array(10)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={6} className="px-4 py-3">
                    <div className="h-4 bg-gray-700 rounded w-full" />
                  </td>
                </tr>
              ))
            ) : cases.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No cases found
                </td>
              </tr>
            ) : (
              cases.map((c: {
                id: string;
                caseNumber: number;
                type: string;
                userTag: string;
                userId: string;
                moderatorTag: string;
                reason: string;
                createdAt: string;
              }) => (
                <tr key={c.id} className="hover:bg-discord-dark-bg/30 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-400">#{c.caseNumber}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${typeColors[c.type] ?? 'badge-info'}`}>
                      {c.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-200">{c.userTag}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{c.moderatorTag}</td>
                  <td className="px-4 py-3 text-sm text-gray-300 max-w-xs truncate">{c.reason}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {total > 20 && (
          <div className="px-4 py-3 border-t border-gray-700/50 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Showing {Math.min((page - 1) * 20 + 1, total)}–{Math.min(page * 20, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn-secondary text-xs py-1 px-3"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore}
                className="btn-secondary text-xs py-1 px-3"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
