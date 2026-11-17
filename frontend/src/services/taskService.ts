import type { ApiSuccess, Paginated, PaginationMeta } from '../types/api';
import type { Activity, Task, TaskInput, TaskListParams, TaskStatistics } from '../types/task';
import { api } from './api';

function toPaginated<T>(body: ApiSuccess<T[]>): Paginated<T> {
  return { data: body.data, meta: body.meta as PaginationMeta };
}

export const taskService = {
  async list(params: TaskListParams): Promise<Paginated<Task>> {
    const res = await api.get<ApiSuccess<Task[]>>('/tasks', {
      params: { ...params, search: params.search || undefined },
    });
    return toPaginated(res.data);
  },

  async get(id: number): Promise<Task> {
    const res = await api.get<ApiSuccess<Task>>(`/tasks/${id}`);
    return res.data.data;
  },

  async create(input: TaskInput): Promise<Task> {
    const res = await api.post<ApiSuccess<Task>>('/tasks', input);
    return res.data.data;
  },

  async update(id: number, input: Partial<TaskInput>): Promise<Task> {
    const res = await api.patch<ApiSuccess<Task>>(`/tasks/${id}`, input);
    return res.data.data;
  },

  async toggleCompletion(id: number): Promise<Task> {
    const res = await api.patch<ApiSuccess<Task>>(`/tasks/${id}/toggle-completion`);
    return res.data.data;
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/tasks/${id}`);
  },

  async restore(id: number): Promise<Task> {
    const res = await api.post<ApiSuccess<Task>>(`/tasks/${id}/restore`);
    return res.data.data;
  },

  async forceDelete(id: number): Promise<void> {
    await api.delete(`/tasks/${id}/force-delete`);
  },

  async statistics(): Promise<TaskStatistics> {
    const res = await api.get<ApiSuccess<TaskStatistics>>('/tasks/statistics');
    return res.data.data;
  },

  async trash(params: { page: number; perPage: number }): Promise<Paginated<Task>> {
    const res = await api.get<ApiSuccess<Task[]>>('/tasks/trash', { params });
    return toPaginated(res.data);
  },

  async recentActivities(limit = 8): Promise<Activity[]> {
    const res = await api.get<ApiSuccess<Activity[]>>('/activities/recent', { params: { limit } });
    return res.data.data;
  },
};
