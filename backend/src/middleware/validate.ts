import type { Request, RequestHandler } from 'express';
import type { z } from 'zod';
import { validationError, type FieldErrors } from '../utils/app-error.js';

/** A Zod schema describing the parts of a request a route accepts. */
export type RequestSchema = z.ZodType<{ body?: unknown; query?: unknown; params?: unknown }>;

/**
 * Validates body, query and params against the schema. On success the parsed
 * (coerced, trimmed, unknown-keys-stripped) values are stored on `req.validated`;
 * Express 5 makes `req.query` read-only, so the raw request is not mutated.
 */
export function validate(schema: RequestSchema): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse({
      body: req.body ?? {},
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      next(validationError(formatZodIssues(result.error.issues)));
      return;
    }

    req.validated = result.data;
    next();
  };
}

/** Reads the values parsed by `validate(schema)` with the schema's output type. */
export function getInput<S extends RequestSchema>(req: Request): z.output<S> {
  return req.validated as z.output<S>;
}

/** Converts Zod issues to `{ field: [messages] }`, dropping the body/query/params prefix. */
function formatZodIssues(issues: z.core.$ZodIssue[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const [location, ...fieldPath] = issue.path.map(String);
    const key = fieldPath.length > 0 ? fieldPath.join('.') : (location ?? 'request');
    (errors[key] ??= []).push(issue.message);
  }
  return errors;
}
