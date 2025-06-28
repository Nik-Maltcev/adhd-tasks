import { Request, Response } from 'express';
import { PrismaClient, TaskStatus, TaskComplexity, EnergyType } from '@prisma/client';
import { 
  AuthenticatedRequest, 
  CreateTaskDTO, 
  UpdateTaskDTO, 
  TaskDTO,
  ErrorCode,
  PaginationParams
} from '../types';

const prisma = new PrismaClient();

/**
 * Get all tasks for the authenticated user
 * Supports filtering by status, project, complexity, energy type
 * Supports pagination and sorting
 */
export const getTasks = async (req: Request, res: Response): Promise<void> => {
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

    // Extract filter parameters
    const status = req.query.status as TaskStatus | undefined;
    const projectId = req.query.projectId as string | undefined;
    const complexity = req.query.complexity as TaskComplexity | undefined;
    const energyType = req.query.energyType as EnergyType | undefined;
    const search = req.query.search as string | undefined;
    const tag = req.query.tag as string | undefined;
    const priorityMin = req.query.priorityMin ? parseInt(req.query.priorityMin as string, 10) : undefined;
    const priorityMax = req.query.priorityMax ? parseInt(req.query.priorityMax as string, 10) : undefined;
    
    // Extract pagination parameters
    const page = parseInt(req.query.page as string || '1', 10);
    const pageSize = parseInt(req.query.pageSize as string || '20', 10);
    const sortBy = req.query.sortBy as string || 'priority';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

    // Build filter conditions
    const where: any = {
      userId: user.userId,
      ...(status && { status }),
      ...(projectId && { projectId }),
      ...(complexity && { complexity }),
      ...(energyType && { energyType }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(tag && {
        tags: {
          array_contains: tag
        }
      }),
      ...(priorityMin !== undefined && priorityMax !== undefined && {
        priority: {
          gte: priorityMin,
          lte: priorityMax
        }
      }),
      ...(priorityMin !== undefined && priorityMax === undefined && {
        priority: {
          gte: priorityMin
        }
      }),
      ...(priorityMin === undefined && priorityMax !== undefined && {
        priority: {
          lte: priorityMax
        }
      })
    };

    // Count total tasks matching filters
    const totalTasks = await prisma.task.count({ where });
    
    // Calculate pagination values
    const skip = (page - 1) * pageSize;
    const take = pageSize;
    const totalPages = Math.ceil(totalTasks / pageSize);

    // Get tasks with pagination and sorting
    const tasks = await prisma.task.findMany({
      where,
      orderBy: {
        [sortBy]: sortOrder
      },
      skip,
      take,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            priority: true,
            category: true
          }
        }
      }
    });

    // Transform to DTOs
    const taskDTOs = tasks.map(task => ({
      id: task.id,
      name: task.name,
      description: task.description,
      priority: task.priority,
      complexity: task.complexity,
      energyType: task.energyType,
      status: task.status,
      tags: task.tags as string[] | undefined,
      projectId: task.projectId,
      userId: task.userId,
      completedAt: task.completedAt,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      project: {
        id: task.project.id,
        name: task.project.name,
        priority: task.project.priority,
        category: task.project.category
      }
    }));

    res.status(200).json({
      success: true,
      data: {
        items: taskDTOs,
        total: totalTasks,
        page,
        pageSize,
        totalPages
      }
    });
  } catch (error: any) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve tasks'
      }
    });
  }
};

/**
 * Get a single task by ID with its dependencies
 * Ensures the task belongs to the authenticated user
 */
export const getTaskById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { id } = req.params;
    
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

    // Get task with project and dependencies
    const task = await prisma.task.findUnique({
      where: {
        id
      },
      include: {
        project: true,
        dependsOn: {
          include: {
            dependsOnTask: true
          }
        },
        dependedOnBy: {
          include: {
            task: true
          }
        }
      }
    });

    // Check if task exists
    if (!task) {
      res.status(404).json({
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: 'Task not found'
        }
      });
      return;
    }

    // Check ownership
    if (task.userId !== user.userId) {
      res.status(403).json({
        success: false,
        error: {
          code: ErrorCode.FORBIDDEN,
          message: 'You do not have permission to access this task'
        }
      });
      return;
    }

    // Transform to DTO
    const taskDTO: TaskDTO = {
      id: task.id,
      name: task.name,
      description: task.description,
      priority: task.priority,
      complexity: task.complexity,
      energyType: task.energyType,
      status: task.status,
      tags: task.tags as string[] | undefined,
      projectId: task.projectId,
      userId: task.userId,
      completedAt: task.completedAt,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      project: {
        id: task.project.id,
        name: task.project.name,
        description: task.project.description,
        goal: task.project.goal,
        priority: task.project.priority,
        category: task.project.category,
        status: task.project.status,
        softDeadline: task.project.softDeadline,
        hardDeadline: task.project.hardDeadline,
        userId: task.project.userId,
        createdAt: task.project.createdAt,
        updatedAt: task.project.updatedAt
      },
      dependencies: task.dependsOn.map(dep => ({
        id: dep.dependsOnTask.id,
        name: dep.dependsOnTask.name,
        status: dep.dependsOnTask.status,
        priority: dep.dependsOnTask.priority,
        projectId: dep.dependsOnTask.projectId,
        userId: dep.dependsOnTask.userId,
        complexity: dep.dependsOnTask.complexity,
        energyType: dep.dependsOnTask.energyType,
        createdAt: dep.dependsOnTask.createdAt,
        updatedAt: dep.dependsOnTask.updatedAt
      })),
      dependedOnBy: task.dependedOnBy.map(dep => ({
        id: dep.task.id,
        name: dep.task.name,
        status: dep.task.status,
        priority: dep.task.priority,
        projectId: dep.task.projectId,
        userId: dep.task.userId,
        complexity: dep.task.complexity,
        energyType: dep.task.energyType,
        createdAt: dep.task.createdAt,
        updatedAt: dep.task.updatedAt
      }))
    };

    res.status(200).json({
      success: true,
      data: taskDTO
    });
  } catch (error: any) {
    console.error('Get task by ID error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve task'
      }
    });
  }
};

/**
 * Create a new task for the authenticated user
 * Validates required fields and sets defaults
 */
export const createTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const taskData: CreateTaskDTO = req.body;
    
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
    if (!taskData.name || taskData.name.trim() === '') {
      res.status(400).json({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Task name is required'
        }
      });
      return;
    }

    if (!taskData.projectId) {
      res.status(400).json({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Project ID is required'
        }
      });
      return;
    }

    // Check if project exists and belongs to user
    const project = await prisma.project.findUnique({
      where: {
        id: taskData.projectId
      }
    });

    if (!project) {
      res.status(404).json({
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: 'Project not found'
        }
      });
      return;
    }

    if (project.userId !== user.userId) {
      res.status(403).json({
        success: false,
        error: {
          code: ErrorCode.FORBIDDEN,
          message: 'You do not have permission to create tasks in this project'
        }
      });
      return;
    }

    // Create task
    const task = await prisma.task.create({
      data: {
        name: taskData.name,
        description: taskData.description,
        priority: taskData.priority || 3, // Default priority is 3 (medium)
        complexity: taskData.complexity || 'MEDIUM',
        energyType: taskData.energyType || 'ROUTINE',
        status: 'NOT_STARTED',
        tags: taskData.tags || [],
        projectId: taskData.projectId,
        userId: user.userId
      }
    });

    // Handle dependencies if provided
    if (taskData.dependsOnTaskIds && taskData.dependsOnTaskIds.length > 0) {
      // Validate that all dependency tasks exist and belong to user
      const dependencyTasks = await prisma.task.findMany({
        where: {
          id: {
            in: taskData.dependsOnTaskIds
          },
          userId: user.userId
        }
      });

      if (dependencyTasks.length !== taskData.dependsOnTaskIds.length) {
        // Some dependency tasks don't exist or don't belong to user
        // We'll still create the task, but log a warning
        console.warn(`Some dependency tasks for task ${task.id} were not found or don't belong to user`);
      }

      // Create dependencies for existing tasks
      const validDependencyIds = dependencyTasks.map(t => t.id);
      
      if (validDependencyIds.length > 0) {
        await Promise.all(
          validDependencyIds.map(dependsOnTaskId =>
            prisma.taskDependency.create({
              data: {
                taskId: task.id,
                dependsOnTaskId
              }
            })
          )
        );
      }
    }

    // Return created task
    const createdTask = await prisma.task.findUnique({
      where: { id: task.id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            priority: true,
            category: true
          }
        },
        dependsOn: {
          include: {
            dependsOnTask: {
              select: {
                id: true,
                name: true,
                status: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: createdTask!.id,
        name: createdTask!.name,
        description: createdTask!.description,
        priority: createdTask!.priority,
        complexity: createdTask!.complexity,
        energyType: createdTask!.energyType,
        status: createdTask!.status,
        tags: createdTask!.tags as string[] | undefined,
        projectId: createdTask!.projectId,
        userId: createdTask!.userId,
        completedAt: createdTask!.completedAt,
        createdAt: createdTask!.createdAt,
        updatedAt: createdTask!.updatedAt,
        project: createdTask!.project,
        dependencies: createdTask!.dependsOn.map(dep => ({
          id: dep.dependsOnTask.id,
          name: dep.dependsOnTask.name,
          status: dep.dependsOnTask.status
        }))
      }
    });
  } catch (error: any) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to create task'
      }
    });
  }
};

/**
 * Update an existing task
 * Ensures the task belongs to the authenticated user
 * Validates fields and handles partial updates
 */
export const updateTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { id } = req.params;
    const taskData: UpdateTaskDTO = req.body;
    
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

    // Check if task exists and belongs to user
    const existingTask = await prisma.task.findUnique({
      where: { id }
    });

    if (!existingTask) {
      res.status(404).json({
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: 'Task not found'
        }
      });
      return;
    }

    // Check ownership
    if (existingTask.userId !== user.userId) {
      res.status(403).json({
        success: false,
        error: {
          code: ErrorCode.FORBIDDEN,
          message: 'You do not have permission to update this task'
        }
      });
      return;
    }

    // Validate name if provided
    if (taskData.name !== undefined && taskData.name.trim() === '') {
      res.status(400).json({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Task name cannot be empty'
        }
      });
      return;
    }

    // If project ID is changing, validate it exists and belongs to user
    if (taskData.projectId && taskData.projectId !== existingTask.projectId) {
      const project = await prisma.project.findUnique({
        where: {
          id: taskData.projectId
        }
      });

      if (!project) {
        res.status(404).json({
          success: false,
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'Project not found'
          }
        });
        return;
      }

      if (project.userId !== user.userId) {
        res.status(403).json({
          success: false,
          error: {
            code: ErrorCode.FORBIDDEN,
            message: 'You do not have permission to move task to this project'
          }
        });
        return;
      }
    }

    // Update task
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        ...(taskData.name !== undefined && { name: taskData.name }),
        ...(taskData.description !== undefined && { description: taskData.description }),
        ...(taskData.priority !== undefined && { priority: taskData.priority }),
        ...(taskData.complexity !== undefined && { complexity: taskData.complexity }),
        ...(taskData.energyType !== undefined && { energyType: taskData.energyType }),
        ...(taskData.status !== undefined && { status: taskData.status }),
        ...(taskData.tags !== undefined && { tags: taskData.tags }),
        ...(taskData.projectId !== undefined && { projectId: taskData.projectId }),
        // If status is being changed to COMPLETED, set completedAt timestamp
        ...(taskData.status === 'COMPLETED' && { completedAt: new Date() }),
        // If status is being changed from COMPLETED to something else, clear completedAt
        ...(existingTask.status === 'COMPLETED' && 
           taskData.status !== undefined && 
           taskData.status !== 'COMPLETED' && 
           { completedAt: null })
      }
    });

    // Handle dependencies if provided
    if (taskData.dependsOnTaskIds !== undefined) {
      // First, remove all existing dependencies
      await prisma.taskDependency.deleteMany({
        where: {
          taskId: id
        }
      });

      // Then, create new dependencies if there are any
      if (taskData.dependsOnTaskIds && taskData.dependsOnTaskIds.length > 0) {
        // Validate that all dependency tasks exist and belong to user
        const dependencyTasks = await prisma.task.findMany({
          where: {
            id: {
              in: taskData.dependsOnTaskIds
            },
            userId: user.userId
          }
        });

        // Create dependencies for existing tasks
        const validDependencyIds = dependencyTasks.map(t => t.id);
        
        if (validDependencyIds.length > 0) {
          await Promise.all(
            validDependencyIds.map(dependsOnTaskId =>
              prisma.taskDependency.create({
                data: {
                  taskId: id,
                  dependsOnTaskId
                }
              })
            )
          );
        }
      }
    }

    // Return updated task with dependencies
    const taskWithDependencies = await prisma.task.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            priority: true,
            category: true
          }
        },
        dependsOn: {
          include: {
            dependsOnTask: {
              select: {
                id: true,
                name: true,
                status: true
              }
            }
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        id: taskWithDependencies!.id,
        name: taskWithDependencies!.name,
        description: taskWithDependencies!.description,
        priority: taskWithDependencies!.priority,
        complexity: taskWithDependencies!.complexity,
        energyType: taskWithDependencies!.energyType,
        status: taskWithDependencies!.status,
        tags: taskWithDependencies!.tags as string[] | undefined,
        projectId: taskWithDependencies!.projectId,
        userId: taskWithDependencies!.userId,
        completedAt: taskWithDependencies!.completedAt,
        createdAt: taskWithDependencies!.createdAt,
        updatedAt: taskWithDependencies!.updatedAt,
        project: taskWithDependencies!.project,
        dependencies: taskWithDependencies!.dependsOn.map(dep => ({
          id: dep.dependsOnTask.id,
          name: dep.dependsOnTask.name,
          status: dep.dependsOnTask.status
        }))
      }
    });
  } catch (error: any) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to update task'
      }
    });
  }
};

/**
 * Delete a task
 * Ensures the task belongs to the authenticated user
 */
export const deleteTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { id } = req.params;
    
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

    // Check if task exists and belongs to user
    const existingTask = await prisma.task.findUnique({
      where: { id }
    });

    if (!existingTask) {
      res.status(404).json({
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: 'Task not found'
        }
      });
      return;
    }

    // Check ownership
    if (existingTask.userId !== user.userId) {
      res.status(403).json({
        success: false,
        error: {
          code: ErrorCode.FORBIDDEN,
          message: 'You do not have permission to delete this task'
        }
      });
      return;
    }

    // Delete task (cascade will delete dependencies due to Prisma schema)
    await prisma.task.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      data: {
        message: 'Task deleted successfully'
      }
    });
  } catch (error: any) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to delete task'
      }
    });
  }
};

/**
 * Change task status
 * Useful for quick status changes without full update
 */
export const changeTaskStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { id } = req.params;
    const { status } = req.body;
    
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

    // Validate status
    if (!status || !Object.values(TaskStatus).includes(status as TaskStatus)) {
      res.status(400).json({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Invalid task status'
        }
      });
      return;
    }

    // Check if task exists and belongs to user
    const existingTask = await prisma.task.findUnique({
      where: { id }
    });

    if (!existingTask) {
      res.status(404).json({
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: 'Task not found'
        }
      });
      return;
    }

    // Check ownership
    if (existingTask.userId !== user.userId) {
      res.status(403).json({
        success: false,
        error: {
          code: ErrorCode.FORBIDDEN,
          message: 'You do not have permission to update this task'
        }
      });
      return;
    }

    // Update task status
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        status: status as TaskStatus,
        // If status is being changed to COMPLETED, set completedAt timestamp
        ...(status === 'COMPLETED' && { completedAt: new Date() }),
        // If status is being changed from COMPLETED to something else, clear completedAt
        ...(existingTask.status === 'COMPLETED' && 
           status !== 'COMPLETED' && 
           { completedAt: null })
      }
    });

    // Return updated task
    res.status(200).json({
      success: true,
      data: {
        id: updatedTask.id,
        name: updatedTask.name,
        status: updatedTask.status,
        completedAt: updatedTask.completedAt
      }
    });
  } catch (error: any) {
    console.error('Change task status error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to update task status'
      }
    });
  }
};

/**
 * Manage task dependencies
 * Add or remove dependencies between tasks
 */
export const manageTaskDependencies = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { id } = req.params;
    const { dependsOnTaskIds, operation } = req.body;
    
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

    // Validate operation
    if (!operation || !['add', 'remove', 'set'].includes(operation)) {
      res.status(400).json({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Invalid operation. Must be "add", "remove", or "set"'
        }
      });
      return;
    }

    // Validate dependency task IDs
    if (!dependsOnTaskIds || !Array.isArray(dependsOnTaskIds)) {
      res.status(400).json({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'dependsOnTaskIds must be an array'
        }
      });
      return;
    }

    // Check if task exists and belongs to user
    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: {
        dependsOn: true
      }
    });

    if (!existingTask) {
      res.status(404).json({
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: 'Task not found'
        }
      });
      return;
    }

    // Check ownership
    if (existingTask.userId !== user.userId) {
      res.status(403).json({
        success: false,
        error: {
          code: ErrorCode.FORBIDDEN,
          message: 'You do not have permission to update this task'
        }
      });
      return;
    }

    // Validate that all dependency tasks exist and belong to user
    const dependencyTasks = await prisma.task.findMany({
      where: {
        id: {
          in: dependsOnTaskIds
        },
        userId: user.userId
      }
    });

    // Check for circular dependencies
    for (const depTaskId of dependsOnTaskIds) {
      // Skip self-reference check since we'll filter it out later
      if (depTaskId === id) continue;
      
      // Check if this would create a circular dependency
      const wouldCreateCircular = await checkCircularDependency(id, depTaskId);
      if (wouldCreateCircular) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: `Adding dependency on task ${depTaskId} would create a circular dependency`
          }
        });
        return;
      }
    }

    // Get valid dependency IDs (excluding self-references)
    const validDependencyIds = dependencyTasks
      .map(t => t.id)
      .filter(depId => depId !== id); // Prevent self-reference

    // Perform the requested operation
    switch (operation) {
      case 'add':
        // Add new dependencies (ignore existing ones)
        for (const depTaskId of validDependencyIds) {
          // Check if dependency already exists
          const existingDep = existingTask.dependsOn.find(
            dep => dep.dependsOnTaskId === depTaskId
          );
          
          if (!existingDep) {
            await prisma.taskDependency.create({
              data: {
                taskId: id,
                dependsOnTaskId: depTaskId
              }
            });
          }
        }
        break;
        
      case 'remove':
        // Remove specified dependencies
        if (validDependencyIds.length > 0) {
          await prisma.taskDependency.deleteMany({
            where: {
              taskId: id,
              dependsOnTaskId: {
                in: validDependencyIds
              }
            }
          });
        }
        break;
        
      case 'set':
        // Replace all dependencies with the new set
        // First, remove all existing dependencies
        await prisma.taskDependency.deleteMany({
          where: {
            taskId: id
          }
        });
        
        // Then, create new dependencies
        for (const depTaskId of validDependencyIds) {
          await prisma.taskDependency.create({
            data: {
              taskId: id,
              dependsOnTaskId: depTaskId
            }
          });
        }
        break;
    }

    // Get updated task with dependencies
    const updatedTask = await prisma.task.findUnique({
      where: { id },
      include: {
        dependsOn: {
          include: {
            dependsOnTask: {
              select: {
                id: true,
                name: true,
                status: true,
                priority: true,
                complexity: true
              }
            }
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        id: updatedTask!.id,
        name: updatedTask!.name,
        dependencies: updatedTask!.dependsOn.map(dep => ({
          id: dep.dependsOnTask.id,
          name: dep.dependsOnTask.name,
          status: dep.dependsOnTask.status,
          priority: dep.dependsOnTask.priority,
          complexity: dep.dependsOnTask.complexity
        }))
      }
    });
  } catch (error: any) {
    console.error('Manage task dependencies error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to manage task dependencies'
      }
    });
  }
};

/**
 * Get task statistics for the authenticated user
 * Returns counts by status, complexity, energy type
 */
export const getTaskStats = async (req: Request, res: Response): Promise<void> => {
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

    // Get counts by status
    const statusCounts = await prisma.task.groupBy({
      by: ['status'],
      where: {
        userId: user.userId
      },
      _count: {
        status: true
      }
    });

    // Get counts by complexity
    const complexityCounts = await prisma.task.groupBy({
      by: ['complexity'],
      where: {
        userId: user.userId
      },
      _count: {
        complexity: true
      }
    });

    // Get counts by energy type
    const energyTypeCounts = await prisma.task.groupBy({
      by: ['energyType'],
      where: {
        userId: user.userId
      },
      _count: {
        energyType: true
      }
    });

    // Get counts by project
    const projectCounts = await prisma.task.groupBy({
      by: ['projectId'],
      where: {
        userId: user.userId
      },
      _count: {
        projectId: true
      }
    });

    // Get project names for the counts
    const projects = await prisma.project.findMany({
      where: {
        id: {
          in: projectCounts.map(p => p.projectId)
        }
      },
      select: {
        id: true,
        name: true
      }
    });

    // Transform to more readable format
    const stats = {
      byStatus: statusCounts.reduce((acc, curr) => {
        acc[curr.status] = curr._count.status;
        return acc;
      }, {} as Record<string, number>),
      
      byComplexity: complexityCounts.reduce((acc, curr) => {
        acc[curr.complexity] = curr._count.complexity;
        return acc;
      }, {} as Record<string, number>),
      
      byEnergyType: energyTypeCounts.reduce((acc, curr) => {
        acc[curr.energyType] = curr._count.energyType;
        return acc;
      }, {} as Record<string, number>),
      
      byProject: projectCounts.map(p => {
        const project = projects.find(proj => proj.id === p.projectId);
        return {
          projectId: p.projectId,
          projectName: project ? project.name : 'Unknown Project',
          taskCount: p._count.projectId
        };
      }),
      
      total: await prisma.task.count({
        where: {
          userId: user.userId
        }
      }),
      
      completed: await prisma.task.count({
        where: {
          userId: user.userId,
          status: 'COMPLETED'
        }
      }),
      
      // Tasks completed in the last 7 days
      recentlyCompleted: await prisma.task.count({
        where: {
          userId: user.userId,
          status: 'COMPLETED',
          completedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Get task stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve task statistics'
      }
    });
  }
};

/**
 * Helper function to check if adding a dependency would create a circular reference
 * 
 * @param taskId - The task that would depend on dependencyTaskId
 * @param dependencyTaskId - The task that would be depended on by taskId
 * @returns Promise resolving to boolean indicating if circular dependency would be created
 */
async function checkCircularDependency(
  taskId: string,
  dependencyTaskId: string
): Promise<boolean> {
  // If the dependency task itself depends on the original task, it's circular
  const directCircular = await prisma.taskDependency.findFirst({
    where: {
      taskId: dependencyTaskId,
      dependsOnTaskId: taskId
    }
  });
  
  if (directCircular) {
    return true;
  }
  
  // Check for indirect circular dependencies (A -> B -> C -> A)
  // Get all tasks that the dependency task depends on
  const dependencyDependsOn = await prisma.taskDependency.findMany({
    where: {
      taskId: dependencyTaskId
    },
    select: {
      dependsOnTaskId: true
    }
  });
  
  // Recursively check each of those dependencies
  for (const dep of dependencyDependsOn) {
    // Skip self-references
    if (dep.dependsOnTaskId === dependencyTaskId) continue;
    
    const isCircular = await checkCircularDependency(taskId, dep.dependsOnTaskId);
    if (isCircular) {
      return true;
    }
  }
  
  return false;
}
