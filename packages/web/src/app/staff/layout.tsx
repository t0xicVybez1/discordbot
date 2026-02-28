'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { useAuth } from '@/lib/auth';
import {
  LayoutDashboard,
  Server,
  Users,
  Puzzle,
  FileText,
  BarChart3,
  LogOut,
  Shield,
} from 'lucide-react';

const staffNav = [
  { href: '/staff', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/staff/guilds', label: 'Guilds', icon: Server },
  { href: '/staff/users', label: 'Users', icon: Users },
  { href: '/staff/addons', label: 'Addons', icon: Puzzle },
  { href: '/staff/logs', label: 'Logs', icon: FileText },
  { href: '/staff/metrics', label: 'Metrics', icon: BarChart3 },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }
    if (!user?.isStaff && !user?.isBotOwner) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || (!user?.isStaff && !user?.isBotOwner)) return null;

  return (
    <div className="flex min-h-screen bg-discord-darkest-bg">
      {/* Staff Sidebar */}
      <aside className="w-64 min-h-screen bg-discord-darker-bg flex flex-col border-r border-gray-700/50">
        <div className="p-4 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Staff Portal</p>
              <p className="text-gray-400 text-xs">{user?.username}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {staffNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(isActive ? 'sidebar-item-active' : 'sidebar-item')}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-700/50">
          <Link href="/dashboard" className="sidebar-item mb-2">
            <Server className="w-4 h-4" />
            My Servers
          </Link>
          <button onClick={logout} className="sidebar-item w-full text-red-400 hover:text-red-300">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
