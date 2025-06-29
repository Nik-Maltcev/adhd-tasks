import React from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { clsx } from 'clsx';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuthStore();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: any) => {
    try {
      await login(data.email, data.password);
      navigate('/dashboard');
    } catch (err) {
      // Error handled by interceptor and toast in authStore
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 font-heading">
            Welcome Back!
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400">
            Log in to manage your tasks with AI.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className={clsx(
                'mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm transition-colors duration-200',
                'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100',
                errors.email && 'border-red-500 focus:ring-red-500 focus:border-red-500'
              )}
              {...register('email', { 
                required: 'Email is required', 
                pattern: {
                  value: /^\S+@\S+$/i,
                  message: 'Please enter a valid email'
                }
              })}
              aria-invalid={errors.email ? 'true' : 'false'}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-500" role="alert">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              className={clsx(
                'mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm transition-colors duration-200',
                'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100',
                errors.password && 'border-red-500 focus:ring-red-500 focus:border-red-500'
              )}
              {...register('password', { required: 'Password is required' })}
              aria-invalid={errors.password ? 'true' : 'false'}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-500" role="alert">{errors.password.message}</p>
            )}
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center" role="alert">{error}</div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={clsx(
              'w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200',
              isLoading && 'opacity-70 cursor-not-allowed'
            )}
            aria-busy={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Logging in...</span>
              </div>
            ) : (
              'Log In'
            )}
          </button>
        </form>

        <div className="text-center text-sm text-gray-600 dark:text-gray-400 space-y-4">
          <p>
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-primary hover:text-primary-dark transition-colors duration-200">
              Sign Up
            </Link>
          </p>
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
            <p className="font-semibold mb-1 text-gray-700 dark:text-gray-300">Demo Credentials:</p>
            <p className="text-xs font-mono bg-gray-200 dark:bg-gray-700 p-1 rounded">
              Email: demo@adhd-tasks.com
            </p>
            <p className="text-xs font-mono bg-gray-200 dark:bg-gray-700 p-1 rounded mt-1">
              Password: Password123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
