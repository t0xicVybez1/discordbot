'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { guildsApi } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';

export default function GuildLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams();
  const guildId = params.guildId as string;

  useEffect(() => {
    if (!isAuthenticated) router.push('/auth');
  }, [isAuthenticated, router]);

  const { data: guildRes } = useQuery({
    queryKey: ['guild', guildId],
    queryFn: () => guildsApi.get(guildId),
    enabled: isAuthenticated && !!guildId,
  });

  const guild = guildRes?.data?.data;

  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen bg-discord-darkest-bg">
      <Sidebar
        guildId={guildId}
        guildName={guild?.name}
        guildIcon={guild?.iconUrl}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
