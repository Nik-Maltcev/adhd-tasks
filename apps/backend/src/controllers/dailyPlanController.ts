import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { 
  AuthenticatedRequest, 
  ErrorCode,
  CreateDailyPlanDTO,
  UpdateDailyPlanDTO,
  DailyPlanDTO,
  AIGeneratedPlan
} from '../types';
import AIService from '../services/aiService';

const prisma = new PrismaClient();

/**
 * Get today's daily plan for the authenticated user
 * Creates a new plan if none exists for today
 */
export const getTodayPlan = async (req: Request, res: Response): Promise<void> => {
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

    // Get today's date (reset to midnight for consistent comparison)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if a plan already exists for today
    const existingPlan = await prisma.dailyPlan.findFirst({
      where: {
        userId: user.userId,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) // Next day
        }
      },
      include: {
        tasks: {
          include: {
            task: {
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
            }
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    if (existingPlan) {
      // Transform to DTO
      const planDTO: DailyPlanDTO = {
        id: existingPlan.id,
        date: existingPlan.date,
        aiReasoning: existingPlan.aiReasoning,
        isCompleted: existingPlan.isCompleted,
        userId: existingPlan.userId,
        createdAt: existingPlan.createdAt,
        updatedAt: existingPlan.updatedAt,
        tasks: existingPlan.tasks.map(planTask => ({
          id: planTask.id,
          dailyPlanId: planTask.dailyPlanId,
          taskId: planTask.taskId,
          order: planTask.order,
          recommendedStartTime: planTask.recommendedStartTime,
          recommendedEndTime: planTask.recommendedEndTime,
          aiAdvice: planTask.aiAdvice,
          isCompleted: planTask.isCompleted,
          completedAt: planTask.completedAt,
          createdAt: planTask.createdAt,
          updatedAt: planTask.updatedAt,
          task: {
            id: planTask.task.id,
            name: planTask.task.name,
            description: planTask.task.description,
            priority: planTask.task.priority,
            complexity: planTask.task.complexity,
            energyType: planTask.task.energyType,
            status: planTask.task.status,
            tags: planTask.task.tags as string[] | undefined,
            projectId: planTask.task.projectId,
            userId: planTask.task.userId,
            completedAt: planTask.task.completedAt,
            createdAt: planTask.task.createdAt,
            updatedAt: planTask.task.updatedAt,
            project: planTask.task.project
          }
        }))
      };

      res.status(200).json({
        success: true,
        data: planDTO
      });
    } else {
      // No plan exists for today, generate a new one
      try {
        // Generate plan using AI service
        const generatedPlan = await AIService.generateDailyPlan(user.userId, today);
        
        // Create new plan in database
        const newPlan = await createPlanFromAIResult(user.userId, today, generatedPlan);
        
        res.status(201).json({
          success: true,
          data: newPlan
        });
      } catch (error: any) {
        console.error('Failed to generate daily plan:', error);
        res.status(500).json({
          success: false,
          error: {
            code: ErrorCode.INTERNAL_SERVER_ERROR,
            message: 'Failed to generate daily plan'
          }
        });
      }
    }
  } catch (error: any) {
    console.error('Get today plan error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve today\'s plan'
      }
    });
  }
};

/**
 * Generate a new daily plan using AI
 * Optionally specify a date (defaults to today)
 * Overwrites any existing plan for the specified date
 */
export const generatePlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { date: dateString } = req.body;
    
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

    // Parse date or use today
    let targetDate: Date;
    if (dateString) {
      targetDate = new Date(dateString);
      if (isNaN(targetDate.getTime())) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Invalid date format'
          }
        });
        return;
      }
    } else {
      targetDate = new Date();
    }
    
    // Reset to midnight for consistent comparison
    targetDate.setHours(0, 0, 0, 0);

    // Check if a plan already exists for the target date
    const existingPlan = await prisma.dailyPlan.findFirst({
      where: {
        userId: user.userId,
        date: {
          gte: targetDate,
          lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000) // Next day
        }
      }
    });

    // If a plan exists, delete it first
    if (existingPlan) {
      await prisma.dailyPlan.delete({
        where: {
          id: existingPlan.id
        }
      });
    }

    // Generate new plan using AI service
    try {
      const generatedPlan = await AIService.generateDailyPlan(user.userId, targetDate);
      
      // Create new plan in database
      const newPlan = await createPlanFromAIResult(user.userId, targetDate, generatedPlan);
      
      res.status(201).json({
        success: true,
        data: newPlan
      });
    } catch (error: any) {
      console.error('Failed to generate daily plan:', error);
      res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to generate daily plan'
        }
      });
    }
  } catch (error: any) {
    console.error('Generate plan error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to generate plan'
      }
    });
  }
};

/**
 * Get a daily plan for a specific date
 * Date format: YYYY-MM-DD
 */
export const getPlanByDate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { date: dateParam } = req.params;
    
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

    // Parse date
    const targetDate = new Date(dateParam);
    if (isNaN(targetDate.getTime())) {
      res.status(400).json({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Invalid date format. Use YYYY-MM-DD'
        }
      });
      return;
    }
    
    // Reset to midnight for consistent comparison
    targetDate.setHours(0, 0, 0, 0);

    // Get plan for the specified date
    const plan = await prisma.dailyPlan.findFirst({
      where: {
        userId: user.userId,
        date: {
          gte: targetDate,
          lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000) // Next day
        }
      },
      include: {
        tasks: {
          include: {
            task: {
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
            }
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    if (!plan) {
      res.status(404).json({
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: `No plan found for date ${dateParam}`
        }
      });
      return;
    }

    // Transform to DTO
    const planDTO: DailyPlanDTO = {
      id: plan.id,
      date: plan.date,
      aiReasoning: plan.aiReasoning,
      isCompleted: plan.isCompleted,
      userId: plan.userId,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      tasks: plan.tasks.map(planTask => ({
        id: planTask.id,
        dailyPlanId: planTask.dailyPlanId,
        taskId: planTask.taskId,
        order: planTask.order,
        recommendedStartTime: planTask.recommendedStartTime,
        recommendedEndTime: planTask.recommendedEndTime,
        aiAdvice: planTask.aiAdvice,
        isCompleted: planTask.isCompleted,
        completedAt: planTask.completedAt,
        createdAt: planTask.createdAt,
        updatedAt: planTask.updatedAt,
        task: {
          id: planTask.task.id,
          name: planTask.task.name,
          description: planTask.task.description,
          priority: planTask.task.priority,
          complexity: planTask.task.complexity,
          energyType: planTask.task.energyType,
          status: planTask.task.status,
          tags: planTask.task.tags as string[] | undefined,
          projectId: planTask.task.projectId,
          userId: planTask.task.userId,
          completedAt: planTask.task.completedAt,
          createdAt: planTask.task.createdAt,
          updatedAt: planTask.task.updatedAt,
          project: planTask.task.project
        }
      }))
    };

    res.status(200).json({
      success: true,
      data: planDTO
    });
  } catch (error: any) {
    console.error('Get plan by date error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve plan'
      }
    });
  }
};

/**
 * Update a daily plan
 * Can mark plan as completed, update task order, or mark tasks as completed
 */
export const updatePlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { id } = req.params;
    const updateData: UpdateDailyPlanDTO = req.body;
    
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

    // Check if plan exists and belongs to user
    const existingPlan = await prisma.dailyPlan.findUnique({
      where: { id },
      include: {
        tasks: true
      }
    });

    if (!existingPlan) {
      res.status(404).json({
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: 'Plan not found'
        }
      });
      return;
    }

    if (existingPlan.userId !== user.userId) {
      res.status(403).json({
        success: false,
        error: {
          code: ErrorCode.FORBIDDEN,
          message: 'You do not have permission to update this plan'
        }
      });
      return;
    }

    // Start a transaction for updating the plan and its tasks
    const updatedPlan = await prisma.$transaction(async (tx) => {
      // Update plan completion status if provided
      if (updateData.isCompleted !== undefined) {
        await tx.dailyPlan.update({
          where: { id },
          data: {
            isCompleted: updateData.isCompleted
          }
        });
      }

      // Update tasks if provided
      if (updateData.tasks && updateData.tasks.length > 0) {
        // Create a map of existing tasks for quick lookup
        const existingTasksMap = new Map(
          existingPlan.tasks.map(task => [task.taskId, task])
        );

        // Process each task update
        for (const taskUpdate of updateData.tasks) {
          const planTask = existingTasksMap.get(taskUpdate.taskId);
          
          if (!planTask) {
            // Skip tasks that don't exist in the plan
            console.warn(`Task ${taskUpdate.taskId} not found in plan ${id}`);
            continue;
          }

          // Prepare update data
          const taskUpdateData: any = {};
          
          if (taskUpdate.order !== undefined) {
            taskUpdateData.order = taskUpdate.order;
          }
          
          if (taskUpdate.recommendedStartTime !== undefined) {
            taskUpdateData.recommendedStartTime = taskUpdate.recommendedStartTime;
          }
          
          if (taskUpdate.recommendedEndTime !== undefined) {
            taskUpdateData.recommendedEndTime = taskUpdate.recommendedEndTime;
          }
          
          if (taskUpdate.aiAdvice !== undefined) {
            taskUpdateData.aiAdvice = taskUpdate.aiAdvice;
          }
          
          if (taskUpdate.isCompleted !== undefined) {
            taskUpdateData.isCompleted = taskUpdate.isCompleted;
            
            // Set completedAt timestamp if completing the task
            if (taskUpdate.isCompleted && !planTask.isCompleted) {
              taskUpdateData.completedAt = new Date();
            }
            
            // Clear completedAt if unmarking as completed
            if (!taskUpdate.isCompleted && planTask.isCompleted) {
              taskUpdateData.completedAt = null;
            }
          }

          // Update the task if we have changes
          if (Object.keys(taskUpdateData).length > 0) {
            await tx.dailyPlanTask.update({
              where: { id: planTask.id },
              data: taskUpdateData
            });
          }
        }
      }

      // Return the updated plan
      return tx.dailyPlan.findUnique({
        where: { id },
        include: {
          tasks: {
            include: {
              task: {
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
              }
            },
            orderBy: {
              order: 'asc'
            }
          }
        }
      });
    });

    // Check if all tasks are completed and update plan completion status if needed
    const allTasksCompleted = updatedPlan!.tasks.every(task => task.isCompleted);
    if (allTasksCompleted && !updatedPlan!.isCompleted) {
      await prisma.dailyPlan.update({
        where: { id },
        data: {
          isCompleted: true
        }
      });
      updatedPlan!.isCompleted = true;
    }

    // Transform to DTO
    const planDTO: DailyPlanDTO = {
      id: updatedPlan!.id,
      date: updatedPlan!.date,
      aiReasoning: updatedPlan!.aiReasoning,
      isCompleted: updatedPlan!.isCompleted,
      userId: updatedPlan!.userId,
      createdAt: updatedPlan!.createdAt,
      updatedAt: updatedPlan!.updatedAt,
      tasks: updatedPlan!.tasks.map(planTask => ({
        id: planTask.id,
        dailyPlanId: planTask.dailyPlanId,
        taskId: planTask.taskId,
        order: planTask.order,
        recommendedStartTime: planTask.recommendedStartTime,
        recommendedEndTime: planTask.recommendedEndTime,
        aiAdvice: planTask.aiAdvice,
        isCompleted: planTask.isCompleted,
        completedAt: planTask.completedAt,
        createdAt: planTask.createdAt,
        updatedAt: planTask.updatedAt,
        task: {
          id: planTask.task.id,
          name: planTask.task.name,
          description: planTask.task.description,
          priority: planTask.task.priority,
          complexity: planTask.task.complexity,
          energyType: planTask.task.energyType,
          status: planTask.task.status,
          tags: planTask.task.tags as string[] | undefined,
          projectId: planTask.task.projectId,
          userId: planTask.task.userId,
          completedAt: planTask.task.completedAt,
          createdAt: planTask.task.createdAt,
          updatedAt: planTask.task.updatedAt,
          project: planTask.task.project
        }
      }))
    };

    res.status(200).json({
      success: true,
      data: planDTO
    });
  } catch (error: any) {
    console.error('Update plan error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to update plan'
      }
    });
  }
};

/**
 * Update a specific task in a daily plan
 * Can mark task as completed, update order, or change time blocks
 */
export const updatePlanTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { id: planId, taskId } = req.params;
    const {
      isCompleted,
      order,
      recommendedStartTime,
      recommendedEndTime,
      aiAdvice
    } = req.body;
    
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

    // Check if plan exists and belongs to user
    const existingPlan = await prisma.dailyPlan.findUnique({
      where: { id: planId }
    });

    if (!existingPlan) {
      res.status(404).json({
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: 'Plan not found'
        }
      });
      return;
    }

    if (existingPlan.userId !== user.userId) {
      res.status(403).json({
        success: false,
        error: {
          code: ErrorCode.FORBIDDEN,
          message: 'You do not have permission to update this plan'
        }
      });
      return;
    }

    // Find the specific task in the plan
    const planTask = await prisma.dailyPlanTask.findFirst({
      where: {
        dailyPlanId: planId,
        taskId
      }
    });

    if (!planTask) {
      res.status(404).json({
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: 'Task not found in this plan'
        }
      });
      return;
    }

    // Prepare update data
    const updateData: any = {};
    
    if (order !== undefined) {
      updateData.order = order;
    }
    
    if (recommendedStartTime !== undefined) {
      updateData.recommendedStartTime = recommendedStartTime;
    }
    
    if (recommendedEndTime !== undefined) {
      updateData.recommendedEndTime = recommendedEndTime;
    }
    
    if (aiAdvice !== undefined) {
      updateData.aiAdvice = aiAdvice;
    }
    
    if (isCompleted !== undefined) {
      updateData.isCompleted = isCompleted;
      
      // Set completedAt timestamp if completing the task
      if (isCompleted && !planTask.isCompleted) {
        updateData.completedAt = new Date();
      }
      
      // Clear completedAt if unmarking as completed
      if (!isCompleted && planTask.isCompleted) {
        updateData.completedAt = null;
      }
    }

    // Update the task
    const updatedPlanTask = await prisma.dailyPlanTask.update({
      where: { id: planTask.id },
      data: updateData,
      include: {
        task: {
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
        }
      }
    });

    // Check if all tasks in the plan are completed and update plan status if needed
    if (isCompleted) {
      const allPlanTasks = await prisma.dailyPlanTask.findMany({
        where: {
          dailyPlanId: planId
        }
      });
      
      const allTasksCompleted = allPlanTasks.every(task => task.isCompleted);
      
      if (allTasksCompleted && !existingPlan.isCompleted) {
        await prisma.dailyPlan.update({
          where: { id: planId },
          data: {
            isCompleted: true
          }
        });
      }
    }

    // Return the updated task
    res.status(200).json({
      success: true,
      data: {
        id: updatedPlanTask.id,
        dailyPlanId: updatedPlanTask.dailyPlanId,
        taskId: updatedPlanTask.taskId,
        order: updatedPlanTask.order,
        recommendedStartTime: updatedPlanTask.recommendedStartTime,
        recommendedEndTime: updatedPlanTask.recommendedEndTime,
        aiAdvice: updatedPlanTask.aiAdvice,
        isCompleted: updatedPlanTask.isCompleted,
        completedAt: updatedPlanTask.completedAt,
        createdAt: updatedPlanTask.createdAt,
        updatedAt: updatedPlanTask.updatedAt,
        task: {
          id: updatedPlanTask.task.id,
          name: updatedPlanTask.task.name,
          description: updatedPlanTask.task.description,
          priority: updatedPlanTask.task.priority,
          complexity: updatedPlanTask.task.complexity,
          energyType: updatedPlanTask.task.energyType,
          status: updatedPlanTask.task.status,
          tags: updatedPlanTask.task.tags as string[] | undefined,
          projectId: updatedPlanTask.task.projectId,
          userId: updatedPlanTask.task.userId,
          completedAt: updatedPlanTask.task.completedAt,
          createdAt: updatedPlanTask.task.createdAt,
          updatedAt: updatedPlanTask.task.updatedAt,
          project: updatedPlanTask.task.project
        }
      }
    });
  } catch (error: any) {
    console.error('Update plan task error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to update task in plan'
      }
    });
  }
};

/**
 * Get historical daily plans with analytics
 * Supports pagination and date range filtering
 */
export const getPlanHistory = async (req: Request, res: Response): Promise<void> => {
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

    // Extract query parameters
    const startDateStr = req.query.startDate as string | undefined;
    const endDateStr = req.query.endDate as string | undefined;
    const page = parseInt(req.query.page as string || '1', 10);
    const pageSize = parseInt(req.query.pageSize as string || '7', 10); // Default to 1 week

    // Parse date range
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (startDateStr) {
      startDate = new Date(startDateStr);
      if (isNaN(startDate.getTime())) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Invalid start date format'
          }
        });
        return;
      }
      startDate.setHours(0, 0, 0, 0);
    } else {
      // Default to 30 days ago
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    }

    if (endDateStr) {
      endDate = new Date(endDateStr);
      if (isNaN(endDate.getTime())) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Invalid end date format'
          }
        });
        return;
      }
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Default to today
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    }

    // Calculate pagination
    const skip = (page - 1) * pageSize;

    // Get plans within date range with pagination
    const [plans, totalCount] = await Promise.all([
      prisma.dailyPlan.findMany({
        where: {
          userId: user.userId,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          tasks: {
            include: {
              task: {
                select: {
                  id: true,
                  name: true,
                  complexity: true,
                  energyType: true,
                  projectId: true
                }
              }
            }
          }
        },
        orderBy: {
          date: 'desc'
        },
        skip,
        take: pageSize
      }),
      prisma.dailyPlan.count({
        where: {
          userId: user.userId,
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      })
    ]);

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / pageSize);

    // Calculate analytics
    const analytics = calculatePlanAnalytics(plans);

    // Transform plans to DTOs
    const planDTOs = plans.map(plan => ({
      id: plan.id,
      date: plan.date,
      isCompleted: plan.isCompleted,
      taskCount: plan.tasks.length,
      completedTaskCount: plan.tasks.filter(t => t.isCompleted).length,
      completionRate: plan.tasks.length > 0 
        ? (plan.tasks.filter(t => t.isCompleted).length / plan.tasks.length) * 100 
        : 0,
      projectsIncluded: [...new Set(plan.tasks.map(t => t.task.projectId))].length,
      complexityBreakdown: {
        verySmall: plan.tasks.filter(t => t.task.complexity === 'VERY_SMALL').length,
        small: plan.tasks.filter(t => t.task.complexity === 'SMALL').length,
        medium: plan.tasks.filter(t => t.task.complexity === 'MEDIUM').length,
        large: plan.tasks.filter(t => t.task.complexity === 'LARGE').length,
        veryLarge: plan.tasks.filter(t => t.task.complexity === 'VERY_LARGE').length
      },
      energyTypeBreakdown: {
        creative: plan.tasks.filter(t => t.task.energyType === 'CREATIVE').length,
        routine: plan.tasks.filter(t => t.task.energyType === 'ROUTINE').length,
        communication: plan.tasks.filter(t => t.task.energyType === 'COMMUNICATION').length,
        physical: plan.tasks.filter(t => t.task.energyType === 'PHYSICAL').length
      }
    }));

    res.status(200).json({
      success: true,
      data: {
        plans: planDTOs,
        analytics,
        pagination: {
          total: totalCount,
          page,
          pageSize,
          totalPages
        },
        dateRange: {
          startDate,
          endDate
        }
      }
    });
  } catch (error: any) {
    console.error('Get plan history error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve plan history'
      }
    });
  }
};

/**
 * Helper function to create a daily plan from AI-generated result
 * 
 * @param userId - User ID
 * @param date - Plan date
 * @param aiPlan - AI-generated plan
 * @returns Promise resolving to created plan DTO
 */
async function createPlanFromAIResult(
  userId: string,
  date: Date,
  aiPlan: AIGeneratedPlan
): Promise<DailyPlanDTO> {
  // Create plan with tasks in a transaction
  const newPlan = await prisma.$transaction(async (tx) => {
    // Create the plan
    const plan = await tx.dailyPlan.create({
      data: {
        userId,
        date,
        aiReasoning: aiPlan.reasoning,
        isCompleted: false
      }
    });

    // Create tasks for the plan
    if (aiPlan.tasks.length > 0) {
      await Promise.all(
        aiPlan.tasks.map(taskItem =>
          tx.dailyPlanTask.create({
            data: {
              dailyPlanId: plan.id,
              taskId: taskItem.taskId,
              order: taskItem.order,
              recommendedStartTime: taskItem.recommendedStartTime,
              recommendedEndTime: taskItem.recommendedEndTime,
              aiAdvice: taskItem.aiAdvice,
              isCompleted: false
            }
          })
        )
      );
    }

    // Return the created plan with tasks
    return tx.dailyPlan.findUnique({
      where: { id: plan.id },
      include: {
        tasks: {
          include: {
            task: {
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
            }
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    });
  });

  // Transform to DTO
  const planDTO: DailyPlanDTO = {
    id: newPlan!.id,
    date: newPlan!.date,
    aiReasoning: newPlan!.aiReasoning,
    isCompleted: newPlan!.isCompleted,
    userId: newPlan!.userId,
    createdAt: newPlan!.createdAt,
    updatedAt: newPlan!.updatedAt,
    tasks: newPlan!.tasks.map(planTask => ({
      id: planTask.id,
      dailyPlanId: planTask.dailyPlanId,
      taskId: planTask.taskId,
      order: planTask.order,
      recommendedStartTime: planTask.recommendedStartTime,
      recommendedEndTime: planTask.recommendedEndTime,
      aiAdvice: planTask.aiAdvice,
      isCompleted: planTask.isCompleted,
      completedAt: planTask.completedAt,
      createdAt: planTask.createdAt,
      updatedAt: planTask.updatedAt,
      task: {
        id: planTask.task.id,
        name: planTask.task.name,
        description: planTask.task.description,
        priority: planTask.task.priority,
        complexity: planTask.task.complexity,
        energyType: planTask.task.energyType,
        status: planTask.task.status,
        tags: planTask.task.tags as string[] | undefined,
        projectId: planTask.task.projectId,
        userId: planTask.task.userId,
        completedAt: planTask.task.completedAt,
        createdAt: planTask.task.createdAt,
        updatedAt: planTask.task.updatedAt,
        project: planTask.task.project
      }
    }))
  };

  return planDTO;
}

/**
 * Calculate analytics from a set of daily plans
 * 
 * @param plans - Array of daily plans with tasks
 * @returns Analytics object
 */
function calculatePlanAnalytics(plans: any[]): any {
  // Initialize analytics object
  const analytics = {
    overallCompletionRate: 0,
    totalPlannedTasks: 0,
    totalCompletedTasks: 0,
    averageTasksPerDay: 0,
    mostProductiveDay: null as string | null,
    mostProductiveDayCompletionCount: 0,
    bestCompletionRateDay: null as string | null,
    bestCompletionRateValue: 0,
    completionTrend: [] as { date: string; completionRate: number }[],
    complexityBreakdown: {
      verySmall: 0,
      small: 0,
      medium: 0,
      large: 0,
      veryLarge: 0
    },
    energyTypeBreakdown: {
      creative: 0,
      routine: 0,
      communication: 0,
      physical: 0
    },
    projectVarietyAverage: 0
  };

  if (plans.length === 0) {
    return analytics;
  }

  // Calculate totals and populate daily stats
  let totalPlannedTasks = 0;
  let totalCompletedTasks = 0;
  let totalProjects = 0;

  plans.forEach(plan => {
    const plannedTasks = plan.tasks.length;
    const completedTasks = plan.tasks.filter((t: any) => t.isCompleted).length;
    const completionRate = plannedTasks > 0 ? (completedTasks / plannedTasks) * 100 : 0;
    const dateStr = plan.date.toISOString().split('T')[0];
    
    totalPlannedTasks += plannedTasks;
    totalCompletedTasks += completedTasks;
    
    // Track most productive day (by absolute completion count)
    if (completedTasks > analytics.mostProductiveDayCompletionCount) {
      analytics.mostProductiveDayCompletionCount = completedTasks;
      analytics.mostProductiveDay = dateStr;
    }
    
    // Track best completion rate day
    if (completionRate > analytics.bestCompletionRateValue && plannedTasks > 0) {
      analytics.bestCompletionRateValue = completionRate;
      analytics.bestCompletionRateDay = dateStr;
    }
    
    // Add to completion trend
    analytics.completionTrend.push({
      date: dateStr,
      completionRate
    });
    
    // Count complexity and energy types
    plan.tasks.forEach((task: any) => {
      // Complexity
      if (task.task.complexity === 'VERY_SMALL') analytics.complexityBreakdown.verySmall++;
      else if (task.task.complexity === 'SMALL') analytics.complexityBreakdown.small++;
      else if (task.task.complexity === 'MEDIUM') analytics.complexityBreakdown.medium++;
      else if (task.task.complexity === 'LARGE') analytics.complexityBreakdown.large++;
      else if (task.task.complexity === 'VERY_LARGE') analytics.complexityBreakdown.veryLarge++;
      
      // Energy type
      if (task.task.energyType === 'CREATIVE') analytics.energyTypeBreakdown.creative++;
      else if (task.task.energyType === 'ROUTINE') analytics.energyTypeBreakdown.routine++;
      else if (task.task.energyType === 'COMMUNICATION') analytics.energyTypeBreakdown.communication++;
      else if (task.task.energyType === 'PHYSICAL') analytics.energyTypeBreakdown.physical++;
    });
    
    // Count unique projects per day
    const uniqueProjects = new Set(plan.tasks.map((t: any) => t.task.projectId)).size;
    totalProjects += uniqueProjects;
  });

  // Calculate averages and rates
  analytics.totalPlannedTasks = totalPlannedTasks;
  analytics.totalCompletedTasks = totalCompletedTasks;
  analytics.overallCompletionRate = totalPlannedTasks > 0 
    ? (totalCompletedTasks / totalPlannedTasks) * 100 
    : 0;
  analytics.averageTasksPerDay = totalPlannedTasks / plans.length;
  analytics.projectVarietyAverage = totalProjects / plans.length;

  // Sort completion trend by date
  analytics.completionTrend.sort((a, b) => a.date.localeCompare(b.date));

  return analytics;
}
