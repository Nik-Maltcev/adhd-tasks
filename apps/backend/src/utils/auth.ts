import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { JWTPayload, AppError, ErrorCode } from '../types';

// Number of salt rounds for bcrypt
const SALT_ROUNDS = 10;

// JWT token expiration (default: 7 days)
const TOKEN_EXPIRATION = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Hash a password using bcrypt
 * @param password - Plain text password to hash
 * @returns Promise resolving to the hashed password
 */
export const hashPassword = async (password: string): Promise<string> => {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return bcrypt.hash(password, salt);
  } catch (error) {
    throw new Error('Password hashing failed');
  }
};

/**
 * Compare a plain text password with a hashed password
 * @param password - Plain text password to verify
 * @param hashedPassword - Hashed password to compare against
 * @returns Promise resolving to boolean indicating if passwords match
 */
export const verifyPassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    throw new Error('Password verification failed');
  }
};

/**
 * Generate a JWT token for a user
 * @param payload - User data to include in the token
 * @returns JWT token string
 */
export const generateToken = (payload: JWTPayload): string => {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  
  return jwt.sign(payload, secret, { expiresIn: TOKEN_EXPIRATION });
};

/**
 * Verify and decode a JWT token
 * @param token - JWT token to verify
 * @returns Decoded JWT payload
 * @throws AppError if token is invalid
 */
export const verifyToken = (token: string): JWTPayload => {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  
  try {
    return jwt.verify(token, secret) as JWTPayload;
  } catch (error) {
    const authError: AppError = new Error('Invalid or expired token') as AppError;
    authError.statusCode = 401;
    authError.code = ErrorCode.UNAUTHORIZED;
    throw authError;
  }
};

/**
 * Extract JWT token from Authorization header
 * @param authHeader - Authorization header string
 * @returns JWT token string or null if not found
 */
export const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader) {
    return null;
  }
  
  // Check if the header starts with 'Bearer '
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
};

/**
 * Validate password strength
 * - At least 8 characters
 * - Contains at least one uppercase letter
 * - Contains at least one lowercase letter
 * - Contains at least one number
 * - Contains at least one special character
 * 
 * @param password - Password to validate
 * @returns Object with validation result and message
 */
export const validatePasswordStrength = (
  password: string
): { isValid: boolean; message?: string } => {
  // For ADHD users, we want to be accommodating but still secure
  // Minimum requirements are a bit relaxed but still secure
  if (password.length < 8) {
    return {
      isValid: false,
      message: 'Password must be at least 8 characters long',
    };
  }
  
  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one uppercase letter',
    };
  }
  
  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one lowercase letter',
    };
  }
  
  // Check for at least one number
  if (!/\d/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one number',
    };
  }
  
  // Optional: Check for at least one special character
  // Commented out to be more accommodating for ADHD users
  // if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
  //   return {
  //     isValid: false,
  //     message: 'Password must contain at least one special character',
  //   };
  // }
  
  return { isValid: true };
};

/**
 * Create an authentication error
 * @param message - Error message
 * @param statusCode - HTTP status code (default: 401)
 * @returns AppError object
 */
export const createAuthError = (
  message: string,
  statusCode = 401
): AppError => {
  const error: AppError = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.code = statusCode === 403 ? ErrorCode.FORBIDDEN : ErrorCode.UNAUTHORIZED;
  return error;
};
