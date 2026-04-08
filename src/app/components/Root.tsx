import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { Plus, List, Bell, LogOut, ChevronRight, Zap } from "lucide-react";
import { useUnreadCount } from "../../hooks/useNotifications";
import { useAuthStore } from "../../stores/authStore";
import { TawkToChat } from "./TawkToChat";

export function Root() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: unreadCount } = useUnreadCount();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [menuOpen, setMenuOpen] = useState(false);

  const primaryNav = [
    { label: 'Home', path: '/' },
    { label: 'Agents', path: '/agents' },
    { label: 'Pay', path: '/payments' },
    { label: 'Chat', path: '/messages' },
  ];

  const secondaryNav = [
    { icon: Plus, label: 'Post a listing', path: '/post' },
    { icon: List, label: 'My listings', path: '/my-listings' },
    { icon: Zap, label: 'Pay Bills', path: '/pay-bill' },
    { icon: Bell, label: 'Notifications', path: '/notifications', badge: unreadCount || 0 },
  ];

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path + '/'));

  const handleNav = (path: string) => {
    navigate(path);
    setMenuOpen(false);
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/auth');
  };

  return (
    <div className="h-screen flex flex-col bg-background max-w-[480px] mx-auto">
      <TawkToChat />
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>

      {/* Nav — text only, Dutch confidence */}
      <nav className="bg-card border-t border-foreground/5" aria-label="Main navigation">
        <div className="flex items-baseline h-12 px-1">
          {primaryNav.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                className={`flex-1 text-center py-3 min-h-[44px] transition-all ${
                  active
                    ? 'text-foreground font-bold text-[14px]'
                    : 'text-muted-foreground font-medium text-[13px] hover:text-foreground/80'
                }`}
              >
                {item.label}
              </button>
            );
          })}

          {/* More — same typographic treatment */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="More options"
            className={`flex-1 text-center py-3 min-h-[44px] relative transition-all ${
              menuOpen
                ? 'text-foreground font-bold text-[13px]'
                : 'text-muted-foreground font-medium text-[12px] hover:text-foreground/80'
            }`}
          >
            {!menuOpen && unreadCount && unreadCount > 0 && (
              <span className="absolute top-2.5 right-[28%] w-1 h-1 bg-emerald-600 rounded-full" />
            )}
            More
          </button>
        </div>
      </nav>

      {/* Drawer */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed bottom-12 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50">
            <div className="mx-4 mb-1 bg-card border border-foreground/5 rounded-lg overflow-hidden shadow-2xl">
              {/* User */}
              {user && (
                <div className="px-5 pt-5 pb-4">
                  <p className="text-base font-bold tracking-tight leading-none">{user.first_name} {user.last_name}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 font-mono">{user.email}</p>
                </div>
              )}

              <div className="h-px bg-foreground/5" />

              {/* Links */}
              {secondaryNav.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNav(item.path)}
                    className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-foreground/[0.02] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
                      <span className="text-[13px] text-foreground/80 group-hover:text-foreground transition-colors">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.badge && item.badge > 0 && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    </div>
                  </button>
                );
              })}

              <div className="h-px bg-foreground/5" />

              {/* Logout */}
              {user && (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-5 py-3.5 text-left text-muted-foreground hover:text-foreground transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span className="text-[13px]">Log out</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
