import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { loginFormSchema, type LoginFormValues } from './authSchema';
import { useSession } from './useSession';
import { apiErrorMessage } from './auth.api';

export function LoginForm() {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginFormSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    try {
      await signIn(values.email, values.password);
      navigate('/', { replace: true });
    } catch (err) {
      setFormError(apiErrorMessage(err));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className="w-full"
          {...register('email')}
          aria-invalid={errors.email ? true : undefined}
        />
        {errors.email ? <p role="alert" className="alert-field">{errors.email.message}</p> : null}
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            className="w-full pr-16"
            {...register('password')}
            aria-invalid={errors.password ? true : undefined}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-3 text-xs font-medium text-brand-600 transition hover:text-brand-700"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword((s) => !s)}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        {errors.password ? <p role="alert" className="alert-field">{errors.password.message}</p> : null}
      </div>

      {formError ? (
        <p role="alert" className="alert-error">
          {formError}
        </p>
      ) : null}

      <Button type="submit" loading={isSubmitting} className="w-full">
        Sign in
      </Button>
    </form>
  );
}
