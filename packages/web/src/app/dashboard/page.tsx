'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { guildsApi } from '@/lib/api';
import type { GuildOverview } from '@discordbot/shared';
import Link from 'next/link';
import { Bot } from 'lucide-react';

export default function DashboardPage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) router.push('/auth');
  }, [isAuthenticated, router]);

  const { data: guildsRes, isLoading } = useQuery({
    queryKey: ['guilds'],
    queryFn: () => guildsApi.list(),
    enabled: isAuthenticated,
  });

  const guilds = guildsRes?.data?.data ?? [];

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-discord-darkest-bg">
      <header className="bg-discord-darker-bg border-b border-gray-700/50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Select a Server</h1>
            <p className="text-gray-400 text-sm">Choose a server to manage its settings</p>
          </div>
          {user?.isStaff && (
            <Link href="/staff" className="btn-secondary text-sm">
              Staff Portal
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-700 rounded w-3/4" />
                    <div className="h-3 bg-gray-700 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : guilds.length === 0 ? (
          <div className="text-center py-20">
            <Bot className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No servers found</h2>
            <p className="text-gray-400 mb-6">
              You don&apos;t have admin permissions in any server with the bot.
            </p>
            <a
              href={`https://discord.com/api/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`}
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
            >
              Invite Bot to Your Server
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {guilds.map((guild: GuildOverview) => {
              const cardContent = (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    {guild.iconUrl ? (
                      <img src={guild.iconUrl} alt={guild.name} className="w-12 h-12 rounded-full" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-discord-blurple flex items-center justify-center text-white font-bold">
                        {guild.name[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate group-hover:text-discord-blurple transition-colors">
                        {guild.name}
                      </p>
                      <p className="text-gray-400 text-xs">{guild.memberCount?.toLocaleString() ?? '—'} members</p>
                    </div>
                  </div>
                  {guild.botPresent ? (
                    <span className="badge-success">● Bot Active</span>
                  ) : (
                    <a
                      href={`https://discord.com/api/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID}&guild_id=${guild.id}&permissions=8&scope=bot%20applications.commands`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-primary text-xs py-1"
                    >
                      Invite Bot
                    </a>
                  )}
                </>
              );

              return guild.botPresent ? (
                <Link
                  key={guild.id}
                  href={`/dashboard/${guild.id}`}
                  className="card hover:border-discord-blurple/50 transition-colors group cursor-pointer"
                >
                  {cardContent}
                </Link>
              ) : (
                <div
                  key={guild.id}
                  className="card hover:border-discord-blurple/50 transition-colors group opacity-60"
                >
                  {cardContent}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
