# Notifications for Reactions and Comments - Verification Guide

## Overview
This implementation adds automatic notifications for post authors when users like or comment on their posts.

## Security Features

### 1. No Client-Side Spoofing
- **No INSERT grant**: The `notifications` table does not have INSERT privileges for `authenticated` users
- **Admin-only function**: The `create_notification()` function checks `is_admin()` before allowing inserts
- **Trigger-based creation**: Notifications are created automatically via SECURITY DEFINER trigger functions that run with elevated privileges
- **RLS enforcement**: Row-Level Security ensures users can only read their own notifications

### 2. Trigger Functions (SECURITY DEFINER)
Two new trigger functions were created:

#### `notify_post_author_on_comment()`
- Triggers on INSERT to `feed_post_comments`
- Creates notification for post author when someone comments
- Skips notification if author comments on their own post
- Includes commenter name (user or organisation) in notification title
- Includes post preview in notification body

#### `notify_post_author_on_reaction()`
- Triggers on INSERT to `feed_post_reactions`
- Creates notification for post author when someone reacts
- Skips notification if author reacts to their own post
- Includes reactor name in notification title
- Includes post preview in notification body

### 3. RLS Policies Verification

From migration `20260301090000_notifications.sql`:

```sql
-- Users can only SELECT their own notifications
create policy notifications_select_own
  on public.notifications
  for select
  to authenticated
  using (user_id = auth.uid());

-- Users can only UPDATE their own notifications (mark as read)
create policy notifications_update_own
  on public.notifications
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

**No INSERT or DELETE policies exist for authenticated users**, preventing direct manipulation.

## Acceptance Criteria

### ✅ Like/comment creates notifications for author
- When user A comments on user B's post → user B gets a notification
- When user A likes user B's post → user B gets a notification
- Notification includes:
  - Actor name (commenter/reactor)
  - Post preview (first 50 characters)
  - Link to the post (`/feed?post=<post-id>`)
  - Metadata (post_id, comment_id/reaction_id, actor_id)

### ✅ Cannot forge notifications from client
- Direct INSERT to `notifications` table fails (no grant)
- RLS prevents reading other users' notifications
- Only SECURITY DEFINER functions can insert notifications
- Triggers validate relationships (post existence, author identity)

### ✅ No self-notifications
- Authors don't get notified when commenting on their own posts
- Authors don't get notified when liking their own posts

### ✅ Dual identity support
- When commenting as an organisation, notification shows org name
- When commenting as a user, notification shows user's full name or email prefix

## Testing

Run the manual tests in:
```
supabase/tests/notifications_triggers_manual_tests.sql
```

### Test Cases Include:
1. Comment on another user's post → notification created
2. Self-comment → no notification
3. Like another user's post → notification created
4. Self-like → no notification
5. RLS verification → cannot read others' notifications
6. Spoofing attempt → INSERT denied
7. Metadata validation → all fields populated correctly
8. Organisation comments → org name in notification
9. Cascade behavior → notifications persist after comment/reaction deletion
10. Post deletion → notifications persist (no cascade)

## Frontend Integration

Updated `src/app/notifications/NotificationsClient.tsx`:
- Added fallback bodies for `feed_post_comment` and `feed_post_reaction` types
- Notifications link to posts via `/feed?post=<post-id>`

## Database Changes

### New Migration: `20260324120003_notifications_for_reactions_comments.sql`

Created:
- `notify_post_author_on_comment()` - Trigger function for comments
- `notify_post_author_on_reaction()` - Trigger function for reactions
- Triggers on `feed_post_comments` and `feed_post_reactions` tables

## Future Enhancements (Optional)

### Mentions Support
To implement @mentions in posts/comments:

1. **Create mentions table**:
```sql
create table public.feed_post_mentions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.feed_posts(id) on delete cascade,
  comment_id uuid references public.feed_post_comments(id) on delete cascade,
  mentioned_user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
```

2. **Parse content for @mentions**:
- Extract usernames/emails from post/comment content
- Lookup users in `auth.users` or `profiles` table
- Insert into `feed_post_mentions` table

3. **Create notification trigger**:
- Trigger on INSERT to `feed_post_mentions`
- Create notification for mentioned user
- Include mention context in notification

**Note**: This requires a reliable way to identify users (username system or email lookup).

## Verification Steps

1. **Merge PR to main**:
   - The CI workflow will automatically apply migrations to production
   - Database types will be regenerated automatically via GitHub Actions
   - See `.github/workflows/supabase-db-auto.yml`

2. **Or test locally** (if Supabase is running):
   ```bash
   pnpm supabase db reset  # Apply all migrations from scratch
   pnpm sb:types           # Regenerate types (requires linked project)
   ```

3. **Run manual tests**:
   - Open Supabase SQL editor
   - Run tests from `supabase/tests/notifications_triggers_manual_tests.sql`
   - Verify all assertions pass

4. **Test in application**:
   - Create a post as user A
   - Comment/like as user B
   - Check user A's notifications page
   - Verify notification appears with correct content
   - Verify clicking notification navigates to post

## Security Audit

### Potential Attack Vectors (All Blocked):
1. ❌ **Direct INSERT**: No grant to authenticated users
2. ❌ **RLS bypass**: Triggers run as SECURITY DEFINER with proper validation
3. ❌ **Read others' notifications**: RLS policy blocks with `user_id = auth.uid()`
4. ❌ **Fake notifications via API**: `create_notification()` checks `is_admin()`
5. ❌ **SQL injection**: All inputs are parameterized in plpgsql

### Verified Safe:
- ✅ Notifications cannot be forged by clients
- ✅ Users can only read their own notifications
- ✅ Triggers validate post existence and author identity
- ✅ No privilege escalation possible
- ✅ Self-notifications prevented by explicit checks
