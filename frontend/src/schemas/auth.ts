import { z } from 'zod';

// Mirrors the backend rules for instant feedback. The server remains the
// source of truth; its 422 field errors are mapped onto the same fields.

const email = z
  .string()
  .trim()
  .min(1, 'The email field is required.')
  .max(255, 'The email must not be greater than 255 characters.')
  .pipe(z.email('The email must be a valid email address.'));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'The password field is required.'),
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'The name field is required.')
      .max(255, 'The name must not be greater than 255 characters.'),
    email,
    password: z
      .string()
      .min(8, 'The password must be at least 8 characters.')
      .refine(
        (value) => new TextEncoder().encode(value).length <= 72,
        'The password must not be greater than 72 bytes.',
      ),
    passwordConfirmation: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'The password confirmation does not match.',
    path: ['passwordConfirmation'],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
