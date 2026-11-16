import { z } from 'zod';
import { requiredString } from '../../utils/validation.js';

// bcrypt only uses the first 72 bytes of a password; longer input would be
// silently truncated, so it is rejected instead.
const BCRYPT_MAX_BYTES = 72;

const emailField = requiredString('email')
  .trim()
  .toLowerCase()
  .min(1, 'The email field is required.')
  .max(255, 'The email must not be greater than 255 characters.')
  .pipe(z.email('The email must be a valid email address.'));

export const registerSchema = z.object({
  body: z
    .object({
      name: requiredString('name')
        .trim()
        .min(1, 'The name field is required.')
        .max(255, 'The name must not be greater than 255 characters.'),
      email: emailField,
      password: requiredString('password')
        .min(8, 'The password must be at least 8 characters.')
        .refine(
          (value) => Buffer.byteLength(value, 'utf8') <= BCRYPT_MAX_BYTES,
          `The password must not be greater than ${BCRYPT_MAX_BYTES} bytes.`,
        ),
      passwordConfirmation: requiredString('password confirmation'),
    })
    .refine((data) => data.password === data.passwordConfirmation, {
      message: 'The password confirmation does not match.',
      path: ['passwordConfirmation'],
    }),
});

export const loginSchema = z.object({
  body: z.object({
    email: emailField,
    password: requiredString('password').min(1, 'The password field is required.'),
  }),
});
