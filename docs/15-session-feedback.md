# Session Feedback System

## Overview

A scalable, non-intrusive feedback collection system that prompts users for session feedback at optimal moments. Inspired by ChatGPT, Claude, and Intercom — collecting qualitative data without disrupting user flow.

**Target Users:** Authenticated users on all plans
**Feedback Types:** Thumbs, star rating, emoji scale, NPS, open-ended text
**Triggers:** Exit intent, session end, time-based, message count, random sampling, manual

---

## 1. Database Schema (Prisma)

### Location: `prisma/schema.prisma`

```prisma
model FeedbackSession {
  id            String    @id @default(cuid())
  userId        String    @map("user_id")
  sessionId     String    @map("session_id")
  chatId        String?   @map("chat_id")
  aiMessageId   String?   @map("ai_message_id")
  trigger       String    // "exit_intent" | "session_end" | "time_based" | "random" | "manual"
  rating        Int?      // 1-5 star rating
  quality       String?   // "great" | "okay" | "poor"
  thumbs        Boolean?  // true=up, false=down
  npsScore      Int?      // 0-10
  text          String?    // open-ended feedback
  metadata      Json?     // { chatTitle?, messageCount?, sessionDuration?, ... }
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  @@index([userId])
  @@index([sessionId])
  @@index([trigger])
  @@index([createdAt])
  @@map("feedback_sessions")
}

model FeedbackSettings {
  userId          String    @id @map("user_id")
  enabled         Boolean   @default(true)        // opt-out globally
  dailyLimit     Int       @default(3)           // max prompts per 24h
  sessionLimit   Int       @default(5)           // max prompts per session
  lastFeedbackAt DateTime? @map("last_feedback_at")
  lastDismissedAt DateTime? @map("last_dismissed_at")
  dismissedCount Int       @default(0)             // reset after 24h
  updatedAt      DateTime  @updatedAt @map("updated_at")

  @@map("feedback_settings")
}
```

### Migration Command
```bash
npx prisma migrate dev --name add_feedback_tables
```

---

## 2. API Routes

### Location: `app/api/feedback/`

#### `route.ts` — POST + GET

```typescript
// POST /api/feedback — Submit feedback
export async function POST(request: NextRequest) {
  // 1. Validate auth
  // 2. Validate request body (zod schema)
  // 3. Check rate limits (session + daily)
  // 4. Insert into FeedbackSession
  // 5. Update FeedbackSettings.lastFeedbackAt
  // 6. Return { success: true, feedbackId }
}

// GET /api/feedback — Get user's feedback history
export async function GET(request: NextRequest) {
  // 1. Validate auth
  // 2. Query user's feedback with pagination
  // 3. Return { feedback: [...], stats: {...} }
}
```

#### `stats/route.ts` — User stats

```typescript
// GET /api/feedback/stats
{
  totalFeedback: number;
  averageRating: number | null;
  npsScore: number | null;
  thumbsUp: number;
  thumbsDown: number;
  qualityBreakdown: { great: number; okay: number; poor: number };
  recentFeedback: Array<{
    id: string;
    trigger: string;
    rating: number | null;
    quality: string | null;
    thumbs: boolean | null;
    text: string | null;
    createdAt: string;
  }>;
}
```

#### `dismiss/route.ts` — Record dismissal

```typescript
// POST /api/feedback/dismiss
{ trigger: string }
// Increments dismissedCount, sets lastDismissedAt
// Returns { success: true, canShowAgain: boolean }
```

#### `admin/aggregate/route.ts` — Admin aggregate stats

```typescript
// GET /api/feedback/admin/aggregate?trigger=session_end&plan=pro&from=2024-01-01&to=2024-12-31
{
  totalFeedback: number;
  averageRating: number;
  npsScore: number;
  responseRate: number;        // feedback given / prompts shown
  dismissalRate: number;
  qualityBreakdown: { great: number; okay: number; poor: number };
  byTrigger: Record<string, { count: number; avgRating: number }>;
  byPlan: Record<string, { count: number; avgRating: number }>;
  trend: Array<{ date: string; count: number; avgRating: number }>;
}
```

---

## 3. Validation Schemas

### Location: `schemas/validation.ts`

```typescript
import { z } from "zod";

export const feedbackSubmitSchema = z.object({
  sessionId: z.string().min(1),
  chatId: z.string().optional(),
  aiMessageId: z.string().optional(),
  trigger: z.enum(["exit_intent", "session_end", "time_based", "random", "manual"]),
  rating: z.number().int().min(1).max(5).optional(),
  quality: z.enum(["great", "okay", "poor"]).optional(),
  thumbs: z.boolean().optional(),
  npsScore: z.number().int().min(0).max(10).optional(),
  text: z.string().max(2000).optional(),
  metadata: z.record(z.unknown()).optional(),
}).refine(
  (data) => data.rating || data.quality || data.thumbs !== undefined || data.npsScore,
  { message: "At least one of rating, quality, thumbs, or npsScore required" }
);

export type FeedbackSubmitInput = z.infer<typeof feedbackSubmitSchema>;
```

---

## 4. Client-Side Architecture

### Location: `components/feedback/`

#### `FeedbackProvider.tsx`

```typescript
"use client";

interface FeedbackContextValue {
  sessionId: string;
  canShowFeedback: boolean;
  showFeedback: (trigger: TriggerType) => void;
  dismissFeedback: (trigger: TriggerType) => void;
  submitFeedback: (data: FeedbackSubmitInput) => Promise<void>;
  isLoading: boolean;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [sessionId] = useState(() => generateSessionId());
  const [settings, setSettings] = useState<CooldownState | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [currentTrigger, setCurrentTrigger] = useState<TriggerType | null>(null);

  // Fetch user feedback settings on mount
  useEffect(() => {
    fetch('/api/feedback/settings')
      .then(r => r.json())
      .then(setSettings)
      .catch(() => {});
  }, []);

  const canShowFeedback = useMemo(() => {
    if (!settings?.enabled) return false;
    if (settings.lastFeedbackAt && daysSince(settings.lastFeedbackAt) < 7) return false;
    if (settings.lastDismissedAt && daysSince(settings.lastDismissedAt) < 1 && settings.dismissedCount >= 3) return false;
    return true;
  }, [settings]);

  const showFeedback = useCallback((trigger: TriggerType) => {
    if (!canShowFeedback) return;
    setCurrentTrigger(trigger);
    setFeedbackOpen(true);
  }, [canShowFeedback]);

  const dismissFeedback = useCallback(async (trigger: TriggerType) => {
    await fetch('/api/feedback/dismiss', { method: 'POST', body: JSON.stringify({ trigger }) });
    // Optimistically update local state
    setSettings(s => s ? { ...s, dismissedCount: s.dismissedCount + 1, lastDismissedAt: new Date() } : s);
  }, []);

  const submitFeedback = useCallback(async (data: FeedbackSubmitInput) => {
    await fetch('/api/feedback', { method: 'POST', body: JSON.stringify(data) });
    setSettings(s => s ? { ...s, lastFeedbackAt: new Date(), dismissedCount: 0 } : s);
    setFeedbackOpen(false);
  }, []);

  return (
    <FeedbackContext.Provider value={{
      sessionId,
      canShowFeedback,
      showFeedback,
      dismissFeedback,
      submitFeedback,
      isLoading: !settings,
    }}>
      {children}
      <FeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        trigger={currentTrigger}
      />
    </FeedbackContext.Provider>
  );
}
```

#### `FeedbackTrigger.tsx` — Hook-based trigger logic

```typescript
"use client";

// Hook to manage all trigger detection
export function useFeedbackTrigger(options: TriggerOptions) {
  const { showFeedback, dismissFeedback, sessionId } = useFeedback();
  const messageCountRef = useRef(0);
  const sessionStartRef = useRef(Date.now());

  // Exit intent detection
  useEffect(() => {
    if (!options.enableExitIntent) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only trigger if user has had meaningful session
      if (messageCountRef.current < 2) return;
      e.preventDefault();
      showFeedback('exit_intent');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [options.enableExitIntent, showFeedback]);

  // Time-based trigger
  useEffect(() => {
    if (!options.timeBasedMinutes) return;

    const timer = setTimeout(() => {
      if (messageCountRef.current >= options.minMessagesForTimeTrigger ?? 3) {
        showFeedback('time_based');
      }
    }, options.timeBasedMinutes * 60 * 1000);

    return () => clearTimeout(timer);
  }, [options.timeBasedMinutes, options.minMessagesForTimeTrigger]);

  // Track message count
  const onMessage = useCallback(() => {
    messageCountRef.current++;
  }, []);

  return { onMessage };
}

// Hook for "New Chat" interception
export function useNewChatTrigger() {
  const { showFeedback, dismissFeedback } = useFeedback();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const btn = (e.target as Element).closest('[data-action="new-chat"]');
      if (!btn) return;
      if (messageCountRef.current < 3) return; // Need meaningful session

      e.preventDefault();
      showFeedback('session_end');
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [showFeedback]);
}
```

#### `FeedbackDialog.tsx` — Main dialog component

```typescript
"use client";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: TriggerType | null;
}

export function FeedbackDialog({ open, onOpenChange, trigger }: FeedbackDialogProps) {
  const { sessionId, submitFeedback, dismissFeedback } = useFeedback();
  const [rating, setRating] = useState<number | null>(null);
  const [quality, setQuality] = useState<string | null>(null);
  const [thumbs, setThumbs] = useState<boolean | null>(null);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitFeedback({
        sessionId,
        trigger: trigger ?? 'manual',
        rating: rating ?? undefined,
        quality: quality ?? undefined,
        thumbs: thumbs ?? undefined,
        text: text || undefined,
      });
      // Reset form
      setRating(null); setQuality(null); setThumbs(null); setText('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = () => {
    if (trigger) dismissFeedback(trigger);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {trigger === 'exit_intent' ? "Before you go..." : "How was your session?"}
          </DialogTitle>
          <DialogDescription>
            Your feedback helps us improve Eryx
          </DialogDescription>
        </DialogHeader>

        {/* Quality Quick Select */}
        <div className="flex gap-2 justify-center py-4">
          {['great', 'okay', 'poor'].map((q) => (
            <button
              key={q}
              onClick={() => setQuality(q)}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-3 rounded-xl border transition-all",
                quality === q ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
              )}
            >
              <span className="text-xl">
                {q === 'great' ? '😊' : q === 'okay' ? '😐' : '😞'}
              </span>
              <span className="text-xs capitalize">{q}</span>
            </button>
          ))}
        </div>

        {/* Star Rating */}
        <div className="flex gap-1 justify-center py-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star
                className={cn(
                  "h-8 w-8",
                  rating !== null && star <= rating
                    ? "fill-primary text-primary"
                    : "text-muted-foreground/30"
                )}
              />
            </button>
          ))}
        </div>

        {/* Thumbs */}
        <div className="flex gap-4 justify-center py-3">
          <button
            onClick={() => setThumbs(false)}
            className={cn(
              "p-3 rounded-full border transition-all",
              thumbs === false ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
            )}
          >
            <ThumbsDown className="h-6 w-6" />
          </button>
          <button
            onClick={() => setThumbs(true)}
            className={cn(
              "p-3 rounded-full border transition-all",
              thumbs === true ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
            )}
          >
            <ThumbsUp className="h-6 w-6" />
          </button>
        </div>

        {/* Optional Text */}
        <div className="space-y-2">
          <Textarea
            placeholder="Anything you'd like to share? (optional)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            className="min-h-[80px]"
          />
          <p className="text-xs text-muted-foreground text-right">
            {text.length}/2000
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={handleDismiss}>
            Skip
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!rating && !quality && thumbs === null || submitting}
          >
            {submitting ? "Submitting..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

#### `MiniFeedback.tsx` — Compact thumbs-only widget

```typescript
// For quick feedback without modal
export function MiniFeedback({ chatId, onClose }: { chatId: string; onClose: () => void }) {
  const { sessionId, submitFeedback } = useFeedback();
  const [selected, setSelected] = useState<boolean | null>(null);
  const [showText, setShowText] = useState(false);
  const [text, setText] = useState('');

  const handleSelect = async (value: boolean) => {
    setSelected(value);
    await submitFeedback({
      sessionId,
      chatId,
      trigger: 'manual',
      thumbs: value,
    });
    onClose();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-popover border rounded-2xl shadow-lg p-4 w-72">
      <p className="text-sm font-medium mb-3">How was this chat?</p>
      <div className="flex items-center gap-4">
        <button
          onClick={() => handleSelect(false)}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border hover:bg-destructive/10 hover:border-destructive/50 transition-colors"
        >
          <ThumbsDown className="h-4 w-4" />
          <span className="text-sm">Not great</span>
        </button>
        <button
          onClick={() => handleSelect(true)}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border hover:bg-green-500/10 hover:border-green-500/50 transition-colors"
        >
          <ThumbsUp className="h-4 w-4" />
          <span className="text-sm">Great!</span>
        </button>
      </div>
    </div>
  );
}
```

---

## 5. Usage Locations

### In `app/(main)/layout.tsx`

```tsx
// Wrap app with provider
<FeedbackProvider>
  {children}
</FeedbackProvider>
```

### In `ChatInput` component

```tsx
// Track messages for trigger logic
const { onMessage } = useFeedbackTrigger({
  enableExitIntent: true,
  timeBasedMinutes: 10,
  minMessagesForTimeTrigger: 3,
});

// Call onMessage after each AI response
useEffect(() => {
  if (aiResponseComplete) {
    onMessage();
  }
}, [aiResponseComplete, onMessage]);
```

### In "New Chat" button

```tsx
// Button in sidebar or header
<button
  data-action="new-chat"
  onClick={() => router.push('/home')}
>
  New Chat
</button>
```

---

## 6. Random Sampling Implementation

### Location: `lib/feedback.ts`

```typescript
/**
 * Deterministic random sampling based on userId + date
 * Same user won't get sampled differently on refresh
 */
export function shouldSampleSession(userId: string, sampleRate: number = 0.1): boolean {
  const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const input = `${userId}:${dateStr}`;

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  const bucket = Math.abs(hash % 100);
  return bucket < sampleRate * 100;
}

/**
 * Check if user should see feedback prompt based on cooldown rules
 */
export async function canShowFeedbackPrompt(userId: string): Promise<{
  canShow: boolean;
  reason?: string;
}> {
  // Call API to check settings
  const res = await fetch('/api/feedback/settings');
  if (!res.ok) return { canShow: false, reason: 'api_error' };

  const settings = await res.json();

  if (!settings.enabled) {
    return { canShow: false, reason: 'disabled' };
  }

  if (settings.lastFeedbackAt) {
    const daysSince = (Date.now() - new Date(settings.lastFeedbackAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) {
      return { canShow: false, reason: 'recently_submitted' };
    }
  }

  if (settings.dismissedCount >= settings.dailyLimit) {
    return { canShow: false, reason: 'daily_limit_reached' };
  }

  return { canShow: true };
}
```

---

## 7. Session Tracking

### Location: `hooks/useFeedbackSession.ts`

```typescript
"use client";

/**
 * Manages the feedback session ID — persists across the browser session
 * New session ID generated on each full page load (not on client navigation)
 */
export function useFeedbackSession() {
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    // Generate or retrieve persistent session ID
    let id = sessionStorage.getItem('feedback_session_id');
    if (!id) {
      id = generateSessionId();
      sessionStorage.setItem('feedback_session_id', id);
    }
    setSessionId(id);

    // Clear on new day (optional — for day-based sampling)
    const checkDate = setInterval(() => {
      const storedDate = localStorage.getItem('feedback_session_date');
      const today = new Date().toISOString().split('T')[0];
      if (storedDate !== today) {
        id = generateSessionId();
        sessionStorage.setItem('feedback_session_id', id);
        setSessionId(id);
        localStorage.setItem('feedback_session_date', today);
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkDate);
  }, []);

  return sessionId;
}

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

---

## 8. Internationalization

### Location: `messages/en.json`

```json
{
  "feedback": {
    "title": "How was your session?",
    "exitIntentTitle": "Before you go...",
    "description": "Your feedback helps us improve Eryx",
    "quality": {
      "great": "Great",
      "okay": "Okay",
      "poor": "Needs Improvement"
    },
    "thumbsUp": "Great!",
    "thumbsDown": "Not great",
    "placeholder": "Anything you'd like to share? (optional)",
    "submit": "Submit",
    "skip": "Skip",
    "thankYou": "Thanks for your feedback!",
    "errors": {
      "tooManyRequests": "You've given too much feedback today. Try again tomorrow.",
      "generic": "Something went wrong. Please try again."
    }
  }
}
```

---

## 9. Admin Dashboard (Future)

### Location: `app/(admin)/dashboard/feedback/page.tsx`

```tsx
// Admin-only page showing aggregate feedback stats
export default function FeedbackDashboard() {
  // Filters: date range, plan, trigger type
  // Charts: rating trend, NPS trend, response rate
  // Table: recent feedback with search/filter
  // Export: CSV download
}
```

---

## 10. File Structure Summary

```
components/feedback/
  FeedbackProvider.tsx      # Context + session management
  FeedbackDialog.tsx        # Full modal dialog
  MiniFeedback.tsx          # Compact thumbs widget
  FeedbackTrigger.ts        # Trigger logic hooks

hooks/
  useFeedback.ts            # Main context hook (exported)
  useFeedbackSession.ts     # Session ID management
  useFeedbackTrigger.ts     # Trigger detection hooks
  useNewChatTrigger.ts      # New chat button interception

lib/
  feedback.ts               # Sampling, cooldown utilities

app/api/feedback/
  route.ts                 # POST + GET
  settings/route.ts        # GET user settings, PATCH preferences
  dismiss/route.ts          # POST dismissal
  stats/route.ts            # GET user stats
  admin/
    aggregate/route.ts     # GET aggregate stats (admin only)

prisma/
  schema.prisma             # FeedbackSession, FeedbackSettings

messages/
  en.json                   # feedback namespace
  es.json
  fr.json
  ne.json
  hi.json

docs/
  15-session-feedback.md     # This plan
```

---

## 11. Implementation Checklist

### Phase 1: Database & API
- [ ] Add Prisma models
- [ ] Run migration
- [ ] Create POST /api/feedback
- [ ] Create GET /api/feedback (stats)
- [ ] Create POST /api/feedback/dismiss
- [ ] Create GET /api/feedback/settings
- [ ] Add validation schemas
- [ ] Test all endpoints

### Phase 2: Core Client
- [ ] Create FeedbackProvider context
- [ ] Implement session ID generation
- [ ] Create useFeedbackSession hook
- [ ] Implement cooldown checking logic
- [ ] Wire up submitFeedback + dismissFeedback

### Phase 3: Triggers
- [ ] Implement exit intent detection
- [ ] Hook into New Chat button
- [ ] Implement time-based trigger
- [ ] Implement random sampling
- [ ] Test all trigger paths

### Phase 4: UI Components
- [ ] Build FeedbackDialog
- [ ] Add quality quick-select
- [ ] Add star rating
- [ ] Add thumbs buttons
- [ ] Add optional text field
- [ ] Build MiniFeedback widget
- [ ] Add i18n strings

### Phase 5: Integration
- [ ] Add FeedbackProvider to layout
- [ ] Integrate with chat message tracking
- [ ] Integrate with New Chat button
- [ ] Test end-to-end flow
- [ ] Add to settings page (opt-out toggle)

### Phase 6: Polish
- [ ] Add loading states
- [ ] Add error handling + toasts
- [ ] Ensure dark mode works
- [ ] Test accessibility
- [ ] Add to admin dashboard
