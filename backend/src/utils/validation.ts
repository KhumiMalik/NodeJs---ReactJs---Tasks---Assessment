import { z } from 'zod';

/** A required string field with a human-friendly "required" message. */
export function requiredString(field: string) {
  return z.string({
    error: (issue) =>
      issue.input === undefined || issue.input === null
        ? `The ${field} field is required.`
        : `The ${field} must be a string.`,
  });
}

export const idParamSchema = z.object({
  id: z.coerce
    .number({ error: 'The id must be a number.' })
    .int('The id must be an integer.')
    .positive('The id must be a positive integer.')
    // Keeps out-of-range values from reaching MySQL's 32-bit INT column.
    .max(2_147_483_647, 'The id is out of range.'),
});
