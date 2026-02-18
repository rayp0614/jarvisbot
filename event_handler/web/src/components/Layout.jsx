import { NavLink } from 'react-router-dom';
import { Home, Clock, Zap, Briefcase, DollarSign, LogOut } from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { to: '/', icon: Home, label: 'Dashboard' },
  { to: '/crons', icon: Clock, label: 'Cron Jobs' },
  { to: '/triggers', icon: Zap, label: 'Triggers' },
  { to: '/jobs', icon: Briefcase, label: 'Jobs' },
  { to: '/sales', icon: DollarSign, label: 'Sales' },
];

function Layout({ children, onLogout }) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-xl font-bold">Jarvisbot</h1>
          <p className="text-gray-400 text-sm">AI Automation Dashboard</p>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map(({ to, icon: Icon, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800'
                    )
                  }
                >
                  <Icon size={20} />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button
            onClick={onLogout}
            className="flex items-center gap-3 px-3 py-2 w-full text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}

export default Layout;
