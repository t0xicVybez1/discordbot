'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addonsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Puzzle, Plus, Trash2, Settings } from 'lucide-react';
import { useState } from 'react';

export default function AddonsPage() {
  const { guildId } = useParams() as { guildId: string };
  const queryClient = useQueryClient();
  const [selectedAddon, setSelectedAddon] = useState<string | null>(null);

  const { data: allAddonsRes } = useQuery({
    queryKey: ['addons-all'],
    queryFn: () => addonsApi.listAll(),
  });

  const { data: guildAddonsRes } = useQuery({
    queryKey: ['addons-guild', guildId],
    queryFn: () => addonsApi.listGuild(guildId),
  });

  const installMutation = useMutation({
    mutationFn: (addonId: string) => addonsApi.install(guildId, addonId),
    onSuccess: () => {
      toast.success('Addon installed!');
      queryClient.invalidateQueries({ queryKey: ['addons-guild', guildId] });
    },
    onError: () => toast.error('Failed to install addon.'),
  });

  const uninstallMutation = useMutation({
    mutationFn: (addonId: string) => addonsApi.uninstall(guildId, addonId),
    onSuccess: () => {
      toast.success('Addon uninstalled.');
      queryClient.invalidateQueries({ queryKey: ['addons-guild', guildId] });
    },
    onError: () => toast.error('Failed to uninstall addon.'),
  });

  const allAddons = (allAddonsRes?.data?.data ?? []) as Array<{
    id: string; name: string; displayName: string; description: string; author: string; version: string; verified: boolean;
  }>;
  const guildAddons = (guildAddonsRes?.data?.data ?? []) as Array<{
    addonId: string; addon: { id: string; name: string; displayName: string };
  }>;
  const installedIds = new Set(guildAddons.map((ga) => ga.addonId));

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Puzzle className="w-6 h-6 text-discord-blurple" />
        <div>
          <h1 className="text-2xl font-bold text-white">Addons Marketplace</h1>
          <p className="text-gray-400 text-sm">{installedIds.size} installed</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allAddons.map((addon) => {
          const installed = installedIds.has(addon.id);
          return (
            <div key={addon.id} className="card hover:border-discord-blurple/40 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold">{addon.displayName}</h3>
                    {addon.verified && (
                      <span className="badge-info text-xs">✓ Verified</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">v{addon.version} by {addon.author}</p>
                </div>
                {installed && (
                  <span className="badge-success text-xs">Installed</span>
                )}
              </div>

              <p className="text-gray-400 text-sm mb-4 line-clamp-2">{addon.description}</p>

              <div className="flex gap-2">
                {installed ? (
                  <>
                    <button
                      onClick={() => setSelectedAddon(addon.id)}
                      className="btn-secondary flex-1 text-xs py-1.5"
                    >
                      <Settings className="w-3 h-3" />
                      Configure
                    </button>
                    <button
                      onClick={() => uninstallMutation.mutate(addon.id)}
                      className="btn-danger text-xs py-1.5 px-3"
                      title="Uninstall"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => installMutation.mutate(addon.id)}
                    className="btn-primary flex-1 text-xs py-1.5"
                  >
                    <Plus className="w-3 h-3" />
                    Install
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {allAddons.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Puzzle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No addons available yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
