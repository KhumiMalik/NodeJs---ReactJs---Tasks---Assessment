import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { taskService } from '../services/taskService';
import type { TaskInput, TaskListParams } from '../types/task';

export const TASKS_PER_PAGE = 10;

export const taskKeys = {
  all: ['tasks'] as const,
  list: (params: TaskListParams) => ['tasks', 'list', params] as const,
  detail: (id: number) => ['tasks', 'detail', id] as const,
  statistics: ['tasks', 'statistics'] as const,
  trash: (page: number) => ['tasks', 'trash', page] as const,
};

export const activityKeys = {
  recent: ['activities', 'recent'] as const,
};

// --- Queries -------------------------------------------------------------------

export function useTaskList(params: TaskListParams) {
  return useQuery({
    queryKey: taskKeys.list(params),
    queryFn: () => taskService.list(params),
    // Keep showing the current page while the next page/filter loads.
    placeholderData: keepPreviousData,
  });
}

export function useTask(id: number) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => taskService.get(id),
    enabled: Number.isInteger(id) && id > 0,
  });
}

export function useTaskStatistics() {
  return useQuery({ queryKey: taskKeys.statistics, queryFn: () => taskService.statistics() });
}

export function useTrash(page: number) {
  return useQuery({
    queryKey: taskKeys.trash(page),
    queryFn: () => taskService.trash({ page, perPage: TASKS_PER_PAGE }),
    placeholderData: keepPreviousData,
  });
}

export function useRecentActivities() {
  return useQuery({ queryKey: activityKeys.recent, queryFn: () => taskService.recentActivities() });
}

// --- Mutations -----------------------------------------------------------------
// Any task change can affect lists, statistics, trash and activity, so every
// mutation simply invalidates those caches and lets TanStack Query refetch.

function useInvalidateTaskData() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: taskKeys.all }),
      queryClient.invalidateQueries({ queryKey: activityKeys.recent }),
    ]);
}

export function useCreateTask() {
  const invalidate = useInvalidateTaskData();
  return useMutation({ mutationFn: (input: TaskInput) => taskService.create(input), onSuccess: invalidate });
}

export function useUpdateTask() {
  const invalidate = useInvalidateTaskData();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<TaskInput> }) => taskService.update(id, input),
    onSuccess: invalidate,
  });
}

export function useToggleTask() {
  const invalidate = useInvalidateTaskData();
  return useMutation({ mutationFn: (id: number) => taskService.toggleCompletion(id), onSuccess: invalidate });
}

export function useDeleteTask() {
  const invalidate = useInvalidateTaskData();
  return useMutation({ mutationFn: (id: number) => taskService.remove(id), onSuccess: invalidate });
}

export function useRestoreTask() {
  const invalidate = useInvalidateTaskData();
  return useMutation({ mutationFn: (id: number) => taskService.restore(id), onSuccess: invalidate });
}

export function useForceDeleteTask() {
  const invalidate = useInvalidateTaskData();
  return useMutation({ mutationFn: (id: number) => taskService.forceDelete(id), onSuccess: invalidate });
}
