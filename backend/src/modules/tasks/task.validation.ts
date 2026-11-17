import { z } from 'zod';
import { idParamSchema, requiredString } from '../../utils/validation.js';

const titleField = requiredString('title')
  .trim()
  .min(1, 'The title field is required.')
  .max(255, 'The title must not be greater than 255 characters.');

// Blank descriptions are stored as NULL rather than empty strings.
const descriptionField = z
  .string({ error: 'The description must be a string.' })
  .trim()
  .max(5000, 'The description must not be greater than 5000 characters.')
  .nullable()
  .transform((value) => (value === '' ? null : value));

const isCompletedField = z.boolean({ error: 'The is completed field must be true or false.' });

const paginationQuery = {
  page: z.coerce
    .number({ error: 'The page must be a number.' })
    .int('The page must be an integer.')
    .min(1, 'The page must be at least 1.')
    .max(100_000, 'The page is out of range.')
    .default(1),
  perPage: z.coerce
    .number({ error: 'The per page value must be a number.' })
    .int('The per page value must be an integer.')
    .min(1, 'The per page value must be at least 1.')
    .max(50, 'The per page value must not be greater than 50.')
    .default(10),
};

export const listTasksSchema = z.object({
  query: z.object({
    search: z
      .string({ error: 'The search must be a string.' })
      .trim()
      .max(255, 'The search must not be greater than 255 characters.')
      .optional()
      .transform((value) => value || undefined),
    status: z
      .enum(['all', 'pending', 'completed'], { error: 'The status must be one of: all, pending, completed.' })
      .default('all'),
    ...paginationQuery,
  }),
});

export const listTrashSchema = z.object({
  query: z.object(paginationQuery),
});

export const taskIdSchema = z.object({
  params: idParamSchema,
});

export const createTaskSchema = z.object({
  body: z.object({
    title: titleField,
    description: descriptionField.optional(),
    isCompleted: isCompletedField.optional(),
  }),
});

/** PUT replaces the editable fields: omitted optional fields reset to their defaults. */
export const replaceTaskSchema = z.object({
  params: idParamSchema,
  body: z.object({
    title: titleField,
    description: descriptionField.optional().transform((value) => value ?? null),
    isCompleted: isCompletedField.default(false),
  }),
});

/** PATCH applies only the fields that are present. Unknown keys such as userId are stripped. */
export const updateTaskSchema = z.object({
  params: idParamSchema,
  body: z
    .object({
      title: titleField.optional(),
      description: descriptionField.optional(),
      isCompleted: isCompletedField.optional(),
    })
    .refine((body) => Object.values(body).some((value) => value !== undefined), {
      message: 'At least one of title, description or isCompleted must be provided.',
    }),
});
