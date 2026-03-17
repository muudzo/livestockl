import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { Home, MessageCircle, CreditCard, Bot, Menu, X, Plus, List, Bell, LogOut } from "lucide-react";
import { useUnreadCount } from "../../hooks/useNotifications";
import { useAuthStore } from "../../stores/authStore";

export function Root() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: unreadCount } = useUnreadCount();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [menuOpen, setMenuOpen] = useState(false);

  // Primary nav — the 4 most important features
  const primaryNav = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Bot, label: 'Agents', path: '/agents' },
    { icon: CreditCard, label: 'Pay', path: '/payments' },
    { icon: MessageCircle, label: 'Chat', path: '/messages' },
  ];

  // Secondary — lives in the drawer
  const secondaryNav = [
    { icon: Plus, label: 'Post a Listing', path: '/post' },
    { icon: List, label: 'My Listings', path: '/my-listings' },
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
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>

      {/* Bottom nav — clean, 5 items max */}
      <nav className="border-t border-border/40 bg-card" aria-label="Main navigation">
        <div className="flex items-center h-14">
          {primaryNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  active ? 'text-foreground' : 'text-muted-foreground/60 hover:text-muted-foreground'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.5} />
                <span className={`text-[10px] mt-0.5 tracking-wide uppercase ${active ? 'font-semibold' : 'font-normal'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors relative ${
              menuOpen ? 'text-foreground' : 'text-muted-foreground/60 hover:text-muted-foreground'
            }`}
          >
            {/* Notification badge on menu icon */}
            {!menuOpen && unreadCount && unreadCount > 0 && (
              <span className="absolute top-2 right-1/4 w-1.5 h-1.5 bg-red-500 rounded-full" />
            )}
            {menuOpen ? <X className="w-5 h-5" strokeWidth={1.5} /> : <Menu className="w-5 h-5" strokeWidth={1.5} />}
            <span className="text-[10px] mt-0.5 tracking-wide uppercase font-normal">More</span>
          </button>
        </div>
      </nav>

      {/* Drawer overlay */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed bottom-14 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50">
            <div className="mx-3 mb-2 bg-card border border-border/40 rounded-xl shadow-xl overflow-hidden">
              {/* User info */}
              {user && (
                <div className="px-5 pt-4 pb-3 border-b border-border/30">
                  <p className="text-sm font-semibold tracking-tight">{user.first_name} {user.last_name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              )}

              {/* Secondary nav items */}
              <div className="py-1">
                {secondaryNav.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);

                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNav(item.path)}
                      className={`w-full flex items-center gap-4 px-5 py-3 text-left transition-colors ${
                        active ? 'text-foreground bg-muted/50' : 'text-foreground/80 hover:bg-muted/30'
                      }`}
                    >
                      <Icon className="w-4 h-4" strokeWidth={1.5} />
                      <span className="text-sm tracking-tight">{item.label}</span>
                      {item.badge && item.badge > 0 && (
                        <span className="ml-auto text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Logout */}
              {user && (
                <div className="border-t border-border/30 py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-4 px-5 py-3 text-left text-foreground/60 hover:text-red-500 transition-colors"
                  >
                    <LogOut className="w-4 h-4" strokeWidth={1.5} />
                    <span className="text-sm tracking-tight">Log out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
