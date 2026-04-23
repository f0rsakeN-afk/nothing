# Future Improvements

This document outlines planned improvements and features to be implemented.

## Completed Features

### Cookie Consent Manager ✅
- Banner on first visit with Accept/Reject/Preferences options
- 3 categories: Analytics, Personalization, Marketing
- Persisted via cookies + localStorage
- Settings page has dedicated Cookies section
- API endpoint for audit logging (logs to server)

**Hooks:**
- `useCookieConsent()` - Main context provider hook
- `useCookieCategory(category)` - Check if category is allowed
- `useAnalytics()` - Only tracks if analytics consent given
- `usePersonalization()` - Only uses storage if personalization consent given

**Components:**
- `<CookieConsentBanner />` - Banner UI
- `<ConsentGate category="...">` - Conditional render based on consent
- `<CookieScript category="..." src="..." />` - Conditional script loading

**GDPR Consideration:** The current API just logs consent. For full compliance, consider:
- Adding a `CookieConsentLog` model to track consent history
- Storing consent timestamp and version
- Providing data export/deletion for cookie data

---

## Data Export (Priority: High)

### Async Export with S3

**Current State:**
- Export runs synchronously, generating ZIP in-memory
- Returns immediately to browser via streaming response
- Works fine for users with <100 chats

**Problems at Scale:**
- Users with 1000+ chats can cause:
  - HTTP timeout (request takes too long)
  - Memory exhaustion on server
  - Poor UX (no progress indication)

**Proposed Solution:**
1. User clicks "Export Data"
2. Server immediately returns `{ status: "processing", jobId: "xxx" }`
3. Background job (Bull queue + Redis or AWS SQS) generates ZIP
4. ZIP uploaded to S3 with presigned URL
5. User polls `/api/settings/export/status?jobId=xxx` or receives email
6. Once ready, user downloads via S3 presigned URL

**Implementation Steps:**
1. Create `jobs` table to track export jobs
2. Add `/api/settings/export` POST endpoint to create job
3. Add `/api/settings/export/status?jobId=xxx` GET endpoint
4. Create background worker using Bull/BullMQ
5. Integrate AWS S3 SDK for storage
6. Generate presigned URLs with 24hr expiry
7. Send email notification via SendGrid/SES when ready
8. Update frontend to show progress and handle async flow

**S3 Configuration:**
```typescript
// Estimated costs for 1000 users/month
// Assuming avg 10MB export per user
// Storage: 10GB = ~$0.23/month
// GET requests: 1000 = ~$0.01/month
// Data transfer: 10GB = ~$0.90/month
```

**Files to Modify:**
- `app/api/settings/export/route.ts` - Split into sync + async
- `app/api/settings/export/status/route.ts` - New endpoint
- `services/export.service.ts` - New service for export logic
- `workers/export.worker.ts` - New Bull queue worker
- `prisma/schema.prisma` - Add Job model
- `components/main/settings/sections/privacy.tsx` - Update UI

**Email Template:**
- Subject: "Your Eryx data export is ready"
- Body: Link to download (presigned URL)
- Expiry: 7 days

---

## Other Planned Improvements

### Performance
- [ ] Implement Redis caching for frequently accessed data
- [ ] Add database connection pooling
- [ ] Optimize Prisma queries with select + include
- [ ] Add CDN for static assets

### Security
- [ ] Rate limiting on API endpoints
- [ ] Implement CSRF protection
- [ ] Add audit logging for sensitive operations
- [ ] Two-factor authentication (2FA)

### Features
- [ ] Collaborative chat (share with team)
- [ ] Chat folders/categories
- [ ] Advanced search with filters
- [ ] Keyboard shortcuts
- [ ] Dark/light mode themes
- [ ] Mobile app (React Native or PWA)

### Monitoring
- [ ] Add Sentry for error tracking
- [ ] Set up Prometheus metrics
- [ ] Create Grafana dashboards
- [ ] Alerting for errors/latency

---

*Last Updated: 2026-04-23*
