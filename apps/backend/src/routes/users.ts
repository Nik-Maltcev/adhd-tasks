import express from 'express';
import { body, validationResult } from 'express-validator';
import { 
  getUserPreferences, 
  updateUserPreferences, 
  getUserStats,
  updateUserProfile
} from '../controllers/userController';
import { authenticate } from '../middleware/auth';
import { ErrorCode } from '../types';

const router = express.Router();

// Validation middleware
const validateRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Validation error',
        details: errors.array()
      }
    });
  }
  next();
};

// User preferences update validation
const updatePreferencesValidation = [
  body('maxTasksPerDay')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Maximum tasks per day must be between 1 and 20'),
  body('maxWorkHoursPerDay')
    .optional()
    .isFloat({ min: 0.5, max: 16 })
    .withMessage('Maximum work hours per day must be between 0.5 and 16'),
  body('preferredProjectsPerDay')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Preferred projects per day must be between 1 and 10'),
  body('complexToSimpleRatio')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Complex to simple ratio must be between 0 and 1'),
  body('peakProductivityStart')
    .optional({ nullable: true })
    .if(body('peakProductivityStart').exists().notEmpty())
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Peak productivity start time must be in HH:MM format (24-hour)'),
  body('peakProductivityEnd')
    .optional({ nullable: true })
    .if(body('peakProductivityEnd').exists().notEmpty())
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Peak productivity end time must be in HH:MM format (24-hour)'),
  body('preferredTimeBlocks')
    .optional()
    .isObject()
    .withMessage('Preferred time blocks must be an object'),
  body('shortTermGoals')
    .optional()
    .isArray()
    .withMessage('Short term goals must be an array'),
  body('longTermGoals')
    .optional()
    .isArray()
    .withMessage('Long term goals must be an array'),
  body('personalValues')
    .optional()
    .isArray()
    .withMessage('Personal values must be an array')
];

// User profile update validation
const updateProfileValidation = [
  body('name')
    .optional({ nullable: true })
    .if(body('name').exists().notEmpty())
    .isString()
    .withMessage('Name must be a string')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('currentPassword')
    .optional()
    .if(body('email').exists())
    .notEmpty()
    .withMessage('Current password is required when changing email')
];

// Routes with authentication and validation
// GET /users/preferences - Get user preferences
router.get(
  '/preferences',
  authenticate,
  getUserPreferences
);

// PUT /users/preferences - Update user preferences
router.put(
  '/preferences',
  authenticate,
  updatePreferencesValidation,
  validateRequest,
  updateUserPreferences
);

// GET /users/stats - Get user statistics
router.get(
  '/stats',
  authenticate,
  getUserStats
);

// PUT /users/profile - Update user profile
router.put(
  '/profile',
  authenticate,
  updateProfileValidation,
  validateRequest,
  updateUserProfile
);

export default router;
