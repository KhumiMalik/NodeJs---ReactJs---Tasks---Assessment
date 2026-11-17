import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router';
import { Button } from '../components/common/Button';
import { FormError } from '../components/common/FormError';
import { Input } from '../components/common/Input';
import { useToast } from '../hooks/useToast';
import { AuthLayout } from '../components/layout/AuthLayout';
import { useLogin } from '../hooks/useAuth';
import { loginSchema, type LoginValues } from '../schemas/auth';
import { getErrorMessage } from '../services/api';
import { applyServerFieldErrors } from '../utils/forms';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const login = useLogin();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const user = await login.mutateAsync(values);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      if (!applyServerFieldErrors(error, setError, ['email', 'password'])) {
        setFormError(getErrorMessage(error));
      }
    }
  });

  return (
    <AuthLayout
      title="Sign in to your account"
      subtitle={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormError message={formError} />
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
        {import.meta.env.DEV && (
          <p className="rounded-lg bg-slate-100 p-3 text-center text-xs text-slate-600">
            Development seed account: <span className="font-mono">demo@example.com</span> /{' '}
            <span className="font-mono">password123</span>
          </p>
        )}
      </form>
    </AuthLayout>
  );
}
