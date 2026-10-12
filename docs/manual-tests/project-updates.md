# Manual test plan — publishing project updates

Covers the "New update" composer on project pages (`NewUpdateButton`), the
`POST /api/projects/[id]/updates` route, follower notifications
(`notify_project_update_published` trigger) and the activity feed entry
(`activity_feed_items` / `get_activity_feed_items`). No schema changes.

## Accounts needed

| Account | Role |
|---|---|
| **Owner** | owns an *approved* project P |
| **Editor** | collaborator on P with role `editor` (Edit → Sharing) |
| **Viewer** | collaborator on P with role `viewer` |
| **Follower** | unrelated user who follows P (Follow button on P) |
| **Stranger** | unrelated logged-in user, not following P |

## 1. Who sees the button

1. Logged out, open `/projects/<P>` → Updates section has **no** "New update" button.
2. As Stranger, Follower and Viewer → **no** button (only people who can edit see it).
3. As Owner and as Editor → **"New update"** button is visible.

## 2. Publish a public update

1. As Owner click **New update** → a dialog opens with the title field focused.
2. Click **Publish update** with empty fields → "Please add a title and some text." and nothing is saved.
3. Enter title "Test public update" and some text, keep **Everyone who can see the project**, publish.
4. Expected:
   - toast "Update published", dialog closes, the update appears at the top of the Updates list with "by <Owner name>";
   - like and comment work on it (same as before).
5. As Follower: bell shows a new notification "New update from <P>" with the title; clicking it opens P.
6. As Follower, `/feed` → "For you" shows the update; "Global" shows it too.
7. Logged out: `/projects/<P>` shows the update; `/feed` global shows it.
8. Owner does **not** get a notification for their own update.

## 3. Publish a members-only update

1. As Editor click **New update**, choose **Project members only**, publish "Test members update".
2. Expected:
   - Owner, Editor and Viewer see it on P with a yellow **Members only** badge;
   - Follower, Stranger and logged-out visitors do **not** see it on P or in `/feed`;
   - Follower gets **no** notification; Owner and Viewer get one only if they also follow P.

## 4. Closing and errors

1. Open the dialog, press **Esc** → closes. Open again, click outside → closes. **Cancel** → closes.
2. While publishing, the buttons are disabled and Esc does nothing.
3. Remove the Editor from Sharing while their dialog is open, then publish → error
   "Only project owners and editors can post updates" is shown in the dialog.

## 5. Other pages

1. Organisation and watchdog pages still show their "New update" placeholder
   ("Publishing updates coming soon!") — only project updates are implemented.
2. The existing update form on `/projects/<P>/edit` still works and lists all updates.
