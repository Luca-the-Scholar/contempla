# ✅ Global Library Seeding - UPDATED with Contempla System Account

## Changes Made

### Updated Files

1. **[supabase/seed-global-library.sql](supabase/seed-global-library.sql)** - UPDATED
   - Now creates/uses "Contempla" system account
   - All techniques submitted by @contempla (not your personal account)
   - Clean separation between system-seeded and user-submitted content

2. **[SEED_INSTRUCTIONS.md](SEED_INSTRUCTIONS.md)** - UPDATED
   - Updated instructions to reflect Contempla authorship
   - Added verification queries
   - Added troubleshooting for auth.users permissions

## How It Works Now

### Contempla System Account

The seed script now:

1. **Checks for Contempla user** (`contempla@contempla.app`)
2. **Creates it if it doesn't exist:**
   - Email: `contempla@contempla.app`
   - Handle: `@contempla`
   - Name: `Contempla`
   - Bio: "Official Contempla account for curated meditation techniques"
   - Password: Encrypted random string (account cannot be logged into)
3. **Uses this account** as `submitted_by` for all 5 techniques

### Display Behavior

**In the Global Library UI:**
```
Loving-Kindness Meditation
Attributed to Sharon Salzberg        ← CREDIT to original teacher
Submitted by Contempla               ← SUBMITTED BY system account
Buddhist meditation (Metta practice)
```

**Key Distinction:**
- **Attribution** = Who created the technique (Sharon Salzberg, Jon Kabat-Zinn, etc.)
- **Submitted by** = Who entered it into the database (Contempla system account)

## Running the Seed Script

```bash
npx supabase db execute -f supabase/seed-global-library.sql
```

**Expected output:**
```
NOTICE: Creating Contempla system user...
NOTICE: Created Contempla user with ID: [uuid]
NOTICE: Creating Contempla profile...
NOTICE: Created Contempla profile with handle @contempla
NOTICE: Using Contempla user ID: [uuid]
NOTICE: Successfully inserted 5 meditation techniques!
NOTICE: All techniques submitted by: Contempla (@contempla)
NOTICE: All techniques are pending approval
```

## Verification

After running, verify with:

```sql
SELECT
  gt.name,
  gt.teacher_attribution,
  p.handle as submitted_by_handle,
  p.name as submitted_by_name,
  gt.approval_status
FROM global_techniques gt
JOIN profiles p ON gt.submitted_by = p.id
WHERE gt.approval_status = 'pending'
ORDER BY gt.created_at DESC
LIMIT 5;
```

**Expected result:**
All 5 techniques should show:
- `submitted_by_handle`: `contempla`
- `submitted_by_name`: `Contempla`
- `approval_status`: `pending`

## Approving Techniques

Make them visible in Global Library:

```sql
UPDATE global_techniques
SET approval_status = 'approved'
WHERE approval_status = 'pending';
```

## Why This Approach?

### Pros:
✅ Clean separation: system content vs user content
✅ Professional display: "Submitted by Contempla"
✅ Scalable: can add more curated techniques to this account
✅ Clear distinction: Attribution (teacher) vs Submitter (curator)

### Alternative (if needed):
If you encounter permission issues creating auth.users, you can:
1. Manually create @contempla account via the app
2. Re-run the script (it will detect and use existing account)

## Next Steps

1. **Apply migrations:**
   ```bash
   npx supabase db push
   ```

2. **Run seed script:**
   ```bash
   npx supabase db execute -f supabase/seed-global-library.sql
   ```

3. **Verify seeding:**
   ```bash
   # Run the verification query above
   ```

4. **Approve techniques** (when ready):
   ```sql
   UPDATE global_techniques SET approval_status = 'approved' WHERE approval_status = 'pending';
   ```

5. **Rebuild & test:**
   ```bash
   npm run build && npx cap sync ios
   ```

---

## Summary

✅ Seed script creates Contempla system account
✅ All 5 techniques submitted by @contempla
✅ Attribution properly credits original teachers
✅ Techniques display as "Submitted by Contempla"
✅ Ready to run and test

**The Global Library seeding is production-ready!** 🌱
