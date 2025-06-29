import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { 
  getProjects, 
  getProjectById, 
  createProject, 
  updateProject, 
  deleteProject, 
  getProjectStats,
  changeProjectStatus
} from '../controllers/projectController';
import { authenticate } from '../middleware/auth';
// Error codes remain in the shared types, but enum definitions are loaded
// from mockData so the validation works in both mock and real DB modes.
import { ErrorCode } from '../types';
import {
  ProjectPriority,
  ProjectCategory,
  ProjectStatus,
} from '../lib/mockData';

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

// Project creation validation
const createProjectValidation = [
  body('name')
    .notEmpty()
    .withMessage('Project name is required')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Project name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string'),
  body('goal')
    .optional()
    .isString()
    .withMessage('Goal must be a string'),
  body('priority')
    .optional()
    .isIn(Object.values(ProjectPriority))
    .withMessage('Invalid priority value'),
  body('category')
    .optional()
    .isIn(Object.values(ProjectCategory))
    .withMessage('Invalid category value'),
  body('softDeadline')
    .optional()
    .isISO8601()
    .withMessage('Soft deadline must be a valid date'),
  body('hardDeadline')
    .optional()
    .isISO8601()
    .withMessage('Hard deadline must be a valid date')
];

// Project update validation
const updateProjectValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid project ID format'),
  body('name')
    .optional()
    .notEmpty()
    .withMessage('Project name cannot be empty')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Project name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string'),
  body('goal')
    .optional()
    .isString()
    .withMessage('Goal must be a string'),
  body('priority')
    .optional()
    .isIn(Object.values(ProjectPriority))
    .withMessage('Invalid priority value'),
  body('category')
    .optional()
    .isIn(Object.values(ProjectCategory))
    .withMessage('Invalid category value'),
  body('status')
    .optional()
    .isIn(Object.values(ProjectStatus))
    .withMessage('Invalid status value'),
  body('softDeadline')
    .optional({ nullable: true })
    .if(body('softDeadline').exists())
    .isISO8601()
    .withMessage('Soft deadline must be a valid date'),
  body('hardDeadline')
    .optional({ nullable: true })
    .if(body('hardDeadline').exists())
    .isISO8601()
    .withMessage('Hard deadline must be a valid date')
];

// Project status change validation
const changeStatusValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid project ID format'),
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(Object.values(ProjectStatus))
    .withMessage('Invalid status value')
];

// Project ID param validation
const projectIdValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid project ID format')
];

// Projects list query validation
const listProjectsValidation = [
  query('status')
    .optional()
    .isIn(Object.values(ProjectStatus))
    .withMessage('Invalid status filter'),
  query('category')
    .optional()
    .isIn(Object.values(ProjectCategory))
    .withMessage('Invalid category filter'),
  query('priority')
    .optional()
    .isIn(Object.values(ProjectPriority))
    .withMessage('Invalid priority filter'),
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
    .isIn(['name', 'createdAt', 'updatedAt', 'priority', 'category', 'status'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

// Routes with authentication and validation
// GET /projects - List all projects with filters and pagination
router.get(
  '/',
  authenticate,
  listProjectsValidation,
  validateRequest,
  getProjects
);

// POST /projects - Create a new project
router.post(
  '/',
  authenticate,
  createProjectValidation,
  validateRequest,
  createProject
);

// GET /projects/stats - Get project statistics
router.get(
  '/stats',
  authenticate,
  getProjectStats
);

// GET /projects/:id - Get a single project by ID
router.get(
  '/:id',
  authenticate,
  projectIdValidation,
  validateRequest,
  getProjectById
);

// PUT /projects/:id - Update a project
router.put(
  '/:id',
  authenticate,
  updateProjectValidation,
  validateRequest,
  updateProject
);

// DELETE /projects/:id - Delete a project
router.delete(
  '/:id',
  authenticate,
  projectIdValidation,
  validateRequest,
  deleteProject
);

// PATCH /projects/:id/status - Change project status
router.patch(
  '/:id/status',
  authenticate,
  changeStatusValidation,
  validateRequest,
  changeProjectStatus
);

export default router;
