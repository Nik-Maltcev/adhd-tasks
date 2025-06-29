import { Request, Response } from 'express';
import db from '../lib/database';
import { 
  hashPassword, 
  verifyPassword, 
  generateToken, 
  validatePasswordStrength 
} from '../utils/auth';
import { 
  RegisterDTO, 
  LoginDTO, 
  AuthResponse, 
  AuthenticatedRequest,
  ErrorCode,
  UserDTO
} from '../types';

/**
 * Register a new user
 * - Validates email and password
 * - Creates user record
 * - Creates default user preferences
 * - Generates JWT token
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name }: RegisterDTO = req.body;

    // Validate email
    if (!email || !validateEmail(email)) {
      res.status(400).json({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Please provide a valid email address'
        }
      });
      return;
    }

    // Validate password
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: passwordValidation.message || 'Invalid password'
        }
      });
      return;
    }

    // Check if user already exists
    const existingUser = await db.findUserByEmail(email);

    if (existingUser) {
      res.status(409).json({
        success: false,
        error: {
          code: ErrorCode.CONFLICT,
          message: 'A user with this email already exists'
        }
      });
      return;
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const newUser = await db.createUser({
      email,
      passwordHash,
      name: name || null,
    });

    // Create default user preferences
    await db.createUserPreferences({
      userId: newUser.id,
      maxTasksPerDay: 5,
      maxWorkHoursPerDay: 8.0,
      preferredProjectsPerDay: 3,
      complexToSimpleRatio: 0.5,
      preferredTimeBlocks: {},
      shortTermGoals: [],
      longTermGoals: [],
      personalValues: []
    });

    // Generate JWT token
    const token = generateToken({
      userId: newUser.id,
      email: newUser.email
    });

    // Return user data and token
    const userResponse: UserDTO = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt
    };

    res.status(201).json({
      success: true,
      data: {
        token,
        user: userResponse
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to register user'
      }
    });
  }
};

/**
 * Login user
 * - Validates credentials
 * - Generates JWT token
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: LoginDTO = req.body;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Email and password are required'
        }
      });
      return;
    }

    // Find user by email
    const user = await db.findUserByEmail(email);

    // Check if user exists
    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: 'Invalid email or password'
        }
      });
      return;
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: 'Invalid email or password'
        }
      });
      return;
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email
    });

    // Prepare user response without sensitive data
    const userPreferences = await db.findUserPreferences(user.id);

    const userResponse: UserDTO = {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      preferences: userPreferences ? {
        id: userPreferences.id,
        userId: userPreferences.userId,
        maxTasksPerDay: userPreferences.maxTasksPerDay,
        maxWorkHoursPerDay: userPreferences.maxWorkHoursPerDay,
        preferredTimeBlocks: userPreferences.preferredTimeBlocks,
        peakProductivityStart: userPreferences.peakProductivityStart,
        peakProductivityEnd: userPreferences.peakProductivityEnd,
        preferredProjectsPerDay: userPreferences.preferredProjectsPerDay,
        complexToSimpleRatio: userPreferences.complexToSimpleRatio,
        shortTermGoals: userPreferences.shortTermGoals,
        longTermGoals: userPreferences.longTermGoals,
        personalValues: userPreferences.personalValues,
        createdAt: userPreferences.createdAt,
        updatedAt: userPreferences.updatedAt
      } : null
    };

    // Return user data and token
    res.status(200).json({
      success: true,
      data: {
        token,
        user: userResponse
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to process login'
      }
    });
  }
};

/**
 * Get current user profile
 * - Requires authentication
 * - Returns user data with preferences
 */
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    
    if (!user || !user.userId) {
      res.status(401).json({
        success: false,
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: 'Authentication required'
        }
      });
      return;
    }

    // Get user with preferences
    const userWithPreferences = await db.findUserById(user.userId);

    if (!userWithPreferences) {
      res.status(404).json({
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: 'User not found'
        }
      });
      return;
    }

    // Prepare user response without sensitive data
    const userResponse: UserDTO = {
      id: userWithPreferences.id,
      email: userWithPreferences.email,
      name: userWithPreferences.name,
      createdAt: userWithPreferences.createdAt,
      updatedAt: userWithPreferences.updatedAt,
      preferences: userWithPreferences.preferences ? {
        id: userWithPreferences.preferences.id,
        userId: userWithPreferences.preferences.userId,
        maxTasksPerDay: userWithPreferences.preferences.maxTasksPerDay,
        maxWorkHoursPerDay: userWithPreferences.preferences.maxWorkHoursPerDay,
        preferredTimeBlocks: userWithPreferences.preferences.preferredTimeBlocks,
        peakProductivityStart: userWithPreferences.preferences.peakProductivityStart,
        peakProductivityEnd: userWithPreferences.preferences.peakProductivityEnd,
        preferredProjectsPerDay: userWithPreferences.preferences.preferredProjectsPerDay,
        complexToSimpleRatio: userWithPreferences.preferences.complexToSimpleRatio,
        shortTermGoals: userWithPreferences.preferences.shortTermGoals,
        longTermGoals: userWithPreferences.preferences.longTermGoals,
        personalValues: userWithPreferences.preferences.personalValues,
        createdAt: userWithPreferences.preferences.createdAt,
        updatedAt: userWithPreferences.preferences.updatedAt
      } : null
    };

    res.status(200).json({
      success: true,
      data: userResponse
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve user profile'
      }
    });
  }
};

/**
 * Update user password
 * - Requires authentication
 * - Validates current password
 * - Updates to new password
 */
export const updatePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { currentPassword, newPassword } = req.body;
    
    if (!user || !user.userId) {
      res.status(401).json({
        success: false,
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: 'Authentication required'
        }
      });
      return;
    }

    // Validate required fields
    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Current password and new password are required'
        }
      });
      return;
    }

    // Validate new password
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: passwordValidation.message || 'Invalid new password'
        }
      });
      return;
    }

    // Get user
    const userRecord = await db.findUserById(user.userId);

    if (!userRecord) {
      res.status(404).json({
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: 'User not found'
        }
      });
      return;
    }

    // Verify current password
    const isPasswordValid = await verifyPassword(currentPassword, userRecord.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: 'Current password is incorrect'
        }
      });
      return;
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await db.updateUser(user.userId, { passwordHash: newPasswordHash });

    res.status(200).json({
      success: true,
      data: { message: 'Password updated successfully' }
    });
  } catch (error: any) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to update password'
      }
    });
  }
};

/**
 * Validate email format
 * @param email - Email to validate
 * @returns Boolean indicating if email is valid
 */
const validateEmail = (email: string): boolean => {
  // Basic email validation regex
  // For ADHD users, we want to be accommodating but still ensure valid format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
