# Seeding Global Library Instructions

## Overview
This will insert 5 meditation techniques into the Global Library as **pending submissions** (not yet approved).

## Techniques Included
1. **Loving-Kindness Meditation** - Sharon Salzberg (Buddhist meditation)
2. **Centering Prayer** - Thomas Keating (Christian Contemplative Prayer)
3. **Body Scan Meditation** - Jon Kabat-Zinn (MBSR)
4. **Box Breathing** - U.S. Navy SEALs (Secular breathwork)
5. **Anapana Meditation** - S.N. Goenka (Theravada Buddhism)

## How to Run

### Option 1: Via Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the contents of `supabase/seed-global-library.sql`
5. Paste into the SQL editor
6. Click **Run**

### Option 2: Via Command Line
```bash
npx supabase db execute -f supabase/seed-global-library.sql
```

## What Happens

- ✅ Creates "Contempla" system account (if it doesn't exist)
  - Email: `contempla@contempla.app`
  - Handle: `@contempla`
  - Name: `Contempla`
  - Bio: "Official Contempla account for curated meditation techniques"
- ✅ 5 techniques inserted into `global_techniques` table
- ✅ All set to `approval_status = 'pending'`
- ✅ All linked to Contempla system account
- ✅ Contempla account owns the techniques (can edit/delete)

## Display Behavior

- **Submitted by:** Will show "Contempla" (not your personal account)
- **Attribution:** Shows the original teacher (e.g., "Attributed to Sharon Salzberg")
- **Status:** Pending approval (won't show in Global Library yet)

This creates clean separation between:
- **System-seeded content** (submitted by @contempla)
- **User-submitted content** (submitted by individual users)

## Approving Techniques

To make techniques visible in the Global Library, approve them:

### Via SQL:
```sql
UPDATE global_techniques
SET approval_status = 'approved'
WHERE approval_status = 'pending';
```

### Or approve individually:
```sql
UPDATE global_techniques
SET approval_status = 'approved'
WHERE name = 'Loving-Kindness Meditation';
```

## Verifying Installation

### Check if techniques were inserted with correct authorship:
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

**Expected output:**
| name | teacher_attribution | submitted_by_handle | submitted_by_name | approval_status |
|------|---------------------|---------------------|-------------------|-----------------|
| Anapana Meditation | S.N. Goenka | contempla | Contempla | pending |
| Box Breathing | U.S. Navy SEALs | contempla | Contempla | pending |
| Body Scan Meditation | Jon Kabat-Zinn | contempla | Contempla | pending |
| Centering Prayer | Thomas Keating | contempla | Contempla | pending |
| Loving-Kindness Meditation | Sharon Salzberg | contempla | Contempla | pending |

## Troubleshooting

### Error inserting into auth.users
If you get permission errors when creating the Contempla user, you may need to:
1. Run the script as a Supabase admin
2. Or manually create the Contempla profile via the app first, then the script will use it

### Want to transfer ownership to your account?
If you want to manage these techniques from your personal account:
```sql
UPDATE global_techniques
SET submitted_by = (SELECT id FROM profiles WHERE handle = 'your-handle')
WHERE submitted_by = (SELECT id FROM profiles WHERE handle = 'contempla');
```

### Checking Contempla account
```sql
SELECT id, email FROM auth.users WHERE email = 'contempla@contempla.app';
SELECT id, handle, name FROM profiles WHERE handle = 'contempla';
```

## Next Steps

After seeding:
1. Apply the `relevant_link` migration if you haven't:
   ```bash
   npx supabase db push
   ```

2. Rebuild the app:
   ```bash
   npm run build && npx cap sync ios
   ```

3. Test in the app:
   - Go to Library → Global Library
   - You should see the pending techniques (if you're an admin)
   - Or approve them first to see in public view

---

**All techniques include:**
- ✅ Full descriptions
- ✅ Step-by-step instructions
- ✅ Tips for practice
- ✅ Attribution to original teachers
- ✅ Tradition/context
- ✅ Source books/texts
- ✅ Relevant links
- ✅ Suggested durations
- ✅ Historical/cultural context
