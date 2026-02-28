'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi, guildsApi } from '@/lib/api';
import { SettingsSection } from '@/components/SettingsSection';
import { Toggle } from '@/components/Toggle';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import type { GuildSettings } from '@discordbot/shared';
import { TrendingUp } from 'lucide-react';

export default function LevelingPage() {
  const { guildId } = useParams() as { guildId: string };
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<Partial<GuildSettings>>({});

  const { data: settingsRes, isLoading } = useQuery({
    queryKey: ['settings', guildId],
    queryFn: () => settingsApi.get(guildId),
  });

  const { data: channelsRes } = useQuery({
    queryKey: ['channels', guildId],
    queryFn: () => guildsApi.channels(guildId),
  });

  useEffect(() => {
    if (settingsRes?.data?.data) setSettings(settingsRes.data.data);
  }, [settingsRes]);

  const mutation = useMutation({
    mutationFn: (data: Partial<GuildSettings>) => settingsApi.update(guildId, data),
    onSuccess: () => {
      toast.success('Leveling settings saved!');
      queryClient.invalidateQueries({ queryKey: ['settings', guildId] });
    },
    onError: () => toast.error('Failed to save leveling settings.'),
  });

  const handleSave = (partial: Partial<GuildSettings>) => mutation.mutate(partial);

  const channels = (channelsRes?.data?.data ?? []) as Array<{ id: string; name: string; type: number }>;
  const textChannels = channels.filter((c) => c.type === 0);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="card h-32 animate-pulse bg-gray-700" />)}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <TrendingUp className="w-6 h-6 text-discord-blurple" />
        <h1 className="text-2xl font-bold text-white">Leveling</h1>
      </div>

      <SettingsSection title="XP System" description="Configure how users earn XP by chatting.">
        <Toggle
          label="Enable Leveling"
          description="Users earn XP for sending messages and level up over time"
          enabled={settings.levelingEnabled ?? true}
          onChange={(v) => { setSettings((s) => ({ ...s, levelingEnabled: v })); handleSave({ levelingEnabled: v }); }}
        />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">XP Per Message</label>
            <input
              type="number"
              className="input"
              value={settings.xpPerMessage ?? 15}
              min={1}
              max={100}
              onChange={(e) => setSettings((s) => ({ ...s, xpPerMessage: parseInt(e.target.value) }))}
              onBlur={() => handleSave({ xpPerMessage: settings.xpPerMessage })}
            />
            <p className="text-xs text-gray-500 mt-1">XP awarded per eligible message (1–100)</p>
          </div>
          <div>
            <label className="label">XP Cooldown (seconds)</label>
            <input
              type="number"
              className="input"
              value={settings.xpCooldown ?? 60}
              min={5}
              max={600}
              onChange={(e) => setSettings((s) => ({ ...s, xpCooldown: parseInt(e.target.value) }))}
              onBlur={() => handleSave({ xpCooldown: settings.xpCooldown })}
            />
            <p className="text-xs text-gray-500 mt-1">Minimum seconds between XP awards per user</p>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Level-Up Notifications" description="Announce when a user levels up.">
        <div>
          <label className="label">Level-Up Message</label>
          <input
            type="text"
            className="input"
            value={settings.levelUpMessage ?? ''}
            placeholder="Congratulations {user}, you reached level {level}!"
            onChange={(e) => setSettings((s) => ({ ...s, levelUpMessage: e.target.value }))}
            onBlur={() => handleSave({ levelUpMessage: settings.levelUpMessage })}
          />
          <p className="text-xs text-gray-500 mt-1">
            Variables: {'{user}'}, {'{username}'}, {'{level}'}, {'{server}'}
          </p>
        </div>
        <div>
          <label className="label">Level-Up Channel</label>
          <select
            className="input"
            value={settings.levelUpChannelId ?? ''}
            onChange={(e) => setSettings((s) => ({ ...s, levelUpChannelId: e.target.value || undefined }))}
            onBlur={() => handleSave({ levelUpChannelId: settings.levelUpChannelId })}
          >
            <option value="">Same channel as message</option>
            {textChannels.map((ch) => (
              <option key={ch.id} value={ch.id}>#{ch.name}</option>
            ))}
          </select>
        </div>
      </SettingsSection>
    </div>
  );
}
