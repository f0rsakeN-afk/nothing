# Real-Time Sync & Push Notifications

## Overview

The app supports real-time updates across multiple devices using SSE (Server-Sent Events) and Web Push Notifications.

## Real-Time Architecture

```
Device A (Phone)                    Device B (Laptop)
     │                                  │
     ▼                                  ▼
POST /api/chats/:id/messages    SSE /api/chats/stream
     │                                  │
     └──────────┬───────────────────────┘
                ▼
         Redis Pub/Sub
         (chat:{id}:events)
                │
                ▼
         All connected devices receive event
```

## SSE Endpoints

### Chat List Stream
```
GET /api/chats/stream
```
Real-time updates for:
- New chats created
- Chat renamed
- Chat archived/deleted
- Sidebar refresh needed

### Chat Stream
```
GET /api/chats/:id/stream
```
Real-time updates for:
- New messages
- Message edits

### Notifications Stream
```
GET /api/notifications/stream
```
Real-time updates for:
- New notifications
- Notification read/unread changes

## SSE Event Types

### Chat List Events (`/api/chats/stream`)

```typescript
// New chat created
{ type: "chat:created", chat: { id, title, createdAt } }

// Chat renamed
{ type: "chat:renamed", chatId, title }

// Chat archived
{ type: "chat:archived", chatId }

// Chat deleted
{ type: "chat:deleted", chatId }

// Sidebar needs refresh
{ type: "sidebar:update", action: "refresh" }
```

### Chat Events (`/api/chats/:id/stream`)

```typescript
// New message
{ type: "chat:message:new", chatId, message: { id, role, content, createdAt } }
```

### Notification Events (`/api/notifications/stream`)

```typescript
// Connected
{ type: "connected", userId }

// New notification
{ type: "notification:created", notification: { id, title, description, ... } }

// Notification updated
{ type: "notification:updated", id, read, archived, snoozed }

// Bulk action
{ type: "notifications:bulk", action: "read-all" }
```

## Client-Side Usage

### React Hooks (Recommended)

The codebase provides typed React hooks for SSE subscriptions with automatic reconnection.

#### Chat List Updates

```typescript
import { useChatEvents } from "@/hooks/useChatEvents";

// In your chat list component
function ChatSidebar() {
  useChatEvents();
  // Automatically receives: chat:created, chat:renamed, chat:deleted, chat:archived
  // Updates React Query cache directly
}
```

#### Chat Message Stream (when viewing a chat)

```typescript
import { useChatStream } from "@/hooks/useChatStream";

function ChatView({ chatId }: { chatId: string }) {
  useChatStream({
    chatId,
    onNewMessage: (message) => {
      // Cross-device sync: receive messages from other devices
      // Note: Your own messages are handled locally via streaming
    }
  });
}
```

#### Notification Stream

```typescript
import { useNotificationStream } from "@/hooks/useNotificationStream";
import { toast } from "sonner"; // or your toast library

function NotificationProvider() {
  useNotificationStream({
    onNewNotification: (notification) => {
      toast(notification.title, {
        description: notification.description,
      });
    },
    onBulkUpdate: (action) => {
      if (action === "read-all") {
        // Refresh notification badge
      }
    }
  });
}
```

### Raw EventSource API

If you prefer manual control or aren't using React:

#### Chat List Real-Time

```typescript
// Subscribe to chat list updates
const eventSource = new EventSource('/api/chats/stream');

eventSource.addEventListener('chat:created', (e) => {
  const chat = JSON.parse(e.data).chat;
  // Add to chat list UI
});

eventSource.addEventListener('chat:renamed', (e) => {
  const { chatId, title } = JSON.parse(e.data);
  // Update chat title in list
});

eventSource.addEventListener('chat:deleted', (e) => {
  const { chatId } = JSON.parse(e.data);
  // Remove from chat list
});
```

#### Chat Real-Time (when viewing a chat)

```typescript
const chatId = '123';
const eventSource = new EventSource(`/api/chats/${chatId}/stream`);

eventSource.addEventListener('chat:message:new', (e) => {
  const { message } = JSON.parse(e.data);
  // Append message to chat UI
});
```

#### Notification Real-Time

```typescript
const eventSource = new EventSource('/api/notifications/stream');

eventSource.addEventListener('notification:created', (e) => {
  const { notification } = JSON.parse(e.data);
  // Show toast notification
  // Update notification badge count
});
```

## Automatic Reconnection

SSE handles reconnection automatically. The client should:

```typescript
// Browser handles reconnection automatically for SSE
// But you should handle connection state

let eventSource;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

function connect() {
  eventSource = new EventSource('/api/chats/stream');

  eventSource.onopen = () => {
    reconnectAttempts = 0;
  };

  eventSource.onerror = () => {
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      setTimeout(connect, 1000 * reconnectAttempts);
    }
  };
}
```

---

## Push Notifications

Web Push notifications work even when the user isn't on the app.

### Setup

1. Generate VAPID keys:
```bash
npx web-push generate-vapid-keys
```

2. Add to environment:
```env
VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
VAPID_SUBJECT=mailto:notify@yourdomain.com
```

### Client Subscription

```typescript
async function subscribeToPush() {
  // Check if push is supported
  if (!('Notification' in window) || !('PushManager' in window)) {
    console.log('Push not supported');
    return;
  }

  // Request permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.log('Notification permission denied');
    return;
  }

  // Get VAPID public key
  const { publicKey } = await fetch('/api/push').then(r => r.json());

  // Subscribe
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey)
  });

  // Send to server
  await fetch('/api/push', {
    method: 'POST',
    body: JSON.stringify({ subscription }),
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### Server-Sent Notifications

Notifications are triggered by:

1. **New message in chat** (when user not viewing that chat)
2. **AI response completed**
3. **Credits low**
4. **Subscription changes**

```typescript
// Example: Notify user of new message
import { notifyNewMessage } from "@/services/push-notification.service";

await notifyNewMessage(
  userId,
  chatId,
  messagePreview,
  senderName
);
```

---

## Redis Pub/Sub Channels

| Channel | Purpose |
|---------|---------|
| `sidebar:{userId}` | Chat list updates for a user |
| `chat:{chatId}` | Message updates for a specific chat |
| `notifications:{userId}` | Notification updates |

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────┐
│                      Client Devices                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │   SSE    │  │   SSE    │  │   SSE    │  (connections) │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘               │
└───────┼─────────────┼─────────────┼──────────────────────┘
        │             │             │
        └─────────────┼─────────────┘
                      ▼
            ┌─────────────────┐
            │  Redis Pub/Sub  │
            └────────┬────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │ Next.js  │ │  Worker  │ │  Worker  │
  │   API    │ │ (Webhook)│ │(Summarize│
  └──────────┘ └──────────┘ └──────────┘
```

---

## Testing

### Test SSE
```bash
# Connect to chat stream
curl -N -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/chats/stream
```

### Test Push Notifications
```bash
# Get VAPID key
curl http://localhost:3000/api/push
```
