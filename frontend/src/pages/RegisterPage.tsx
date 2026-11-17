import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { Button } from '../components/common/Button';
import { FormError } from '../components/common/FormError';
import { Input } from '../components/common/Input';
import { useToast } from '../hooks/useToast';
import { AuthLayout } from '../components/layout/AuthLayout';
import { useRegister } from '../hooks/useAuth';
import { registerSchema, type RegisterValues } from '../schemas/auth';
import { getErrorMessage } from '../services/api';
import { applyServerFieldErrors } from '../utils/forms';

export function RegisterPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const registerUser = useRegister();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', passwordConfirmation: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const user = await registerUser.mutateAsync(values);
      toast.success(`Welcome to TaskFlow, ${user.name}!`);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      if (!applyServerFieldErrors(error, setError, ['name', 'email', 'password', 'passwordConfirmation'])) {
        setFormError(getErrorMessage(error));
      }
    }
  });

  return (
    <AuthLayout
      title="Create your account"
      subtitle={
        <>
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormError message={formError} />
        <Input label="Full name" autoComplete="name" error={errors.name?.message} {...register('name')} />
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
          autoComplete="new-password"
          hint="At least 8 characters."
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          error={errors.passwordConfirmation?.message}
          {...register('passwordConfirmation')}
        />
        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  );
}
