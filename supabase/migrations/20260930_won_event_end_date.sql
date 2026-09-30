-- WON board — event end date for multi-day events (e.g. 26 Sep – 04 Oct).
-- NULL = single-day event. Safe to run more than once.

ALTER TABLE won_jobs ADD COLUMN IF NOT EXISTS event_end_date date;

-- Backfill from titles shaped "YYYY.MM.DD - MM.DD - ### - …":
-- the 2nd " - " segment is the end date (MM.DD, same year as the start;
-- next year if its month is earlier than the start month).
WITH parts AS (
  SELECT job_id,
         split_part(event_display_name, ' - ', 1) AS s1,
         split_part(event_display_name, ' - ', 2) AS s2
  FROM won_jobs
  WHERE event_end_date IS NULL
),
parsed AS (
  SELECT job_id,
         to_date(trim(s1), 'YYYY.MM.DD') AS start_d,
         trim(s2) AS end_md
  FROM parts
  WHERE trim(s1) ~ '^[0-9]{4}\.[0-9]{2}\.[0-9]{2}$'
    AND trim(s2) ~ '^[0-9]{1,2}\.[0-9]{1,2}$'
),
resolved AS (
  SELECT job_id, start_d,
         make_date(
           extract(year FROM start_d)::int
             + CASE WHEN split_part(end_md, '.', 1)::int < extract(month FROM start_d)::int THEN 1 ELSE 0 END,
           split_part(end_md, '.', 1)::int,
           split_part(end_md, '.', 2)::int
         ) AS end_d
  FROM parsed
)
UPDATE won_jobs w
SET event_end_date = r.end_d
FROM resolved r
WHERE w.job_id = r.job_id AND r.end_d > r.start_d;
