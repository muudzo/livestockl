# Tawk.to Live Chat Integration — ZimLivestock

## Overview
Free live chat widget for real-time customer support. Helps buyers/sellers get help during auctions, payments, and delivery.

## Why Tawk.to
- **Free forever** — unlimited agents, unlimited chats
- **No npm dependency** — loads via script tag (~50KB async)
- **Mobile-friendly** — responsive widget, works on budget phones
- **Visitor tracking** — see what page users are on
- **Triggers** — auto-greet users on checkout page, post-payment
- **Offline messages** — users can leave messages when you're away
- **Knowledge base** — built-in FAQ system (future)

## Implementation

### Component: `src/app/components/TawkToChat.tsx`
- Loads Tawk.to widget script globally
- Passes authenticated user's name + email to the widget
- Gracefully skips if env vars not configured
- Renders nothing visible — widget manages its own UI

### Integration Point: `src/app/components/Root.tsx`
- `<TawkToChat />` rendered inside Root layout
- Widget appears on all pages as a floating chat bubble

### Environment Variables
```
VITE_TAWKTO_PROPERTY_ID=your-property-id
VITE_TAWKTO_WIDGET_ID=your-widget-id
```

## Setup Steps
1. Sign up at https://www.tawk.to (free)
2. Create a property for "ZimLivestock"
3. Go to Administration → Channels → Chat Widget
4. Copy Property ID and Widget ID from the embed code URL:
   `https://embed.tawk.to/{PROPERTY_ID}/{WIDGET_ID}`
5. Add to `.env.local`:
   ```
   VITE_TAWKTO_PROPERTY_ID=xxxxxxxx
   VITE_TAWKTO_WIDGET_ID=xxxxxxxx
   ```
6. Restart dev server

## Features Available

| Feature | Status | Notes |
|---|---|---|
| Live chat bubble | Ready | Appears bottom-right on all pages |
| User identification | Ready | Auto-sets name + email from auth |
| Offline messages | Built-in | Users can message when you're away |
| Visitor page tracking | Built-in | See what page the user is browsing |
| Chat triggers | Configure in dashboard | Auto-greet on checkout, payment pages |
| Knowledge base / FAQ | Configure in dashboard | Self-service help articles |
| Chat history | Built-in | Full conversation history per visitor |
| Mobile SDK | Not needed | Web widget works on mobile browsers |

## Use Cases for ZimLivestock

1. **Buyer stuck on checkout** → "I can't pay with EcoCash" → live support
2. **Seller listing questions** → "How do I upload a stock card?" → instant help
3. **Payment disputes** → "I paid but status says pending" → check and resolve
4. **Auction questions** → "When does this auction end?" → quick answer
5. **New user onboarding** → Auto-trigger: "Welcome! Need help getting started?"

## Advanced: Tawk.to API (Future)

```typescript
// Hide on certain pages
window.Tawk_API?.hideWidget();

// Show on checkout
window.Tawk_API?.showWidget();

// Open chat automatically
window.Tawk_API?.maximize();

// Set custom attributes for support context
window.Tawk_API?.setAttributes({
  'livestock-id': 'abc123',
  'payment-ref': 'ZL-XYZ',
});
```

## Cost
**Free** — Tawk.to is 100% free with no limits on agents, chats, or history.
