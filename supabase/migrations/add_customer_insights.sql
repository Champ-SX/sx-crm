-- Phase 3.2: shared customer-level "Customer Insights ⭐" note.
-- Stored on the customer; surfaced/editable on Lead + Won cards via the linked
-- customer (single source of truth).
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS customer_insights TEXT;
