export type FieldErrors = Record<string, string[]>;

/** An expected error that is safe to show to the client. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly errors?: FieldErrors,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const unauthenticated = (message = 'Unauthenticated.') => new AppError(401, message);
export const notFound = (message = 'Resource not found.') => new AppError(404, message);
export const conflict = (message: string) => new AppError(409, message);
export const validationError = (errors: FieldErrors, message = 'Validation failed.') =>
  new AppError(422, message, errors);
