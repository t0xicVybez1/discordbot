import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-discord-darkest-bg flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-20">
        <div className="w-24 h-24 bg-discord-blurple rounded-full flex items-center justify-center mb-8 shadow-2xl">
          <svg className="w-14 h-14 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
          </svg>
        </div>

        <h1 className="text-5xl font-bold text-white mb-4 text-center">
          Discord Bot Dashboard
        </h1>
        <p className="text-xl text-gray-400 mb-8 text-center max-w-2xl">
          A powerful, production-ready Discord bot with moderation, leveling, music, auto-mod,
          and a fully-featured web dashboard with real-time updates.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/auth" className="btn-primary text-base px-8 py-3">
            Login with Discord
          </Link>
          <Link href="/staff" className="btn-secondary text-base px-8 py-3">
            Staff Portal
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-20 max-w-5xl w-full">
          {[
            { icon: '🔨', title: 'Moderation', desc: 'Ban, kick, mute, warn with full case tracking and audit logs.' },
            { icon: '🤖', title: 'Auto-Mod', desc: 'Anti-spam, word filters, link filters, caps detection, and anti-raid.' },
            { icon: '📈', title: 'Leveling', desc: 'XP system with leaderboards and customizable level-up messages.' },
            { icon: '🎵', title: 'Music', desc: 'Play music from YouTube with queue, volume, skip, and loop controls.' },
            { icon: '🎭', title: 'Reaction Roles', desc: 'Self-assignable roles via message reactions, fully configurable.' },
            { icon: '🧩', title: 'Addon System', desc: 'Install community addons or build your own with our SDK.' },
          ].map((f) => (
            <div key={f.title} className="card hover:border-discord-blurple/50 transition-colors">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="py-6 text-center text-gray-600 text-sm">
        Discord Bot Dashboard • Built with Next.js, Discord.js, Fastify, and PostgreSQL
      </footer>
    </div>
  );
}
