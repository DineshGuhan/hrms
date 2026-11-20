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
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register('email')}
          aria-invalid={errors.email ? true : undefined}
        />
        {errors.email ? <p role="alert">{errors.email.message}</p> : null}
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <div>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            {...register('password')}
            aria-invalid={errors.password ? true : undefined}
          />
          <button
            type="button"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword((s) => !s)}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        {errors.password ? <p role="alert">{errors.password.message}</p> : null}
      </div>

      {formError ? (
        <p role="alert" className="form-error">
          {formError}
        </p>
      ) : null}

      <Button type="submit" loading={isSubmitting}>
        Sign in
      </Button>
    </form>
  );
}
