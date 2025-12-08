-- Create table to store daily analytics backups
CREATE TABLE public.analytics_backups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_date DATE NOT NULL UNIQUE,
  sessions_data JSONB NOT NULL DEFAULT '[]',
  kudos_data JSONB NOT NULL DEFAULT '[]',
  subscription_interest_data JSONB NOT NULL DEFAULT '[]',
  technique_submissions_data JSONB NOT NULL DEFAULT '[]',
  analytics_events_data JSONB NOT NULL DEFAULT '[]',
  record_counts JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (admins only)
ALTER TABLE public.analytics_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view backups"
ON public.analytics_backups
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create function to run daily backup
CREATE OR REPLACE FUNCTION public.run_daily_analytics_backup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  last_backup_date DATE;
  backup_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get the last backup date
  SELECT MAX(backup_date) INTO last_backup_date FROM public.analytics_backups;
  
  -- If no previous backup, use 30 days ago
  IF last_backup_date IS NULL THEN
    backup_start := NOW() - INTERVAL '30 days';
  ELSE
    backup_start := last_backup_date::timestamp with time zone;
  END IF;

  -- Insert new backup with data since last backup
  INSERT INTO public.analytics_backups (
    backup_date,
    sessions_data,
    kudos_data,
    subscription_interest_data,
    technique_submissions_data,
    analytics_events_data,
    record_counts
  )
  VALUES (
    CURRENT_DATE,
    (SELECT COALESCE(jsonb_agg(row_to_json(s)), '[]'::jsonb) FROM public.sessions s WHERE s.created_at > backup_start),
    (SELECT COALESCE(jsonb_agg(row_to_json(k)), '[]'::jsonb) FROM public.kudos k WHERE k.created_at > backup_start),
    (SELECT COALESCE(jsonb_agg(row_to_json(si)), '[]'::jsonb) FROM public.subscription_interest si WHERE si.created_at > backup_start),
    (SELECT COALESCE(jsonb_agg(row_to_json(gt)), '[]'::jsonb) FROM public.global_techniques gt WHERE gt.created_at > backup_start),
    (SELECT COALESCE(jsonb_agg(row_to_json(ae)), '[]'::jsonb) FROM public.analytics_events ae WHERE ae.created_at > backup_start),
    jsonb_build_object(
      'sessions', (SELECT COUNT(*) FROM public.sessions WHERE created_at > backup_start),
      'kudos', (SELECT COUNT(*) FROM public.kudos WHERE created_at > backup_start),
      'subscription_interest', (SELECT COUNT(*) FROM public.subscription_interest WHERE created_at > backup_start),
      'technique_submissions', (SELECT COUNT(*) FROM public.global_techniques WHERE created_at > backup_start),
      'analytics_events', (SELECT COUNT(*) FROM public.analytics_events WHERE created_at > backup_start)
    )
  )
  ON CONFLICT (backup_date) DO UPDATE SET
    sessions_data = EXCLUDED.sessions_data,
    kudos_data = EXCLUDED.kudos_data,
    subscription_interest_data = EXCLUDED.subscription_interest_data,
    technique_submissions_data = EXCLUDED.technique_submissions_data,
    analytics_events_data = EXCLUDED.analytics_events_data,
    record_counts = EXCLUDED.record_counts;
END;
$$;