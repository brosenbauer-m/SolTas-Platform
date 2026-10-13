# Organisation & User Signup Manual Tests

This document provides comprehensive manual testing procedures for user and organisation signup flows, including email confirmation, visibility rules, and Row Level Security (RLS) validation.

## Prerequisites

1. Application running locally or on staging environment
2. Clean database state or ability to create new test accounts
3. Access to email inbox for confirmation testing (use temporary email service or test email account)
4. Multiple browser windows/incognito tabs for testing different user states
5. Admin access for verification status testing

## Test Accounts Needed

- **Unauthenticated visitor**: Logged out browser session
- **New individual user**: Fresh account for signup testing
- **New organisation creator**: Fresh account for org signup testing
- **Admin user**: Account with admin privileges for verification testing

---

## Test 1: Individual Signup Flow

**Objective**: Verify individual users can successfully sign up and create a profile

**Steps**:
1. Navigate to `/signup`
2. Verify signup form displays with two tabs: "Individual" and "Organisation"
3. Ensure "Individual" tab is selected by default
4. Fill in the individual signup form:
   - First name: `Test`
   - Last name: `User`
   - Email: `testuser+individual@example.com` (use unique email)
   - Password: `SecurePass123!`
   - Date of birth: Select a valid date (e.g., `1990-01-01`)
   - Organisation: Select "Independent / No organisation"
   - Country from: Leave blank (optional)
   - Country based: Select any country (e.g., `United States`)
   - Occupation: `Software Tester` (optional)
   - Bio: Leave blank (optional)
   - Avatar URL: Leave blank (optional)
   - Social links: Leave blank (optional)
5. Click "Create account" button
6. Verify you receive a confirmation message about checking email
7. Check email inbox for confirmation email
8. Verify email contains:
   - Welcome/confirmation message
   - Confirmation link
   - Link format: `/auth/callback?code=...`
9. Click confirmation link in email
10. Verify redirect to application (typically `/projects` or home page)
11. Verify user is now logged in (check for profile menu/avatar in header)
12. Navigate to user profile page
13. Verify profile shows entered information:
    - First name: `Test`
    - Last name: `User`
    - Organisation: "Independent" or blank
    - Country: Selected country
    - Occupation: `Software Tester`

**Expected Result**:
- ✓ Signup form accepts all valid inputs
- ✓ Account created successfully
- ✓ Confirmation email sent and received
- ✓ Email confirmation link works
- ✓ User can log in after confirmation
- ✓ Profile data persists correctly
- ✓ No errors in browser console

**Database Validation**:
```sql
-- Verify user created in auth.users
SELECT id, email, email_confirmed_at FROM auth.users
WHERE email = 'testuser+individual@example.com';

-- Verify profile created in profiles table
SELECT id, first_name, last_name, organisation_id, country_based
FROM profiles
WHERE id = (SELECT id FROM auth.users WHERE email = 'testuser+individual@example.com');
```

---

## Test 2: Individual Signup with Verified Organisation

**Objective**: Verify individual users can select a verified organisation during signup

**Prerequisites**: At least one verified organisation exists in the database

**Steps**:
1. Navigate to `/signup`
2. Select "Individual" tab
3. Fill in basic information (first name, last name, email, password, date of birth)
4. Click the "Organisation" dropdown
5. Verify dropdown shows:
   - "Independent / No organisation" option
   - List of verified organisations (if any exist)
6. Select a verified organisation from the dropdown
7. Complete remaining fields (country, etc.)
8. Click "Create account"
9. Complete email confirmation flow
10. Navigate to user profile
11. Verify selected organisation appears on profile

**Expected Result**:
- ✓ Dropdown shows "Independent" option first
- ✓ Verified organisations appear in dropdown
- ✓ User can select and save organisation affiliation
- ✓ Selected organisation stored in profile

**Database Validation**:
```sql
-- Verify only verified organisations appear in dropdown view
SELECT id, name, verification_status FROM verified_organisations;

-- Verify user's organisation_id matches selected org
SELECT p.organisation_id, o.name
FROM profiles p
JOIN organisations o ON p.organisation_id = o.id
WHERE p.id = (SELECT id FROM auth.users WHERE email = 'testuser+withorg@example.com');
```

---

## Test 3: Organisation Signup with Email Confirmation (Pending Flow)

**Objective**: Verify organisation signup works with email confirmation and creates pending organisation

**Steps**:
1. Navigate to `/signup`
2. Click "Organisation" tab
3. Fill in organisation signup form:
   - Email: `testorg+pending@example.com` (use unique email)
   - Password: `SecurePass123!`
   - Organisation name: `Test Pending Org`
   - Country based: Select any country (e.g., `Canada`)
   - Existing since: Leave blank (optional)
   - Website: `https://testpendingorg.example.com` (optional)
   - Logo URL: Leave blank (optional)
   - What we do: `We are testing the pending organisation signup flow with email confirmation.`
   - Social links: Leave blank (optional)
4. Click "Create account" button
5. Verify message appears: "Please check your email to confirm your account"
6. **Do NOT navigate away** - verify pending org data saved to localStorage
7. Open browser DevTools → Application → Local Storage
8. Verify `pendingOrgData` key contains the form data
9. Check email inbox for confirmation email
10. Click confirmation link in email
11. Verify redirect to `/auth/callback` then to `/onboarding/organisation`
12. Verify onboarding page shows:
    - Pre-filled organisation information from localStorage
    - Message indicating account confirmed
13. Verify organisation name field shows: `Test Pending Org`
14. Click "Complete Setup" or final confirmation button
15. Verify redirect to organisation page (e.g., `/organisations/[id]`)
16. Verify organisation page shows:
    - Organisation name: `Test Pending Org`
    - Country: Selected country
    - Description: Entered "what we do" text
    - Website link (if provided)
17. Verify user is logged in as organisation owner

**Expected Result**:
- ✓ Form accepts organisation details
- ✓ Pending data saved to localStorage
- ✓ Confirmation email sent
- ✓ Confirmation link redirects to onboarding
- ✓ Onboarding page retrieves pending data
- ✓ Organisation created after onboarding completion
- ✓ User becomes organisation owner/admin
- ✓ No errors during entire flow

**Database Validation**:
```sql
-- Verify organisation created with pending status
SELECT id, name, verification_status, created_by
FROM organisations
WHERE name = 'Test Pending Org';
-- Expected: verification_status = 'pending'

-- Verify user is organisation owner
SELECT role, user_id, organisation_id
FROM organisation_members
WHERE organisation_id = (SELECT id FROM organisations WHERE name = 'Test Pending Org');
-- Expected: role = 'owner'

-- Verify user profile created
SELECT id, first_name, last_name FROM profiles
WHERE id = (SELECT id FROM auth.users WHERE email = 'testorg+pending@example.com');
```

---

## Test 4: Organisation Signup with Immediate Session (Rare Case)

**Objective**: Verify organisation signup handles immediate session creation without email confirmation

**Note**: This flow is rare and depends on Supabase configuration. Email confirmation is typically required.

**Steps** (if email confirmation disabled in Supabase):
1. Navigate to `/signup`
2. Click "Organisation" tab
3. Fill in organisation signup form with unique email (e.g., `testorg+immediate@example.com`)
4. Complete all required fields (organisation name, country, what we do)
5. Click "Create account"
6. **If immediate session granted** (no email confirmation required):
   - Verify immediate redirect to organisation page
   - Verify user logged in automatically
   - Verify organisation created
7. Navigate to organisation page
8. Verify all entered data displayed correctly

**Expected Result** (if applicable):
- ✓ Account created immediately
- ✓ No email confirmation step
- ✓ User logged in automatically
- ✓ Organisation created with pending status
- ✓ User is organisation owner

**Alternative**: If email confirmation always required (expected):
- ✓ Email confirmation flow triggers (same as Test 3)
- ✓ Immediate session NOT granted
- ✓ User must verify email first

**Database Validation**:
```sql
-- Check if email_confirmed_at is set immediately
SELECT email, email_confirmed_at FROM auth.users
WHERE email = 'testorg+immediate@example.com';
-- If immediate: email_confirmed_at should be set
-- If confirmation required: email_confirmed_at should be null until confirmed
```

---

## Test 5: Pending Organisation Visibility to Creator

**Objective**: Verify organisation creator can see their pending organisation but public cannot

**Prerequisites**: Pending organisation created from Test 3 or Test 4

**Steps**:

### Part A: Logged in as Creator
1. Log in as the user who created the pending organisation
2. Navigate to `/organisations`
3. Check if "Test Pending Org" appears in:
   - Globe view markers
   - Table view listings
   - Search results
4. Navigate directly to organisation page: `/organisations/[slug]` or `/organisations/[id]`
5. Verify organisation page displays:
   - Organisation name
   - All entered information
   - Badge/indicator showing "Pending verification" status
6. Verify creator can:
   - View organisation details
   - Edit organisation (if permissions allow)
   - See "Pending" or "Awaiting verification" status

### Part B: Logged out (Public View)
1. Log out of the application
2. Navigate to `/organisations`
3. Verify "Test Pending Org" does NOT appear in:
   - Globe view
   - Table view
   - Search results
   - Organisation directory
4. Attempt to navigate directly to organisation URL: `/organisations/[slug]`
5. Verify access denied or 404 error (organisation not visible)

### Part C: Logged in as Different User
1. Log in as a different user (not creator, not admin)
2. Navigate to `/organisations`
3. Verify "Test Pending Org" does NOT appear in listings
4. Attempt direct navigation to organisation page
5. Verify access denied (only creator and admins can view)

**Expected Result**:
- ✓ Creator can view their pending organisation
- ✓ Creator sees verification status indicator
- ✓ Public cannot see pending organisation
- ✓ Other logged-in users cannot see pending organisation
- ✓ RLS policies enforce visibility rules

**Database/RLS Validation**:
```sql
-- As creator (using their auth.uid())
-- Should return the pending organisation
SELECT id, name, verification_status FROM organisations
WHERE created_by = auth.uid() AND verification_status = 'pending';

-- As public (logged out) or other user
-- Should return empty result
SELECT id, name FROM organisations
WHERE verification_status = 'pending';
-- Expected: Empty (RLS blocks pending orgs except to creator/admin)

-- Verify verified_organisations view excludes pending
SELECT id, name FROM verified_organisations
WHERE name = 'Test Pending Org';
-- Expected: Empty (only verified orgs in this view)
```

---

## Test 6: Public Directory Only Shows Verified Organisations

**Objective**: Verify public organisation directory displays only verified organisations

**Prerequisites**:
- At least one verified organisation exists
- At least one pending organisation exists (from previous tests)

**Steps**:

### Part A: Directory Listings
1. Log out (test as unauthenticated user)
2. Navigate to `/organisations`
3. Observe organisations shown in directory:
   - Globe view markers
   - Table view listings
4. Verify all displayed organisations have "Verified" status
5. Verify no pending or rejected organisations appear
6. Test search functionality:
   - Search for pending organisation name
   - Verify it does NOT appear in results
7. Test filters:
   - Apply country filter
   - Apply thematic area filter
   - Verify only verified organisations appear

### Part B: Verified Organisations View
1. Verify dropdown in individual signup uses `verified_organisations` view
2. Navigate to `/signup` → Individual tab
3. Check "Organisation" dropdown
4. Verify only verified organisations appear in dropdown
5. Verify pending organisation does NOT appear in dropdown

### Part C: Direct Access Attempt
1. While logged out, attempt to access pending organisation directly
2. Navigate to `/organisations/[pending-org-slug]`
3. Verify access denied or 404 response
4. Check browser console for errors
5. Verify no data leakage about pending organisation

**Expected Result**:
- ✓ Only verified organisations appear in public directory
- ✓ Pending organisations hidden from public
- ✓ Rejected organisations hidden from public
- ✓ Search and filters respect verification status
- ✓ Direct access to pending orgs blocked for public
- ✓ No data leakage about pending/rejected orgs

**Database/RLS Validation**:
```sql
-- Verify verified_organisations view shows only verified
SELECT id, name, verification_status FROM verified_organisations;
-- Expected: All rows have verification_status = 'verified'

-- Verify organisations_directory_v1 view respects RLS
SELECT id, name FROM organisations_directory_v1;
-- Expected: Only verified organisations returned when accessed by public

-- Verify pending organisations exist but are hidden
SELECT COUNT(*) FROM organisations WHERE verification_status = 'pending';
-- Expected: Count > 0 (pending orgs exist)

SELECT COUNT(*) FROM verified_organisations;
-- Expected: Count < total organisations (pending/rejected excluded)
```

---

## Test 7: RLS Sanity Checks - Organisations Table

**Objective**: Validate Row Level Security policies for organisations table across different user roles

**Prerequisites**:
- Admin account with is_admin() = true
- Pending organisation created by test user
- Verified organisation in database

**Test Matrix**:

### Scenario A: SELECT - Logged Out User

**Steps**:
1. Log out completely
2. Navigate to `/organisations`
3. Observe organisations displayed

**Expected**:
- ✓ Can see verified organisations
- ✗ Cannot see pending organisations
- ✗ Cannot see rejected organisations

**SQL Validation** (via RLS):
```sql
-- As logged out user
SELECT id, name, verification_status FROM organisations;
-- Expected: Only verification_status = 'verified'
```

### Scenario B: SELECT - Organisation Creator

**Steps**:
1. Log in as user who created pending organisation
2. Navigate to `/organisations`
3. Check what organisations are visible

**Expected**:
- ✓ Can see verified organisations
- ✓ Can see own pending organisation
- ✗ Cannot see other users' pending organisations

**SQL Validation**:
```sql
-- As creator
SELECT id, name, verification_status, created_by FROM organisations
WHERE created_by = auth.uid() OR verification_status = 'verified';
-- Expected: Own pending org + all verified orgs
```

### Scenario C: SELECT - Admin User

**Steps**:
1. Log in as admin user
2. Navigate to `/organisations` or admin panel
3. Check visible organisations

**Expected**:
- ✓ Can see all organisations (verified, pending, rejected)
- ✓ Full access to all organisation records

**SQL Validation**:
```sql
-- As admin
SELECT id, name, verification_status FROM organisations;
-- Expected: All organisations regardless of status
```

### Scenario D: INSERT - Authenticated User

**Steps**:
1. Log in as standard user
2. Create new organisation via signup form
3. Verify organisation created with pending status

**Expected**:
- ✓ Authenticated users can create organisations
- ✓ New organisations automatically set to 'pending'
- ✓ created_by field set to current user

**SQL Validation**:
```sql
-- Verify created organisation has correct status
SELECT verification_status, created_by FROM organisations
WHERE id = [newly-created-org-id];
-- Expected: verification_status = 'pending', created_by = auth.uid()
```

### Scenario E: UPDATE - Organisation Creator (Non-Admin)

**Steps**:
1. Log in as creator of pending organisation
2. Attempt to edit organisation details (name, description, website)
3. Submit changes

**Expected**:
- ✓ Creator can update non-verification fields (name, description, website, etc.)
- ✗ Creator CANNOT change verification_status
- ✗ Creator CANNOT change created_by

**SQL Validation**:
```sql
-- Attempt to update description (should succeed)
UPDATE organisations SET what_we_do = 'Updated description'
WHERE id = [org-id] AND created_by = auth.uid() AND verification_status = 'pending';
-- Expected: Success

-- Attempt to update verification_status (should fail)
UPDATE organisations SET verification_status = 'verified'
WHERE id = [org-id] AND created_by = auth.uid();
-- Expected: Failure (RLS policy blocks verification field updates by non-admins)
```

### Scenario F: UPDATE - Admin User

**Steps**:
1. Log in as admin
2. Navigate to pending organisation
3. Change verification status from 'pending' to 'verified'
4. Submit changes

**Expected**:
- ✓ Admin can update any field including verification_status
- ✓ Admin can update any organisation (own or others')

**SQL Validation**:
```sql
-- As admin, update verification status
UPDATE organisations SET verification_status = 'verified'
WHERE id = [org-id];
-- Expected: Success (admin bypass RLS restrictions)
```

### Scenario G: DELETE - Organisation Creator (Non-Admin)

**Steps**:
1. Log in as creator of pending organisation
2. Attempt to delete organisation

**Expected**:
- ✗ Creator CANNOT delete organisation
- ✗ Only admins can delete organisations

**SQL Validation**:
```sql
-- Attempt delete as creator
DELETE FROM organisations WHERE id = [org-id] AND created_by = auth.uid();
-- Expected: Failure (RLS denies delete for non-admins)
```

### Scenario H: DELETE - Admin User

**Steps**:
1. Log in as admin
2. Delete organisation

**Expected**:
- ✓ Admin can delete any organisation

**SQL Validation**:
```sql
-- As admin
DELETE FROM organisations WHERE id = [org-id];
-- Expected: Success
```

---

## Test 8: RLS Sanity Checks - Profiles Table

**Objective**: Validate Row Level Security for user profiles

### Scenario A: SELECT - Public Read

**Steps**:
1. Log out completely
2. Navigate to user profile page: `/profile/[username]`

**Expected**:
- ✓ Public can view user profiles
- ✓ Basic profile information visible (name, bio, avatar, etc.)

### Scenario B: UPDATE - Own Profile

**Steps**:
1. Log in as standard user
2. Navigate to profile settings
3. Update profile fields (name, bio, occupation, etc.)
4. Save changes

**Expected**:
- ✓ Users can update their own profile
- ✓ Changes persist

**SQL Validation**:
```sql
-- Update own profile
UPDATE profiles SET bio = 'Updated bio' WHERE id = auth.uid();
-- Expected: Success
```

### Scenario C: UPDATE - Other User's Profile

**Steps**:
1. Log in as User A
2. Attempt to update User B's profile via API/SQL

**Expected**:
- ✗ Cannot update other users' profiles
- ✗ RLS blocks unauthorized updates

**SQL Validation**:
```sql
-- Attempt to update another user's profile
UPDATE profiles SET bio = 'Hacked!' WHERE id != auth.uid();
-- Expected: Failure (RLS blocks)
```

---

## Test 9: RLS Sanity Checks - Organisation Members Table

**Objective**: Validate organisation membership security

### Scenario A: View Members - Public

**Steps**:
1. Log out
2. Navigate to verified organisation page
3. Check if members list visible

**Expected**:
- ✓ Public can see organisation members (if implemented)
- ✓ Member names and roles visible

### Scenario B: Add Member - Organisation Owner

**Steps**:
1. Log in as organisation owner
2. Invite new member to organisation
3. Assign role (member, admin, etc.)

**Expected**:
- ✓ Owner can add members
- ✓ Owner can assign roles

**SQL Validation**:
```sql
-- As owner, insert new member
INSERT INTO organisation_members (organisation_id, user_id, role)
VALUES ([org-id], [user-id], 'member');
-- Expected: Success (if user is owner/admin of org)
```

### Scenario C: Add Member - Non-Owner

**Steps**:
1. Log in as non-owner user
2. Attempt to add member to organisation

**Expected**:
- ✗ Non-owners cannot add members
- ✗ RLS blocks unauthorized member additions

---

## Test Results Template

Use this template to record test execution results:

```
Test #: [Number and Name]
Date: [YYYY-MM-DD]
Tester: [Name]
Environment: [Local/Staging/Production]
Browser: [Chrome/Firefox/Safari/etc.]
Result: [PASS/FAIL/PARTIAL]

Steps Completed:
- [x] Step 1
- [x] Step 2
- [ ] Step 3 (failed)

Issues Found:
- [Description of any bugs or unexpected behavior]

Screenshots/Evidence:
- [Links or attachments]

Notes:
- [Additional observations]
```

---

## Troubleshooting

### Common Issues

**Email confirmation not received**:
- Check spam/junk folder
- Verify SCW_SECRET_KEY, SCW_PROJECT_ID and EMAIL_FROM environment variables are configured
- Check Supabase email settings
- Verify the email service (Scaleway Transactional Email) is operational
- Check application logs for email sending errors

**Organisation not appearing in directory**:
- Verify verification_status is 'verified' (not 'pending' or 'rejected')
- Check RLS policies on organisations table
- Verify organisations_directory_v1 view includes the organisation
- Clear browser cache and reload

**Pending organisation visible to public**:
- **SECURITY ISSUE**: Check RLS policies immediately
- Verify `verified_organisations` view filters correctly
- Test query: `SELECT * FROM organisations WHERE verification_status != 'verified'` should be empty for public users

**Cannot create organisation**:
- Verify user is authenticated
- Check browser console for errors
- Verify all required fields filled (name, country_based, what_we_do)
- Check Supabase connection and RLS policies

**LocalStorage pending data not found after email confirmation**:
- Verify localStorage not cleared between signup and confirmation
- Check browser privacy settings (localStorage may be blocked)
- Verify redirection to `/onboarding/organisation` occurs
- Check if user opened confirmation link in different browser/device

**RLS tests failing**:
- Verify Supabase RLS policies enabled on all tables
- Check is_admin() function returns correct value for admin users
- Verify auth.uid() returns correct user ID
- Test policies in Supabase SQL editor with SET statements to simulate different users

---

## Related Documentation

- See `../smoke-tests.md` for Phase 1 and Phase 2 feature testing
- See `../rls-matrix.md` for complete RLS policy matrix
- See `../phase1-ui-checklist.md` for UI component verification
- See `/README.md` for local development setup
- See Supabase documentation for auth and RLS configuration

---

## Security Reminders

🔒 **Critical**: Pending and rejected organisations MUST NOT be visible to public or non-creator users. Any failure of this test is a **security vulnerability** and must be fixed immediately before deployment.

🔒 **Critical**: Users must NOT be able to modify verification_status of their own organisations. Only admins with is_admin()=true should have this permission.

🔒 **Critical**: RLS policies must be enabled on all tables. Test thoroughly before deployment to production.
