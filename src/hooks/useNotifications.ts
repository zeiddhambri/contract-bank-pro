// ============================================================================
// Notifications in-app (R1.5 / R8.4)
// ----------------------------------------------------------------------------
// Depuis la migration de durcissement, l'INSERT sur `notifications` est réservé
// au serveur (triggers, tâches planifiées, Edge Functions via
// `public.create_notification`). Le client ne fait donc que LIRE et MARQUER
// COMME LUES — plus aucune création côté navigateur (défaut B05).
// ============================================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type NotificationType = 'info' | 'warning' | 'error' | 'success';

const NOTIFICATION_TYPES: NotificationType[] = ['info', 'warning', 'error', 'success'];

export type AppNotification = Omit<Tables<'notifications'>, 'type' | 'is_read' | 'created_at'> & {
  type: NotificationType;
  is_read: boolean;
  created_at: string;
};

const NOTIFICATIONS_QUERY_KEY = ['notifications'] as const;

function toAppNotification(row: Tables<'notifications'>): AppNotification {
  return {
    ...row,
    is_read: row.is_read ?? false,
    created_at: row.created_at ?? new Date().toISOString(),
    type: NOTIFICATION_TYPES.includes(row.type as NotificationType)
      ? (row.type as NotificationType)
      : 'info',
  };
}

export const useNotifications = (limit = 50) => {
  const queryClient = useQueryClient();

  const {
    data: notifications,
    isLoading,
    error,
  } = useQuery<AppNotification[]>({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data ?? []).map(toAppNotification);
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;

  return {
    notifications: notifications ?? [],
    unreadCount,
    isLoading,
    error,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  };
};
