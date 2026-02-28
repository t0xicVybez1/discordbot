'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Shield,
  Bot,
  TrendingUp,
  MessageSquare,
  Music,
  Puzzle,
  FileText,
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface SidebarProps {
  guildId?: string;
  guildName?: string;
  guildIcon?: string | null;
}

const navItems = (guildId: string) => [
  { href: `/dashboard/${guildId}`, label: 'Overview', icon: LayoutDashboard },
  { href: `/dashboard/${guildId}/moderation`, label: 'Moderation', icon: Shield },
  { href: `/dashboard/${guildId}/automod`, label: 'Auto-Mod', icon: Bot },
  { href: `/dashboard/${guildId}/leveling`, label: 'Leveling', icon: TrendingUp },
  { href: `/dashboard/${guildId}/welcome`, label: 'Welcome', icon: MessageSquare },
  { href: `/dashboard/${guildId}/music`, label: 'Music', icon: Music },
  { href: `/dashboard/${guildId}/addons`, label: 'Addons', icon: Puzzle },
  { href: `/dashboard/${guildId}/logs`, label: 'Logs', icon: FileText },
  { href: `/dashboard/${guildId}/settings`, label: 'Settings', icon: Settings },
];

export function Sidebar({ guildId, guildName, guildIcon }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 min-h-screen bg-discord-darker-bg flex flex-col border-r border-gray-700/50">
      {/* Guild Header */}
      <div className="p-4 border-b border-gray-700/50">
        <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          {guildIcon ? (
            <img src={guildIcon} alt={guildName} className="w-9 h-9 rounded-full" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-discord-blurple flex items-center justify-center text-white font-bold text-sm">
              {guildName?.[0] ?? 'D'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{guildName ?? 'Dashboard'}</p>
            <p className="text-gray-400 text-xs">Server Settings</p>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {guildId
          ? navItems(guildId).map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(isActive ? 'sidebar-item-active' : 'sidebar-item')}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })
          : null}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-gray-700/50">
        <div className="flex items-center gap-3">
          {user?.avatar ? (
            <img
              src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`}
              alt={user.username}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-discord-blurple flex items-center justify-center text-white text-xs font-bold">
              {user?.username?.[0]?.toUpperCase() ?? 'U'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.username}</p>
            {user?.isStaff && <span className="badge-info text-xs">Staff</span>}
            {user?.isBotOwner && <span className="badge-warning text-xs ml-1">Owner</span>}
          </div>
          <button
            onClick={logout}
            title="Logout"
            className="text-gray-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
