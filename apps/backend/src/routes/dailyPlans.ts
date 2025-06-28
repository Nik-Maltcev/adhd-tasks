import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { 
  getTodayPlan,
  generatePlan,
  getPlanByDate,
  updatePlan,
  updatePlanTask,
  getPlanHistory
} from '../controllers/dailyPlanController';
import { authenticate } from '../middleware/auth';
import { ErrorCode, TaskStatus } from '../types';

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

// Date parameter validation
const dateParamValidation = [
  param('date')
    .isString()
    .withMessage('Date parameter is required')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date must be in YYYY-MM-DD format')
];

// Plan ID validation
const planIdValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid plan ID format')
];

// Plan task update validation
const planTaskUpdateValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid plan ID format'),
  param('taskId')
    .isUUID()
    .withMessage('Invalid task ID format'),
  body('isCompleted')
    .optional()
    .isBoolean()
    .withMessage('isCompleted must be a boolean'),
  body('order')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Order must be a positive integer'),
  body('recommendedStartTime')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Start time must be in HH:MM format (24-hour)'),
  body('recommendedEndTime')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('End time must be in HH:MM format (24-hour)'),
  body('aiAdvice')
    .optional()
    .isString()
    .withMessage('AI advice must be a string')
];

// Plan update validation
const planUpdateValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid plan ID format'),
  body('isCompleted')
    .optional()
    .isBoolean()
    .withMessage('isCompleted must be a boolean'),
  body('tasks')
    .optional()
    .isArray()
    .withMessage('Tasks must be an array'),
  body('tasks.*.taskId')
    .optional()
    .isUUID()
    .withMessage('Task ID must be a valid UUID'),
  body('tasks.*.isCompleted')
    .optional()
    .isBoolean()
    .withMessage('Task completion status must be a boolean'),
  body('tasks.*.order')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Task order must be a positive integer'),
  body('tasks.*.recommendedStartTime')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Start time must be in HH:MM format (24-hour)'),
  body('tasks.*.recommendedEndTime')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('End time must be in HH:MM format (24-hour)'),
  body('tasks.*.aiAdvice')
    .optional()
    .isString()
    .withMessage('AI advice must be a string')
];

// Generate plan validation
const generatePlanValidation = [
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be in ISO format (YYYY-MM-DD)')
];

// History query validation
const historyQueryValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be in ISO format (YYYY-MM-DD)'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be in ISO format (YYYY-MM-DD)'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 31 })
    .withMessage('Page size must be between 1 and 31')
];

// Routes with authentication and validation
// GET /daily-plans/today - Get today's plan
router.get(
  '/today',
  authenticate,
  getTodayPlan
);

// POST /daily-plans/generate - Generate a new plan
router.post(
  '/generate',
  authenticate,
  generatePlanValidation,
  validateRequest,
  generatePlan
);

// GET /daily-plans/history - Get plan history with analytics
router.get(
  '/history',
  authenticate,
  historyQueryValidation,
  validateRequest,
  getPlanHistory
);

// GET /daily-plans/:date - Get plan for a specific date
router.get(
  '/:date',
  authenticate,
  dateParamValidation,
  validateRequest,
  getPlanByDate
);

// PUT /daily-plans/:id - Update a plan
router.put(
  '/:id',
  authenticate,
  planUpdateValidation,
  validateRequest,
  updatePlan
);

// PATCH /daily-plans/:id/tasks/:taskId - Update a specific task in a plan
router.patch(
  '/:id/tasks/:taskId',
  authenticate,
  planTaskUpdateValidation,
  validateRequest,
  updatePlanTask
);

export default router;
