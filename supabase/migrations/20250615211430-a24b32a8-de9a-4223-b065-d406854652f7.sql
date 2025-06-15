
-- Add new roles to the app_role enum
ALTER TYPE public.app_role ADD VALUE 'manager';
ALTER TYPE public.app_role ADD VALUE 'validator';
ALTER TYPE public.app_role ADD VALUE 'auditor';
