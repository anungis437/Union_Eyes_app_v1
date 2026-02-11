import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@services/api';

export function useNotifications(params?: { limit?: number; unread?: boolean }) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => apiService.getNotifications(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiService.markNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiService.markAllNotificationsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

