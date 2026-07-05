-- EducationalPoint.pdfSource replaces the previous implicit "pdfUrl.includes('custom-pdfs')"
-- string check with an explicit, persisted mode (UPLOAD vs AUTO).
CREATE TYPE "PdfSource" AS ENUM ('UPLOAD', 'AUTO');

ALTER TABLE "EducationalPoint" ADD COLUMN "pdfSource" "PdfSource" NOT NULL DEFAULT 'AUTO';

-- One-time backfill for existing rows, based on the same heuristic the app used until now.
-- Does not touch Storage — only classifies already-existing pdfUrl values.
UPDATE "EducationalPoint"
SET "pdfSource" = 'UPLOAD'
WHERE "pdfUrl" LIKE '%custom-pdfs%';
