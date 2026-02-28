'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi, guildsApi } from '@/lib/api';
import { Toggle } from '@/components/Toggle';
import { SettingsSection } from '@/components/SettingsSection';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import type { GuildSettings } from '@discordbot/shared';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
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

  const { data: rolesRes } = useQuery({
    queryKey: ['roles', guildId],
    queryFn: () => guildsApi.roles(guildId),
  });

  useEffect(() => {
    if (settingsRes?.data?.data) {
      setSettings(settingsRes.data.data);
    }
  }, [settingsRes]);

  const mutation = useMutation({
    mutationFn: (data: Partial<GuildSettings>) => settingsApi.update(guildId, data),
    onSuccess: () => {
      toast.success('Settings saved! Changes applied instantly.');
      queryClient.invalidateQueries({ queryKey: ['settings', guildId] });
    },
    onError: () => toast.error('Failed to save settings.'),
  });

  const handleToggle = (key: keyof GuildSettings, value: boolean) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    mutation.mutate({ [key]: value });
  };

  const handleSave = (partial: Partial<GuildSettings>) => {
    mutation.mutate(partial);
  };

  const channels = (channelsRes?.data?.data ?? []) as Array<{ id: string; name: string; type: number }>;
  const roles = (rolesRes?.data?.data ?? []) as Array<{ id: string; name: string }>;
  const textChannels = channels.filter((c) => c.type === 0);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card h-32 bg-gray-700" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Settings className="w-6 h-6 text-discord-blurple" />
        <h1 className="text-2xl font-bold text-white">General Settings</h1>
      </div>

      {/* Feature Toggles */}
      <SettingsSection
        title="Features"
        description="Enable or disable major bot features. Changes apply instantly."
      >
        <Toggle
          label="Moderation"
          description="Enable moderation commands (ban, kick, mute, warn)"
          enabled={settings.moderationEnabled ?? true}
          onChange={(v) => handleToggle('moderationEnabled', v)}
        />
        <Toggle
          label="Auto-Mod"
          description="Enable automatic message filtering and spam protection"
          enabled={settings.autoModEnabled ?? false}
          onChange={(v) => handleToggle('autoModEnabled', v)}
        />
        <Toggle
          label="Leveling"
          description="Enable XP and leveling system"
          enabled={settings.levelingEnabled ?? true}
          onChange={(v) => handleToggle('levelingEnabled', v)}
        />
        <Toggle
          label="Welcome Messages"
          description="Send welcome/leave messages"
          enabled={settings.welcomeEnabled ?? false}
          onChange={(v) => handleToggle('welcomeEnabled', v)}
        />
        <Toggle
          label="Logging"
          description="Log events like message edits/deletes, mod actions"
          enabled={settings.loggingEnabled ?? false}
          onChange={(v) => handleToggle('loggingEnabled', v)}
        />
        <Toggle
          label="Music"
          description="Enable music playback commands"
          enabled={settings.musicEnabled ?? true}
          onChange={(v) => handleToggle('musicEnabled', v)}
        />
        <Toggle
          label="Reaction Roles"
          description="Enable self-assignable reaction roles"
          enabled={settings.reactionRolesEnabled ?? false}
          onChange={(v) => handleToggle('reactionRolesEnabled', v)}
        />
      </SettingsSection>

      {/* Log Channels */}
      <SettingsSection
        title="Log Channels"
        description="Select where different events are logged."
      >
        <div>
          <label className="label">Mod Log Channel</label>
          <select
            className="input"
            value={settings.modLogChannelId ?? ''}
            onChange={(e) => setSettings((s) => ({ ...s, modLogChannelId: e.target.value || undefined }))}
            onBlur={() => handleSave({ modLogChannelId: settings.modLogChannelId })}
          >
            <option value="">None</option>
            {textChannels.map((ch) => (
              <option key={ch.id} value={ch.id}>#{ch.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">General Log Channel</label>
          <select
            className="input"
            value={settings.logChannelId ?? ''}
            onChange={(e) => setSettings((s) => ({ ...s, logChannelId: e.target.value || undefined }))}
            onBlur={() => handleSave({ logChannelId: settings.logChannelId })}
          >
            <option value="">None</option>
            {textChannels.map((ch) => (
              <option key={ch.id} value={ch.id}>#{ch.name}</option>
            ))}
          </select>
        </div>
      </SettingsSection>

      {/* Roles */}
      <SettingsSection title="Roles" description="Configure auto-assign and mute roles.">
        <div>
          <label className="label">Auto-Role (given on join)</label>
          <select
            className="input"
            value={settings.autoRoleId ?? ''}
            onChange={(e) => setSettings((s) => ({ ...s, autoRoleId: e.target.value || undefined }))}
            onBlur={() => handleSave({ autoRoleId: settings.autoRoleId })}
          >
            <option value="">None</option>
            {roles.filter((r) => r.name !== '@everyone').map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Mute Role (legacy - prefer Discord timeout)</label>
          <select
            className="input"
            value={settings.muteRoleId ?? ''}
            onChange={(e) => setSettings((s) => ({ ...s, muteRoleId: e.target.value || undefined }))}
            onBlur={() => handleSave({ muteRoleId: settings.muteRoleId })}
          >
            <option value="">None</option>
            {roles.filter((r) => r.name !== '@everyone').map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      </SettingsSection>

      {/* Leveling */}
      <SettingsSection title="Leveling Configuration" description="Customize the XP system.">
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
          </div>
        </div>
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
