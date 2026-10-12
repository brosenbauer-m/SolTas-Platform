# Supabase Dashboard Actions Required

> **Historical document.** Dashboard settings (Auth, email) are still changed in the Supabase dashboard, but schema changes always go through migrations (see `AGENT_RULES.md`).

This document describes manual actions that must be taken in the Supabase Dashboard to complete the security hardening process. These items cannot be automated via migrations.

## 1. Enable Leaked Password Protection

**Purpose:** Prevent users from using passwords that have been leaked in known data breaches.

**Steps:**
1. Log into the [Supabase Dashboard](https://app.supabase.com/)
2. Navigate to your project
3. Go to **Authentication** → **Policies** → **Password Protection**
4. Locate the **Leaked Password Protection** setting
5. Toggle it to **Enabled**
6. Click **Save**

**Verification:**
- Try creating a test account with a known leaked password (e.g., "password123")
- The system should reject the password and display an error message

---

## 2. Upgrade Postgres Version

**Purpose:** Apply the latest security patches and bug fixes available for PostgreSQL.

**Steps:**
1. Log into the [Supabase Dashboard](https://app.supabase.com/)
2. Navigate to your project
3. Go to **Settings** → **Database**
4. Locate the **Postgres Version** section
5. If an upgrade is available, you'll see a notification: "Security patches available"
6. Click **Upgrade** or **Schedule Upgrade**
7. Choose an appropriate maintenance window for the upgrade
8. Confirm the upgrade

**Important Notes:**
- The upgrade may cause brief downtime (typically 1-5 minutes)
- Schedule the upgrade during low-traffic periods
- Ensure you have recent database backups before proceeding
- Test your application after the upgrade to ensure compatibility

**Verification:**
- After the upgrade completes, verify the new Postgres version in **Settings** → **Database**
- Check that the "Security patches available" notification is gone
- Run basic application tests to ensure functionality is intact

---

## Post-Migration Verification

After completing both dashboard actions and deploying the migration `20260322000000_security_hardening_rls_functions.sql`, verify the following:

### Security Advisor Checks
1. Navigate to **Advisors** → **Security** in the Supabase Dashboard
2. Verify that the following warnings are resolved:
   - ✅ No views with SECURITY DEFINER
   - ✅ No functions missing explicit search_path
   - ✅ No RLS policies with WITH CHECK (true)

### Functional Testing
Test the following scenarios to ensure business logic is preserved:

#### As a Logged Out User:
- ✅ Can view public/approved projects
- ✅ Cannot insert or update any data
- ✅ Can view verified organisations

#### As an Authenticated Non-Admin User:
- ✅ Can create personal projects (owner_type='user')
- ✅ Can create own organisation (created_by = auth.uid())
- ✅ Cannot update admin-only tables
- ✅ Cannot insert organisation-owned content without appropriate permissions

#### As an Admin User:
- ✅ Can view all projects (including pending)
- ✅ Can update any project
- ✅ Can manage organisation verification
- ✅ Can perform all administrative functions

#### Organisation Permissions:
- ✅ Org member with can_create_projects=true can create org-owned projects
- ✅ Org member without can_create_projects cannot create org-owned projects
- ✅ Org admin can update org-owned content
- ✅ Regular org member cannot update admin-restricted content

---

## Rollback Plan

If any issues are discovered after deployment:

1. **For Migration Issues:**
   - The migration is forward-only and cannot be rolled back automatically
   - If critical issues occur, a new forward migration must be created to revert changes
   - Contact the development team immediately

2. **For Dashboard Changes:**
   - Leaked Password Protection: Simply toggle back to "Disabled"
   - Postgres Upgrade: Contact Supabase support for rollback assistance (if within 48 hours)

---

## Contact

For issues or questions regarding these changes:
- Security concerns: [security team contact]
- Database issues: [DBA contact]
- Supabase support: https://supabase.com/support
