import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { Prisma } from '../../generated/prisma/client.js';
import { AppError, validationError } from '../../utils/app-error.js';
import { publicUserSelect, type AuthUser, type LoginInput, type RegisterInput } from './auth.types.js';

const INVALID_CREDENTIALS = 'These credentials do not match our records.';
const EMAIL_TAKEN = { email: ['The email has already been taken.'] };

// Compared against when the email does not exist so that a failed login takes
// the same time whether or not the account exists (prevents user enumeration).
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('timing-equalisation-only', env.BCRYPT_ROUNDS);

export async function registerUser(input: RegisterInput): Promise<AuthUser> {
  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) {
    throw validationError(EMAIL_TAKEN);
  }

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);

  try {
    return await prisma.user.create({
      data: { name: input.name, email: input.email, password: passwordHash },
      select: publicUserSelect,
    });
  } catch (error) {
    // A concurrent registration can pass the check above; the unique index is the real guard.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw validationError(EMAIL_TAKEN);
    }
    throw error;
  }
}

export async function verifyCredentials(input: LoginInput): Promise<AuthUser> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const passwordMatches = await bcrypt.compare(input.password, user?.password ?? DUMMY_PASSWORD_HASH);

  if (!user || !passwordMatches) {
    throw new AppError(401, INVALID_CREDENTIALS);
  }

  const { password: _password, updatedAt: _updatedAt, ...publicUser } = user;
  return publicUser;
}

export function findUserById(id: number): Promise<AuthUser | null> {
  return prisma.user.findUnique({ where: { id }, select: publicUserSelect });
}
