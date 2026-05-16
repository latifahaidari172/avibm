-- ────────────────────────────────────────────────────────────────────────
-- AVIBM: merge duplicate customer rows by (lowercase) email
-- ────────────────────────────────────────────────────────────────────────
-- WHY: Some customers signed up twice (OAuth + magic-link, typo+retry) and
-- ended up with TWO rows in public.customers sharing the same email. The
-- admin UI rendered them as separate archived cards (Ali Hussain Ahmadi
-- duplicate, 2026-05-16). Schema had no UNIQUE on email so nothing stopped
-- it. We run this once to consolidate, then add the constraint.
--
-- STRATEGY:
--   1. For each email with > 1 customer row, pick the NEWEST as the keeper.
--   2. Re-point all vehicles from the older rows to the keeper.
--   3. Soft-delete the older rows (archived=true + pending_deletion=true).
--      Hard delete is too risky if a Supabase auth.users row still points
--      to user_metadata.customer_id — leave the rows around so the auth
--      callback's auto-link logic can re-route the orphan auth users to
--      the keeper next sign-in.
--   4. Add a UNIQUE INDEX on lower(email) so this can't recur.
--
-- RUN: paste into Supabase SQL editor (Dashboard → SQL → New Query) and
-- run. Idempotent; safe to re-run.
-- ────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1+2. Re-point vehicles to the newest customer row per email
WITH dup_emails AS (
  SELECT lower(email) AS lemail, COUNT(*) AS n
    FROM customers
   WHERE email IS NOT NULL AND email <> ''
   GROUP BY lower(email)
  HAVING COUNT(*) > 1
),
ranked AS (
  SELECT c.id,
         lower(c.email)                                              AS lemail,
         row_number() OVER (PARTITION BY lower(c.email) ORDER BY c.created_at DESC) AS rn
    FROM customers c
   WHERE lower(c.email) IN (SELECT lemail FROM dup_emails)
),
keepers AS (SELECT lemail, id AS keeper_id FROM ranked WHERE rn = 1),
losers  AS (SELECT lemail, id AS loser_id  FROM ranked WHERE rn > 1)
UPDATE vehicles v
   SET customer_id = k.keeper_id
  FROM losers l
  JOIN keepers k ON k.lemail = l.lemail
 WHERE v.customer_id = l.loser_id;

-- 3. Soft-delete the loser customer rows
WITH dup_emails AS (
  SELECT lower(email) AS lemail
    FROM customers
   WHERE email IS NOT NULL AND email <> ''
   GROUP BY lower(email)
  HAVING COUNT(*) > 1
),
ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY lower(email) ORDER BY created_at DESC) AS rn
    FROM customers
   WHERE lower(email) IN (SELECT lemail FROM dup_emails)
)
UPDATE customers
   SET archived         = true,
       pending_deletion = true,
       active           = false
 WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 4. Prevent recurrence — UNIQUE on lower(email)
-- (partial: skip NULL/empty email so cases without email don't conflict)
CREATE UNIQUE INDEX IF NOT EXISTS customers_lower_email_uniq
   ON customers (lower(email))
WHERE email IS NOT NULL AND email <> '';

COMMIT;

-- ────────────────────────────────────────────────────────────────────────
-- VERIFY: should return 0 rows after running
-- ────────────────────────────────────────────────────────────────────────
SELECT lower(email) AS email, COUNT(*) AS n
  FROM customers
 WHERE archived = false OR archived IS NULL
   AND email IS NOT NULL AND email <> ''
 GROUP BY lower(email)
HAVING COUNT(*) > 1;
