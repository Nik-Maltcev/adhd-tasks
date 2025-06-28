import { Request, Response, NextFunction } from 'express';
import { extractTokenFromHeader, verifyToken, createAuthError } from '../utils/auth';
import { AuthenticatedRequest, JWTPayload, ErrorCode } from '../types';

/**
 * Middleware to authenticate requests using JWT
 * - Extracts token from Authorization header
 * - Verifies token validity
 * - Attaches user data to request object
 * - Rejects unauthorized requests
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Extract token from Authorization header
    const token = extractTokenFromHeader(req.headers.authorization);
    
    // If no token is provided, return unauthorized error
    if (!token) {
      const error = createAuthError('Authentication required. Please provide a valid token.');
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: error.message
        }
      });
      return;
    }
    
    // Verify token and extract user data
    const userData: JWTPayload = verifyToken(token);
    
    // Attach user data to request object
    (req as AuthenticatedRequest).user = userData;
    
    // Continue to the next middleware or route handler
    next();
  } catch (error: any) {
    // Handle token verification errors
    const statusCode = error.statusCode || 401;
    const errorCode = error.code || ErrorCode.UNAUTHORIZED;
    
    res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: error.message || 'Authentication failed'
      }
    });
  }
};

/**
 * Optional authentication middleware
 * - Attaches user data to request if token is valid
 * - Continues without error if no token or invalid token
 * - Useful for routes that can work with or without authentication
 */
export const optionalAuthenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Extract token from Authorization header
    const token = extractTokenFromHeader(req.headers.authorization);
    
    // If token exists, verify and attach user data
    if (token) {
      const userData: JWTPayload = verifyToken(token);
      (req as AuthenticatedRequest).user = userData;
    }
    
    // Always continue to next middleware
    next();
  } catch (error) {
    // On verification error, continue without user data
    next();
  }
};

/**
 * Role-based authorization middleware factory
 * - Creates middleware that checks if authenticated user has required role
 * - Must be used after authenticate middleware
 * 
 * @param requiredRoles - Array of roles allowed to access the route
 */
export const authorize = (requiredRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authenticatedReq = req as AuthenticatedRequest;
    
    // Check if user exists (should be added by authenticate middleware)
    if (!authenticatedReq.user) {
      const error = createAuthError('Authentication required', 401);
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: error.message
        }
      });
      return;
    }
    
    // For future role implementation
    // const userRole = authenticatedReq.user.role;
    
    // if (!requiredRoles.includes(userRole)) {
    //   const error = createAuthError('Insufficient permissions to access this resource', 403);
    //   res.status(error.statusCode).json({
    //     success: false,
    //     error: {
    //       code: ErrorCode.FORBIDDEN,
    //       message: error.message
    //     }
    //   });
    //   return;
    // }
    
    // For now, just pass through since we don't have roles yet
    next();
  };
};
