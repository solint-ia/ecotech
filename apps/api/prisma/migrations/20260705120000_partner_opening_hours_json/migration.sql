-- Partner.openingHours moves from a free-form string ("Seg,Ter|08:00-18:00" / "24/7")
-- to a structured JSON schedule (per weekday, multiple shifts). The old format cannot
-- be cast to JSON, so existing values are reset to an empty schedule ("[]") — partners
-- must have their hours re-entered once through the new form.
ALTER TABLE "Partner" ALTER COLUMN "openingHours" DROP DEFAULT;
ALTER TABLE "Partner" ALTER COLUMN "openingHours" TYPE JSONB USING '[]'::jsonb;
ALTER TABLE "Partner" ALTER COLUMN "openingHours" SET DEFAULT '[]';
