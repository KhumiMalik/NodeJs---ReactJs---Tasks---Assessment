import type { Response } from 'express';
import type { FieldErrors } from './app-error.js';

export interface PaginationMeta {
  currentPage: number;
  perPage: number;
  total: number;
  lastPage: number;
}

interface SuccessOptions<T> {
  status?: number;
  message: string;
  data?: T;
  meta?: PaginationMeta;
}

export function sendSuccess<T>(res: Response, { status = 200, message, data, meta }: SuccessOptions<T>) {
  res.status(status).json({
    success: true,
    message,
    data: data ?? null,
    ...(meta && { meta }),
  });
}

export function sendError(res: Response, status: number, message: string, errors?: FieldErrors) {
  res.status(status).json({
    success: false,
    message,
    ...(errors && { errors }),
  });
}

export function buildPaginationMeta(page: number, perPage: number, total: number): PaginationMeta {
  return {
    currentPage: page,
    perPage,
    total,
    lastPage: Math.max(1, Math.ceil(total / perPage)),
  };
}
