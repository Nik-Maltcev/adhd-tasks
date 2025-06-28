import { Request, Response } from 'express';
import { PrismaClient, ProjectStatus, ProjectPriority, ProjectCategory } from '@prisma/client';
import { 
  AuthenticatedRequest, 
  CreateProjectDTO, 
  UpdateProjectDTO, 
  ProjectDTO,
  ErrorCode,
  PaginationParams
} from '../types';

const prisma = new PrismaClient();

/**
 * Get all projects for the authenticated user
 * Supports filtering by status, category, priority
 * Supports pagination and sorting
 */
export const getProjects = async (req: Request, res: Response): Promise<void> => {
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
    const status = req.query.status as ProjectStatus | undefined;
    const category = req.query.category as ProjectCategory | undefined;
    const priority = req.query.priority as ProjectPriority | undefined;
    const search = req.query.search as string | undefined;
    
    // Extract pagination parameters
    const page = parseInt(req.query.page as string || '1', 10);
    const pageSize = parseInt(req.query.pageSize as string || '10', 10);
    const sortBy = req.query.sortBy as string || 'updatedAt';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

    // Build filter conditions
    const where: any = {
      userId: user.userId,
      ...(status && { status }),
      ...(category && { category }),
      ...(priority && { priority }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { goal: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    // Count total projects matching filters
    const totalProjects = await prisma.project.count({ where });
    
    // Calculate pagination values
    const skip = (page - 1) * pageSize;
    const take = pageSize;
    const totalPages = Math.ceil(totalProjects / pageSize);

    // Get projects with pagination and sorting
    const projects = await prisma.project.findMany({
      where,
      orderBy: {
        [sortBy]: sortOrder
      },
      skip,
      take,
      include: {
        _count: {
          select: {
            tasks: true
          }
        }
      }
    });

    // Transform to DTOs
    const projectDTOs = projects.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description,
      goal: project.goal,
      priority: project.priority,
      category: project.category,
      status: project.status,
      softDeadline: project.softDeadline,
      hardDeadline: project.hardDeadline,
      userId: project.userId,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      taskCount: project._count.tasks
    }));

    res.status(200).json({
      success: true,
      data: {
        items: projectDTOs,
        total: totalProjects,
        page,
        pageSize,
        totalPages
      }
    });
  } catch (error: any) {
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve projects'
      }
    });
  }
};

/**
 * Get a single project by ID with its tasks
 * Ensures the project belongs to the authenticated user
 */
export const getProjectById = async (req: Request, res: Response): Promise<void> => {
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

    // Get project with tasks
    const project = await prisma.project.findUnique({
      where: {
        id
      },
      include: {
        tasks: {
          orderBy: [
            { priority: 'desc' },
            { updatedAt: 'desc' }
          ]
        }
      }
    });

    // Check if project exists
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

    // Check ownership
    if (project.userId !== user.userId) {
      res.status(403).json({
        success: false,
        error: {
          code: ErrorCode.FORBIDDEN,
          message: 'You do not have permission to access this project'
        }
      });
      return;
    }

    // Transform to DTO
    const projectDTO: ProjectDTO = {
      id: project.id,
      name: project.name,
      description: project.description,
      goal: project.goal,
      priority: project.priority,
      category: project.category,
      status: project.status,
      softDeadline: project.softDeadline,
      hardDeadline: project.hardDeadline,
      userId: project.userId,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      tasks: project.tasks.map(task => ({
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
        updatedAt: task.updatedAt
      }))
    };

    res.status(200).json({
      success: true,
      data: projectDTO
    });
  } catch (error: any) {
    console.error('Get project by ID error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve project'
      }
    });
  }
};

/**
 * Create a new project for the authenticated user
 * Validates required fields and sets defaults
 */
export const createProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const projectData: CreateProjectDTO = req.body;
    
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
    if (!projectData.name || projectData.name.trim() === '') {
      res.status(400).json({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Project name is required'
        }
      });
      return;
    }

    // Create project
    const project = await prisma.project.create({
      data: {
        name: projectData.name,
        description: projectData.description,
        goal: projectData.goal,
        priority: projectData.priority || 'MEDIUM',
        category: projectData.category || 'PERSONAL',
        status: 'ACTIVE',
        softDeadline: projectData.softDeadline,
        hardDeadline: projectData.hardDeadline,
        userId: user.userId
      }
    });

    // Return created project
    res.status(201).json({
      success: true,
      data: {
        id: project.id,
        name: project.name,
        description: project.description,
        goal: project.goal,
        priority: project.priority,
        category: project.category,
        status: project.status,
        softDeadline: project.softDeadline,
        hardDeadline: project.hardDeadline,
        userId: project.userId,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }
    });
  } catch (error: any) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to create project'
      }
    });
  }
};

/**
 * Update an existing project
 * Ensures the project belongs to the authenticated user
 * Validates fields and handles partial updates
 */
export const updateProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { id } = req.params;
    const projectData: UpdateProjectDTO = req.body;
    
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

    // Check if project exists and belongs to user
    const existingProject = await prisma.project.findUnique({
      where: { id }
    });

    if (!existingProject) {
      res.status(404).json({
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: 'Project not found'
        }
      });
      return;
    }

    // Check ownership
    if (existingProject.userId !== user.userId) {
      res.status(403).json({
        success: false,
        error: {
          code: ErrorCode.FORBIDDEN,
          message: 'You do not have permission to update this project'
        }
      });
      return;
    }

    // Validate name if provided
    if (projectData.name !== undefined && projectData.name.trim() === '') {
      res.status(400).json({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Project name cannot be empty'
        }
      });
      return;
    }

    // Update project
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        ...(projectData.name !== undefined && { name: projectData.name }),
        ...(projectData.description !== undefined && { description: projectData.description }),
        ...(projectData.goal !== undefined && { goal: projectData.goal }),
        ...(projectData.priority !== undefined && { priority: projectData.priority }),
        ...(projectData.category !== undefined && { category: projectData.category }),
        ...(projectData.status !== undefined && { status: projectData.status }),
        ...(projectData.softDeadline !== undefined && { softDeadline: projectData.softDeadline }),
        ...(projectData.hardDeadline !== undefined && { hardDeadline: projectData.hardDeadline })
      }
    });

    // Return updated project
    res.status(200).json({
      success: true,
      data: {
        id: updatedProject.id,
        name: updatedProject.name,
        description: updatedProject.description,
        goal: updatedProject.goal,
        priority: updatedProject.priority,
        category: updatedProject.category,
        status: updatedProject.status,
        softDeadline: updatedProject.softDeadline,
        hardDeadline: updatedProject.hardDeadline,
        userId: updatedProject.userId,
        createdAt: updatedProject.createdAt,
        updatedAt: updatedProject.updatedAt
      }
    });
  } catch (error: any) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to update project'
      }
    });
  }
};

/**
 * Delete a project and all its tasks
 * Ensures the project belongs to the authenticated user
 */
export const deleteProject = async (req: Request, res: Response): Promise<void> => {
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

    // Check if project exists and belongs to user
    const existingProject = await prisma.project.findUnique({
      where: { id }
    });

    if (!existingProject) {
      res.status(404).json({
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: 'Project not found'
        }
      });
      return;
    }

    // Check ownership
    if (existingProject.userId !== user.userId) {
      res.status(403).json({
        success: false,
        error: {
          code: ErrorCode.FORBIDDEN,
          message: 'You do not have permission to delete this project'
        }
      });
      return;
    }

    // Delete project (cascade will delete related tasks due to Prisma schema)
    await prisma.project.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      data: {
        message: 'Project deleted successfully'
      }
    });
  } catch (error: any) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to delete project'
      }
    });
  }
};

/**
 * Get project statistics for the authenticated user
 * Returns counts by status, category, priority
 */
export const getProjectStats = async (req: Request, res: Response): Promise<void> => {
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
    const statusCounts = await prisma.project.groupBy({
      by: ['status'],
      where: {
        userId: user.userId
      },
      _count: {
        status: true
      }
    });

    // Get counts by category
    const categoryCounts = await prisma.project.groupBy({
      by: ['category'],
      where: {
        userId: user.userId
      },
      _count: {
        category: true
      }
    });

    // Get counts by priority
    const priorityCounts = await prisma.project.groupBy({
      by: ['priority'],
      where: {
        userId: user.userId
      },
      _count: {
        priority: true
      }
    });

    // Get total task counts by project
    const projectTaskCounts = await prisma.project.findMany({
      where: {
        userId: user.userId
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            tasks: true
          }
        }
      }
    });

    // Transform to more readable format
    const stats = {
      byStatus: statusCounts.reduce((acc, curr) => {
        acc[curr.status] = curr._count.status;
        return acc;
      }, {} as Record<string, number>),
      
      byCategory: categoryCounts.reduce((acc, curr) => {
        acc[curr.category] = curr._count.category;
        return acc;
      }, {} as Record<string, number>),
      
      byPriority: priorityCounts.reduce((acc, curr) => {
        acc[curr.priority] = curr._count.priority;
        return acc;
      }, {} as Record<string, number>),
      
      projectTaskCounts: projectTaskCounts.map(p => ({
        projectId: p.id,
        projectName: p.name,
        taskCount: p._count.tasks
      })),
      
      total: await prisma.project.count({
        where: {
          userId: user.userId
        }
      })
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Get project stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve project statistics'
      }
    });
  }
};

/**
 * Change project status (active/paused/completed)
 * Useful for quick status changes without full update
 */
export const changeProjectStatus = async (req: Request, res: Response): Promise<void> => {
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
    if (!status || !Object.values(ProjectStatus).includes(status as ProjectStatus)) {
      res.status(400).json({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Invalid project status'
        }
      });
      return;
    }

    // Check if project exists and belongs to user
    const existingProject = await prisma.project.findUnique({
      where: { id }
    });

    if (!existingProject) {
      res.status(404).json({
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: 'Project not found'
        }
      });
      return;
    }

    // Check ownership
    if (existingProject.userId !== user.userId) {
      res.status(403).json({
        success: false,
        error: {
          code: ErrorCode.FORBIDDEN,
          message: 'You do not have permission to update this project'
        }
      });
      return;
    }

    // Update project status
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        status: status as ProjectStatus
      }
    });

    // Return updated project
    res.status(200).json({
      success: true,
      data: {
        id: updatedProject.id,
        name: updatedProject.name,
        status: updatedProject.status
      }
    });
  } catch (error: any) {
    console.error('Change project status error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to update project status'
      }
    });
  }
};
