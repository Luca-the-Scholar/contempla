import { supabase } from "@/integrations/supabase/client";

export type AnalyticsEventType =
  | 'practice_logged'
  | 'timer_started'
  | 'timer_completed'
  | 'library_opened'
  | 'technique_viewed'
  | 'calendar_opened'
  | 'calendar_day_clicked'
  | 'friend_request_sent'
  | 'friend_request_accepted'
  | 'practice_visibility_toggled'
  | 'friend_profile_viewed'
  | 'premium_cta_clicked'
  | 'technique_submitted'
  | 'technique_approved'
  | 'teacher_profile_completed'
  | 'activity_feed_viewed'
  | 'kudos_given'
  | 'kudos_removed'
  | 'feed_profile_clicked';

export interface AnalyticsMetadata {
  technique_id?: string;
  duration_minutes?: number;
  method?: 'timer' | 'manual';
  date_clicked?: string;
  target_user_id?: string;
  new_visibility_setting?: string;
  friend_user_id?: string;
  submitter_name?: string;
  technique_name?: string;
  description?: string;
  instructions?: string;
  approx_duration_minutes?: number;
  legal_permission_confirmed?: boolean;
  source_or_influence_name?: string;
  admin_user_id?: string;
  continent?: string;
  tradition_tags?: string[];
  session_id?: string;
  session_owner_id?: string;
  [key: string]: unknown;
}

export async function trackEvent(
  eventType: AnalyticsEventType,
  metadata: AnalyticsMetadata = {}
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('Analytics: No authenticated user, skipping event:', eventType);
      return;
    }

    // Use type assertion since the types haven't regenerated yet
    const { error } = await (supabase as any)
      .from('analytics_events')
      .insert({
        user_id: user.id,
        event_type: eventType,
        metadata
      });

    if (error) {
      console.error('Analytics tracking error:', error);
    }
  } catch (err) {
    console.error('Analytics tracking failed:', err);
  }
}

// Hook version for components
export function useAnalytics() {
  return { trackEvent };
}
