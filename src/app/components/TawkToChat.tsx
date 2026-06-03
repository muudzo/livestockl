import { useEffect } from "react";
import { useAuthStore } from "../../stores/authStore";

/**
 * Tawk.to Live Chat Widget
 *
 * Embeds Tawk.to chat widget globally. Automatically sets visitor name
 * and email from the authenticated user's profile.
 *
 * To get your Property ID and Widget ID:
 * 1. Sign up at https://www.tawk.to (free)
 * 2. Go to Administration → Channels → Chat Widget
 * 3. Copy the Property ID and Widget ID from the embed code
 * 4. Set them as env vars: VITE_TAWKTO_PROPERTY_ID and VITE_TAWKTO_WIDGET_ID
 */

declare global {
  interface Window {
    Tawk_API?: {
      setAttributes?: (attrs: Record<string, string>, cb?: (err: any) => void) => void;
      hideWidget?: () => void;
      showWidget?: () => void;
      maximize?: () => void;
      minimize?: () => void;
      toggle?: () => void;
      onLoad?: () => void;
    };
    Tawk_LoadStart?: Date;
  }
}

export function TawkToChat() {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const propertyId = import.meta.env.VITE_TAWKTO_PROPERTY_ID;
    const widgetId = import.meta.env.VITE_TAWKTO_WIDGET_ID;

    if (!propertyId || !widgetId) {
      console.log("Tawk.to: not configured (set VITE_TAWKTO_PROPERTY_ID and VITE_TAWKTO_WIDGET_ID)");
      return;
    }

    // Don't inject twice
    if (document.getElementById("tawkto-script")) return;

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    // Set user attributes when widget loads
    window.Tawk_API.onLoad = () => {
      if (user && window.Tawk_API?.setAttributes) {
        window.Tawk_API.setAttributes({
          name: user.first_name
            ? `${user.first_name} ${user.last_name || ''}`
            : user.email || 'Visitor',
          email: user.email || '',
          // Custom attributes for support context
          ...(user.phone && { phone: user.phone }),
        });
      }
    };

    const script = document.createElement("script");
    script.id = "tawkto-script";
    script.async = true;
    script.src = `https://embed.tawk.to/${propertyId}/${widgetId}`;
    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");
    document.head.appendChild(script);

    return () => {
      // Cleanup on unmount (unlikely for global widget, but good practice)
      const el = document.getElementById("tawkto-script");
      if (el) el.remove();
    };
  }, [user]);

  // Update user attributes when auth state changes
  useEffect(() => {
    if (user && window.Tawk_API?.setAttributes) {
      window.Tawk_API.setAttributes({
        name: user.first_name
          ? `${user.first_name} ${user.last_name || ''}`
          : user.email || 'Visitor',
        email: user.email || '',
      });
    }
  }, [user]);

  return null; // No visible UI — the widget renders itself
}
