-- Cosmo job sheet link (jobUrl) for the "Open in Cosmo" button.
alter table cosmo_installs add column if not exists job_url text;
