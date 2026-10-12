# RLS Test Matrix

This document outlines the Row Level Security (RLS) policy test matrix for Phase 2 integration. Each table lists expected access patterns for different user roles.

## Test Roles

- **Logged out**: Unauthenticated visitor
- **Logged in**: Authenticated user (not owner/admin)
- **Owner**: Resource creator or owner
- **Admin**: Platform administrator

## Tables and Expected Policies

### 1. project_updates

| Operation | Logged out | Logged in | Owner | Admin |
|-----------|-----------|-----------|-------|-------|
| SELECT (public) | ✓ Read public updates | ✓ Read public updates | ✓ Read all own updates | ✓ Read all updates |
| SELECT (project) | ✗ Denied | TBD | TBD | ✓ Read all updates |
| INSERT | ✗ Denied | ✗ Denied | ✓ Create for own projects | ✓ Create for any project |
| UPDATE | ✗ Denied | ✗ Denied | ✓ Update own updates | ✓ Update any update |
| DELETE | ✗ Denied | ✗ Denied | ✓ Delete own updates | ✓ Delete any update |

### 2. follow_edges

| Operation | Logged out | Logged in | Owner | Admin |
|-----------|-----------|-----------|-------|-------|
| SELECT | TBD | ✓ Read all follows | ✓ Read all follows | ✓ Read all follows |
| INSERT | ✗ Denied | ✓ Create own follows | ✓ Create own follows | ✓ Create any follow |
| UPDATE | ✗ Denied | ✗ Denied | ✗ Denied | TBD |
| DELETE | ✗ Denied | ✓ Delete own follows | ✓ Delete own follows | ✓ Delete any follow |

### 3. update_likes (Planned - Phase 2)

| Operation | Logged out | Logged in | Owner | Admin |
|-----------|-----------|-----------|-------|-------|
| SELECT | TBD | TBD | TBD | TBD |
| INSERT | ✗ Denied | TBD | TBD | TBD |
| UPDATE | ✗ Denied | TBD | TBD | TBD |
| DELETE | ✗ Denied | TBD | TBD | TBD |

### 4. update_comments (Planned - Phase 2)

| Operation | Logged out | Logged in | Owner | Admin |
|-----------|-----------|-----------|-------|-------|
| SELECT | TBD | TBD | TBD | TBD |
| INSERT | ✗ Denied | TBD | TBD | TBD |
| UPDATE | ✗ Denied | TBD | TBD | TBD |
| DELETE | ✗ Denied | TBD | TBD | TBD |

### 5. funding_opportunities (grants table)

**Note**: Supports dual ownership model (user-owned or org-owned). Owner role refers to the user who owns the grant OR an admin/owner of the organisation that owns the grant.

| Operation | Logged out | Logged in (non-owner) | Owner (User/Org Admin) | Admin |
|-----------|-----------|-----------|-------|-------|
| SELECT (published) | ✓ Read published open/rolling grants | ✓ Read published open/rolling grants | ✓ Read all own grants + published | ✓ Read all grants |
| SELECT (unpublished) | ✗ Denied | ✗ Denied | ✓ Read own unpublished grants | ✓ Read all grants |
| INSERT (user-owned) | ✗ Denied | ✓ Create if owner_type='user' AND owner_id=auth.uid() | ✓ Create own grants | ✓ Create any grant |
| INSERT (org-owned) | ✗ Denied | ✓ Create if member with can_create_funding=true | ✓ Create org grants if permission granted | ✓ Create any grant |
| UPDATE | ✗ Denied | ✗ Denied | ✓ Update own grants or org grants (if admin/owner) | ✓ Update any grant |
| DELETE | ✗ Denied | ✗ Denied | ✓ Delete own grants or org grants (if admin/owner) | ✓ Delete any grant |

**Policies Implemented** (see `20260216232940_grants_dual_ownership_rls.sql`):
- `grants_insert_dual_ownership`: User-owned or org-owned with can_create_funding permission
- `grants_update_dual_ownership`: Owner (user or org admin/owner) can update
- `grants_delete_dual_ownership`: Owner (user or org admin/owner) can delete
- `Public can read published open grants`: Unchanged SELECT policy
- `Admins can manage grants`: Admin override for all operations

### 6. watchdog_issues (Planned)

| Operation | Logged out | Logged in | Owner | Admin |
|-----------|-----------|-----------|-------|-------|
| SELECT | TBD | TBD | TBD | TBD |
| INSERT | ✗ Denied | TBD | TBD | TBD |
| UPDATE | ✗ Denied | TBD | TBD | TBD |
| DELETE | ✗ Denied | TBD | TBD | TBD |

### 7. moderation_events (Planned)

| Operation | Logged out | Logged in | Owner | Admin |
|-----------|-----------|-----------|-------|-------|
| SELECT | ✗ Denied | ✗ Denied | TBD | TBD |
| INSERT | ✗ Denied | ✗ Denied | ✗ Denied | TBD |
| UPDATE | ✗ Denied | ✗ Denied | ✗ Denied | TBD |
| DELETE | ✗ Denied | ✗ Denied | ✗ Denied | TBD |

## Testing Notes

- TBD indicates policies that need to be defined during Phase 2 implementation
- ✓ indicates expected access granted
- ✗ indicates expected access denied
- All policies must be validated with automated tests before deployment
- Reference `/scripts/rls-smoke.ts` (`pnpm test:rls`) for testing patterns

## Related Documentation

- See `smoke-tests.md` for manual verification procedures
- See `phase1-ui-checklist.md` for UI component verification
