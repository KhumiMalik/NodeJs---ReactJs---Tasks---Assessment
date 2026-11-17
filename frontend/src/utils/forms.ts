import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { getFieldErrors } from '../services/api';

/**
 * Copies a 422 response's field errors onto React Hook Form fields.
 * Returns true if at least one known field received an error.
 */
export function applyServerFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): boolean {
  const errors = getFieldErrors(error);
  if (!errors) return false;

  let applied = false;
  for (const field of fields) {
    const message = errors[field]?.[0];
    if (message) {
      setError(field, { type: 'server', message }, { shouldFocus: !applied });
      applied = true;
    }
  }
  return applied;
}
