# Testing Instructions for Feed Post Reactions

This document provides step-by-step instructions for testing the feed_post_reactions feature after the migration has been applied.

## Prerequisites

1. The migration `20260323130002_add_feed_post_reactions.sql` must be applied
2. At least two test user accounts in Supabase
3. At least one public feed post created in the `feed_posts` table
4. Access to Supabase SQL Editor or psql console

## Quick Verification Steps

### 1. Verify Table and Schema

Run the following SQL to verify the table was created correctly:

```sql
-- Check table structure
\d public.feed_post_reactions

-- Expected output should show:
-- - id (uuid, primary key)
-- - post_id (uuid, not null, foreign key to feed_posts)
-- - user_id (uuid, not null, foreign key to auth.users)
-- - reaction_type (text, not null, default 'like')
-- - created_at (timestamptz, not null, default now())
-- - unique constraint on (post_id, user_id, reaction_type)
-- - indexes on post_id and user_id
```

### 2. Verify RLS is Enabled

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'feed_post_reactions';

-- Expected: rowsecurity = true
```

### 3. Verify RLS Policies

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'feed_post_reactions';

-- Expected policies:
-- 1. feed_post_reactions_select_public (SELECT)
-- 2. feed_post_reactions_insert_self (INSERT, to authenticated)
-- 3. feed_post_reactions_delete_self (DELETE, to authenticated)
```

## Detailed Functional Testing

### Test 1: Anonymous User Can Read Public Reactions

```sql
SET LOCAL auth.uid TO NULL;

SELECT * FROM public.feed_post_reactions
WHERE post_id IN (
  SELECT id FROM public.feed_posts WHERE visibility = 'public' LIMIT 1
);

-- Expected: Query succeeds (returns reactions if any exist)
```

✅ **Pass**: Query returns results without error
❌ **Fail**: RLS error or permission denied

### Test 2: Anonymous User Cannot Insert Reactions

```sql
SET LOCAL auth.uid TO NULL;

INSERT INTO public.feed_post_reactions (post_id, user_id, reaction_type)
VALUES (
  (SELECT id FROM public.feed_posts WHERE visibility = 'public' LIMIT 1),
  'some-uuid-here',
  'like'
);

-- Expected: ERROR: permission denied for table feed_post_reactions
```

✅ **Pass**: Permission denied error
❌ **Fail**: Insert succeeds

### Test 3: Authenticated User Can Insert Their Own Reaction

Replace `<test-user-uuid>` with a real user UUID from `auth.users`:

```sql
SET LOCAL auth.uid TO '<test-user-uuid>';

INSERT INTO public.feed_post_reactions (post_id, user_id, reaction_type)
VALUES (
  (SELECT id FROM public.feed_posts WHERE visibility = 'public' LIMIT 1),
  '<test-user-uuid>',
  'like'
);

-- Expected: INSERT 0 1
```

✅ **Pass**: Insert succeeds
❌ **Fail**: RLS violation or permission denied

### Test 4: User Cannot React As Someone Else

```sql
SET LOCAL auth.uid TO '<test-user-uuid>';

INSERT INTO public.feed_post_reactions (post_id, user_id, reaction_type)
VALUES (
  (SELECT id FROM public.feed_posts WHERE visibility = 'public' LIMIT 1),
  '<different-user-uuid>',
  'like'
);

-- Expected: ERROR: new row violates row-level security policy
```

✅ **Pass**: RLS policy violation
❌ **Fail**: Insert succeeds

### Test 5: User Can Delete Their Own Reaction

```sql
SET LOCAL auth.uid TO '<test-user-uuid>';

DELETE FROM public.feed_post_reactions
WHERE user_id = '<test-user-uuid>'
  AND post_id = (SELECT id FROM public.feed_posts WHERE visibility = 'public' LIMIT 1)
  AND reaction_type = 'like';

-- Expected: DELETE 1 (if reaction exists)
```

✅ **Pass**: Delete succeeds
❌ **Fail**: Permission denied or RLS violation

### Test 6: User Cannot Delete Someone Else's Reaction

```sql
SET LOCAL auth.uid TO '<test-user-uuid>';

DELETE FROM public.feed_post_reactions
WHERE user_id = '<different-user-uuid>';

-- Expected: DELETE 0 (RLS blocks access, so 0 rows affected)
```

✅ **Pass**: DELETE returns 0 rows affected
❌ **Fail**: DELETE returns >0 or shows permission error

### Test 7: Unique Constraint Prevents Duplicate Reactions

```sql
SET LOCAL auth.uid TO '<test-user-uuid>';

-- First insert (should succeed)
INSERT INTO public.feed_post_reactions (post_id, user_id, reaction_type)
VALUES (
  (SELECT id FROM public.feed_posts WHERE visibility = 'public' LIMIT 1),
  '<test-user-uuid>',
  'like'
);

-- Second insert with same values (should fail)
INSERT INTO public.feed_post_reactions (post_id, user_id, reaction_type)
VALUES (
  (SELECT id FROM public.feed_posts WHERE visibility = 'public' LIMIT 1),
  '<test-user-uuid>',
  'like'
);

-- Expected: ERROR: duplicate key value violates unique constraint "feed_post_reactions_unique"
```

✅ **Pass**: Second insert fails with unique constraint violation
❌ **Fail**: Second insert succeeds

### Test 8: Cascade Delete Works

```sql
-- Create a test post (as postgres or authenticated user)
SET LOCAL ROLE postgres;

INSERT INTO public.feed_posts (created_by, content, visibility)
VALUES (
  '<test-user-uuid>',
  'Test post for cascade delete',
  'public'
)
RETURNING id;
-- Note the returned ID

-- Add a reaction to the test post
SET LOCAL auth.uid TO '<test-user-uuid>';

INSERT INTO public.feed_post_reactions (post_id, user_id, reaction_type)
VALUES ('<test-post-id>', '<test-user-uuid>', 'like');

-- Verify reaction exists
SELECT COUNT(*) FROM public.feed_post_reactions WHERE post_id = '<test-post-id>';
-- Expected: 1

-- Delete the post
DELETE FROM public.feed_posts WHERE id = '<test-post-id>';

-- Verify reaction was cascaded
SET LOCAL ROLE postgres;
SELECT COUNT(*) FROM public.feed_post_reactions WHERE post_id = '<test-post-id>';
-- Expected: 0
```

✅ **Pass**: Reaction is automatically deleted when post is deleted
❌ **Fail**: Reaction remains after post deletion

### Test 9: User Can Only See Reactions for Public Posts

This test validates that the SELECT policy correctly filters reactions based on parent post visibility.

```sql
-- As an authenticated user, try to read all reactions
SET LOCAL auth.uid TO '<test-user-uuid>';

SELECT fpr.*, fp.visibility
FROM public.feed_post_reactions fpr
JOIN public.feed_posts fp ON fp.id = fpr.post_id;

-- Expected: Only reactions for posts with visibility='public' are returned
-- (All posts should be public in MVP, so this should return all reactions)
```

✅ **Pass**: Only public post reactions are returned
❌ **Fail**: Non-public post reactions are visible

## Manual Testing via Supabase Dashboard

If you prefer to test via the Supabase Dashboard:

1. **Navigate to**: Database → Tables → `feed_post_reactions`
2. **Try to insert a row** as an authenticated user (using RLS)
3. **Verify** that you can only insert with your own `user_id`
4. **Try to delete a row** created by someone else
5. **Verify** that the delete only works for your own reactions

## Performance Verification

Check that indexes are being used:

```sql
EXPLAIN ANALYZE
SELECT * FROM public.feed_post_reactions
WHERE post_id = '<some-post-uuid>';

-- Should show Index Scan using feed_post_reactions_post_id_idx
```

```sql
EXPLAIN ANALYZE
SELECT * FROM public.feed_post_reactions
WHERE user_id = '<some-user-uuid>';

-- Should show Index Scan using feed_post_reactions_user_id_idx
```

## Common Issues and Troubleshooting

### Issue: "permission denied for table feed_post_reactions"
- **Cause**: Grants not applied correctly
- **Fix**: Verify grants with:
  ```sql
  SELECT grantee, privilege_type
  FROM information_schema.role_table_grants
  WHERE table_name = 'feed_post_reactions';
  ```

### Issue: "new row violates row-level security policy"
- **Cause**: Trying to insert with incorrect user_id
- **Fix**: Ensure `user_id` matches `auth.uid()`

### Issue: Reactions visible for non-existent posts
- **Cause**: Post was deleted but reactions remain
- **Fix**: This should not happen due to `on delete cascade`

## Acceptance Criteria Checklist

- [ ] Users cannot like as someone else (Test 4 passes)
- [ ] Deleting a post cascades reactions (Test 8 passes)
- [ ] RLS prevents reading reactions for non-visible posts (Test 9 passes)
- [ ] Anonymous users can read reactions but not create them (Tests 1-2 pass)
- [ ] Authenticated users can create and delete only their own reactions (Tests 3, 5, 6 pass)
- [ ] Duplicate reactions are prevented by unique constraint (Test 7 passes)
- [ ] Table structure matches specification
- [ ] All RLS policies are in place
- [ ] Indexes exist on `post_id` and `user_id`
- [ ] TypeScript types are generated and correct

## Additional SQL Test File

For comprehensive automated SQL tests, see:
`supabase/tests/feed_post_reactions_rls_manual_tests.sql`

This file contains all the tests listed above in a runnable SQL format with detailed comments.
