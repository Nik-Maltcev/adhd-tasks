import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { 
  getTasks, 
  getTaskById, 
  createTask, 
  updateTask, 
  deleteTask, 
  changeTaskStatus,
  manageTaskDependencies,
  getTaskStats
} from '../controllers/taskController';
import { authenticate } from '../middleware/auth';
import { ErrorCode, TaskStatus, TaskComplexity, EnergyType } from '../types';

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

// Task creation validation
const createTaskValidation = [
  body('name')
    .notEmpty()
    .withMessage('Task name is required')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Task name must be between 1 and 200 characters'),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string'),
  body('priority')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Priority must be an integer between 1 and 5'),
  body('complexity')
    .optional()
    .isIn(Object.values(TaskComplexity))
    .withMessage('Invalid complexity value'),
  body('energyType')
    .optional()
    .isIn(Object.values(EnergyType))
    .withMessage('Invalid energy type value'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('projectId')
    .notEmpty()
    .withMessage('Project ID is required')
    .isUUID()
    .withMessage('Invalid project ID format'),
  body('dependsOnTaskIds')
    .optional()
    .isArray()
    .withMessage('Dependencies must be an array')
];

// Task update validation
const updateTaskValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid task ID format'),
  body('name')
    .optional()
    .notEmpty()
    .withMessage('Task name cannot be empty')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Task name must be between 1 and 200 characters'),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string'),
  body('priority')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Priority must be an integer between 1 and 5'),
  body('complexity')
    .optional()
    .isIn(Object.values(TaskComplexity))
    .withMessage('Invalid complexity value'),
  body('energyType')
    .optional()
    .isIn(Object.values(EnergyType))
    .withMessage('Invalid energy type value'),
  body('status')
    .optional()
    .isIn(Object.values(TaskStatus))
    .withMessage('Invalid status value'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('projectId')
    .optional()
    .isUUID()
    .withMessage('Invalid project ID format'),
  body('dependsOnTaskIds')
    .optional()
    .isArray()
    .withMessage('Dependencies must be an array')
];

// Task status change validation
const changeStatusValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid task ID format'),
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(Object.values(TaskStatus))
    .withMessage('Invalid status value')
];

// Task dependencies validation
const dependenciesValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid task ID format'),
  body('dependsOnTaskIds')
    .isArray()
    .withMessage('dependsOnTaskIds must be an array'),
  body('operation')
    .isIn(['add', 'remove', 'set'])
    .withMessage('Operation must be "add", "remove", or "set"')
];

// Task ID param validation
const taskIdValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid task ID format')
];

// Tasks list query validation
const listTasksValidation = [
  query('status')
    .optional()
    .isIn(Object.values(TaskStatus))
    .withMessage('Invalid status filter'),
  query('projectId')
    .optional()
    .isUUID()
    .withMessage('Invalid project ID format'),
  query('complexity')
    .optional()
    .isIn(Object.values(TaskComplexity))
    .withMessage('Invalid complexity filter'),
  query('energyType')
    .optional()
    .isIn(Object.values(EnergyType))
    .withMessage('Invalid energy type filter'),
  query('priorityMin')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Minimum priority must be between 1 and 5'),
  query('priorityMax')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Maximum priority must be between 1 and 5'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Page size must be between 1 and 100'),
  query('sortBy')
    .optional()
    .isIn(['name', 'createdAt', 'updatedAt', 'priority', 'complexity', 'energyType', 'status'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

// Routes with authentication and validation
// GET /tasks - List all tasks with filters and pagination
router.get(
  '/',
  authenticate,
  listTasksValidation,
  validateRequest,
  getTasks
);

// POST /tasks - Create a new task
router.post(
  '/',
  authenticate,
  createTaskValidation,
  validateRequest,
  createTask
);

// GET /tasks/stats - Get task statistics
router.get(
  '/stats',
  authenticate,
  getTaskStats
);

// GET /tasks/:id - Get a single task by ID
router.get(
  '/:id',
  authenticate,
  taskIdValidation,
  validateRequest,
  getTaskById
);

// PUT /tasks/:id - Update a task
router.put(
  '/:id',
  authenticate,
  updateTaskValidation,
  validateRequest,
  updateTask
);

// DELETE /tasks/:id - Delete a task
router.delete(
  '/:id',
  authenticate,
  taskIdValidation,
  validateRequest,
  deleteTask
);

// PATCH /tasks/:id/status - Change task status
router.patch(
  '/:id/status',
  authenticate,
  changeStatusValidation,
  validateRequest,
  changeTaskStatus
);

// POST /tasks/:id/dependencies - Manage task dependencies
router.post(
  '/:id/dependencies',
  authenticate,
  dependenciesValidation,
  validateRequest,
  manageTaskDependencies
);

export default router;
