import { useState } from "react";
import { useNavigate } from "react-router";
import { X, CheckCheck, Loader2, BellOff } from "lucide-react";
import { useNotifications, useMarkAllRead, useMarkRead, useDeleteNotification } from "../../hooks/useNotifications";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

// Notifications carry an optional `link` set by the writing RPC/Edge Function.
// When present we navigate there directly — this is how outbid bidders go to
// /item/<id> while sellers (also type='bid') go to /my-listings. For older
// rows that predate the link column, we fall back to type-based routing.
function destinationFor(notification: { type: string; link?: string | null }): string {
  if (notification.link && typeof notification.link === 'string') {
    return notification.link;
  }
  switch (notification.type) {
    case 'auction_won':
    case 'payment':
      return '/payments';
    case 'message':
      return '/messages';
    case 'bid':
    case 'auction_ending':
      return '/my-listings';
    default:
      return '/';
  }
}

function NotificationSkeleton() {
  return (
    <div className="bg-card border rounded-xl p-5 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-2 h-2 rounded-full bg-slate-200 mt-2" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-4 bg-slate-200 rounded w-1/3" />
          <div className="h-3 bg-slate-200 rounded w-2/3" />
          <div className="h-3 bg-slate-200 rounded w-1/4" />
        </div>
        <div className="w-8 h-8 rounded bg-slate-200" />
      </div>
    </div>
  );
}

export function Notifications() {
  const navigate = useNavigate();
  const { data: notifications, isLoading } = useNotifications();
  const markAllRead = useMarkAllRead();
  const markRead = useMarkRead();
  const deleteNotification = useDeleteNotification();
  const [filter, setFilter] = useState<string>('all');

  const handleOpen = (notification: any) => {
    if (!notification.read) {
      markRead.mutate(notification.id);
    }
    navigate(destinationFor(notification));
  };

  const items = notifications || [];
  const unreadCount = items.filter((n: any) => !n.read).length;

  const filteredNotifications = filter === 'all'
    ? items
    : items.filter((n: any) => {
        if (filter === 'bids') return n.type === 'bid';
        if (filter === 'messages') return n.type === 'message';
        if (filter === 'auctions') return n.type === 'auction_ending' || n.type === 'auction_won' || n.type === 'auction_lost';
        return true;
      });

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  const dismissNotification = (id: string) => {
    deleteNotification.mutate(id);
  };

  const formatTime = (timestamp: Date | string) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-4 border-l-red-500';
      case 'medium': return 'border-l-4 border-l-yellow-500';
      case 'low': return 'border-l-4 border-l-blue-500';
      default: return '';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <span className="inline-block w-2 h-2 rounded-full bg-red-500" />;
      case 'medium': return <span className="inline-block w-2 h-2 rounded-full bg-yellow-500" />;
      case 'low': return <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />;
      default: return <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background z-10 border-b">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-xl">Notifications</h1>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="rounded-full">{unreadCount}</Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="text-emerald-600"
            aria-label="Mark all notifications as read"
          >
            <CheckCheck className="w-4 h-4 mr-1" />Mark all read
          </Button>
        </div>

        <div className="px-4 pb-3 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {['all', 'bids', 'messages', 'auctions'].map(f => (
              <Badge
                key={f}
                role="button"
                aria-pressed={filter === f}
                variant={filter === f ? 'default' : 'outline'}
                className={`cursor-pointer whitespace-nowrap capitalize transition-colors duration-150 py-1.5 px-3 ${
                  filter === f
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-slate-100 text-slate-700 border-0 hover:bg-slate-200'
                }`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <NotificationSkeleton key={i} />
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center gap-3">
            <BellOff className="w-10 h-10 text-slate-400" />
            <p className="text-muted-foreground">You're all caught up</p>
          </div>
        ) : (
          filteredNotifications.map((notification: any) => (
            <div
              key={notification.id}
              role="button"
              tabIndex={0}
              onClick={() => handleOpen(notification)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleOpen(notification);
                }
              }}
              className={`bg-card border rounded-xl p-5 transition-all duration-200 hover:shadow-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${getPriorityColor(notification.priority)} ${!notification.read ? 'bg-emerald-50' : ''}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{getPriorityIcon(notification.priority)}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">{notification.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatTime(notification.timestamp ?? notification.created_at)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissNotification(notification.id);
                  }}
                  className="w-11 h-11 flex items-center justify-center text-muted-foreground transition-colors duration-200 hover:text-red-500 shrink-0"
                  aria-label="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
