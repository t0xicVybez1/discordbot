'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api';
import { Toggle } from '@/components/Toggle';
import { SettingsSection } from '@/components/SettingsSection';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import type { AutoModConfig } from '@discordbot/shared';
import { Bot } from 'lucide-react';

export default function AutoModPage() {
  const { guildId } = useParams() as { guildId: string };
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<Partial<AutoModConfig>>({});
  const [wordInput, setWordInput] = useState('');

  const { data: configRes } = useQuery({
    queryKey: ['automod', guildId],
    queryFn: () => settingsApi.getAutoMod(guildId),
  });

  useEffect(() => {
    if (configRes?.data?.data) {
      setConfig(configRes.data.data);
    }
  }, [configRes]);

  const mutation = useMutation({
    mutationFn: (data: Partial<AutoModConfig>) => settingsApi.updateAutoMod(guildId, data),
    onSuccess: () => {
      toast.success('Auto-Mod settings saved!');
      queryClient.invalidateQueries({ queryKey: ['automod', guildId] });
    },
    onError: () => toast.error('Failed to save settings.'),
  });

  const handleToggle = (key: keyof AutoModConfig, value: boolean) => {
    setConfig((c) => ({ ...c, [key]: value }));
    mutation.mutate({ [key]: value });
  };

  const handleSave = (partial: Partial<AutoModConfig>) => {
    mutation.mutate(partial);
  };

  const addWord = () => {
    if (!wordInput.trim()) return;
    const words = [...(config.filteredWords ?? []), wordInput.trim().toLowerCase()];
    setConfig((c) => ({ ...c, filteredWords: words }));
    mutation.mutate({ filteredWords: words });
    setWordInput('');
  };

  const removeWord = (word: string) => {
    const words = (config.filteredWords ?? []).filter((w) => w !== word);
    setConfig((c) => ({ ...c, filteredWords: words }));
    mutation.mutate({ filteredWords: words });
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Bot className="w-6 h-6 text-discord-blurple" />
        <h1 className="text-2xl font-bold text-white">Auto-Mod</h1>
      </div>

      <SettingsSection title="Anti-Spam" description="Prevent message spam automatically.">
        <Toggle
          label="Enable Anti-Spam"
          enabled={config.antiSpamEnabled ?? false}
          onChange={(v) => handleToggle('antiSpamEnabled', v)}
        />
        {config.antiSpamEnabled && (
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="label">Messages Threshold</label>
              <input
                type="number"
                className="input"
                value={config.antiSpamThreshold ?? 5}
                min={2}
                max={20}
                onChange={(e) => setConfig((c) => ({ ...c, antiSpamThreshold: parseInt(e.target.value) }))}
                onBlur={() => handleSave({ antiSpamThreshold: config.antiSpamThreshold })}
              />
            </div>
            <div>
              <label className="label">Interval (ms)</label>
              <input
                type="number"
                className="input"
                value={config.antiSpamInterval ?? 5000}
                min={1000}
                max={30000}
                step={1000}
                onChange={(e) => setConfig((c) => ({ ...c, antiSpamInterval: parseInt(e.target.value) }))}
                onBlur={() => handleSave({ antiSpamInterval: config.antiSpamInterval })}
              />
            </div>
          </div>
        )}
      </SettingsSection>

      <SettingsSection title="Word Filter" description="Block specific words or phrases.">
        <Toggle
          label="Enable Word Filter"
          enabled={config.filterEnabled ?? false}
          onChange={(v) => handleToggle('filterEnabled', v)}
        />
        {config.filterEnabled && (
          <div className="pt-2 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                className="input flex-1"
                placeholder="Add a word..."
                value={wordInput}
                onChange={(e) => setWordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addWord()}
              />
              <button onClick={addWord} className="btn-primary">Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(config.filteredWords ?? []).map((word) => (
                <span
                  key={word}
                  className="inline-flex items-center gap-1 bg-red-900/30 text-red-400 border border-red-700/50 rounded px-2 py-0.5 text-xs"
                >
                  {word}
                  <button
                    onClick={() => removeWord(word)}
                    className="hover:text-red-300 ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
              {(config.filteredWords?.length ?? 0) === 0 && (
                <p className="text-gray-500 text-xs">No words in filter</p>
              )}
            </div>
          </div>
        )}
      </SettingsSection>

      <SettingsSection title="Anti-Mention Spam" description="Prevent mass pinging.">
        <Toggle
          label="Enable Anti-Mention"
          enabled={config.antiMentionEnabled ?? false}
          onChange={(v) => handleToggle('antiMentionEnabled', v)}
        />
        {config.antiMentionEnabled && (
          <div className="pt-2">
            <label className="label">Max Mentions per Message</label>
            <input
              type="number"
              className="input w-32"
              value={config.mentionThreshold ?? 5}
              min={2}
              max={20}
              onChange={(e) => setConfig((c) => ({ ...c, mentionThreshold: parseInt(e.target.value) }))}
              onBlur={() => handleSave({ mentionThreshold: config.mentionThreshold })}
            />
          </div>
        )}
      </SettingsSection>

      <SettingsSection title="Anti-Raid" description="Protect against coordinated join raids.">
        <Toggle
          label="Enable Anti-Raid"
          enabled={config.antiRaidEnabled ?? false}
          onChange={(v) => handleToggle('antiRaidEnabled', v)}
        />
        {config.antiRaidEnabled && (
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="label">Join Threshold</label>
              <input
                type="number"
                className="input"
                value={config.raidThreshold ?? 10}
                min={5}
                max={50}
                onChange={(e) => setConfig((c) => ({ ...c, raidThreshold: parseInt(e.target.value) }))}
                onBlur={() => handleSave({ raidThreshold: config.raidThreshold })}
              />
            </div>
            <div>
              <label className="label">Interval (ms)</label>
              <input
                type="number"
                className="input"
                value={config.raidInterval ?? 10000}
                min={5000}
                max={60000}
                step={1000}
                onChange={(e) => setConfig((c) => ({ ...c, raidInterval: parseInt(e.target.value) }))}
                onBlur={() => handleSave({ raidInterval: config.raidInterval })}
              />
            </div>
          </div>
        )}
      </SettingsSection>
    </div>
  );
}
