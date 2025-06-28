import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { 
  AuthenticatedRequest, 
  ErrorCode,
  UpdateUserPreferencesDTO,
  UserPreferencesDTO,
  UserDTO
} from '../types';
import { hashPassword, verifyPassword } from '../utils/auth';

const prisma = new PrismaClient();

/**
 * Get user preferences for the authenticated user
 */
export const getUserPreferences = async (req: Request, res: Response): Promise<void> => {
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

    // Get user preferences
    const preferences = await prisma.userPreferences.findUnique({
      where: {
        userId: user.userId
      }
    });

    if (!preferences) {
      res.status(404).json({
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: 'User preferences not found'
        }
      });
      return;
    }

    // Transform to DTO
    const preferencesDTO: UserPreferencesDTO = {
      id: preferences.id,
      userId: preferences.userId,
      maxTasksPerDay: preferences.maxTasksPerDay,
      maxWorkHoursPerDay: preferences.maxWorkHoursPerDay,
      preferredTimeBlocks: preferences.preferredTimeBlocks,
      peakProductivityStart: preferences.peakProductivityStart,
      peakProductivityEnd: preferences.peakProductivityEnd,
      preferredProjectsPerDay: preferences.preferredProjectsPerDay,
      complexToSimpleRatio: preferences.complexToSimpleRatio,
      shortTermGoals: preferences.shortTermGoals,
      longTermGoals: preferences.longTermGoals,
      personalValues: preferences.personalValues,
      createdAt: preferences.createdAt,
      updatedAt: preferences.updatedAt
    };

    res.status(200).json({
      success: true,
      data: preferencesDTO
    });
  } catch (error: any) {
    console.error('Get user preferences error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve user preferences'
      }
    });
  }
};

/**
 * Update user preferences
 * Validates time blocks, limits, and goals
 */
export const updateUserPreferences = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const preferencesData: UpdateUserPreferencesDTO = req.body;
    
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

    // Validate max tasks per day
    if (preferencesData.maxTasksPerDay !== undefined) {
      if (preferencesData.maxTasksPerDay < 1 || preferencesData.maxTasksPerDay > 20) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Maximum tasks per day must be between 1 and 20'
          }
        });
        return;
      }
    }

    // Validate max work hours per day
    if (preferencesData.maxWorkHoursPerDay !== undefined) {
      if (preferencesData.maxWorkHoursPerDay < 0.5 || preferencesData.maxWorkHoursPerDay > 16) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Maximum work hours per day must be between 0.5 and 16'
          }
        });
        return;
      }
    }

    // Validate preferred projects per day
    if (preferencesData.preferredProjectsPerDay !== undefined) {
      if (preferencesData.preferredProjectsPerDay < 1 || preferencesData.preferredProjectsPerDay > 10) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Preferred projects per day must be between 1 and 10'
          }
        });
        return;
      }
    }

    // Validate complex to simple ratio
    if (preferencesData.complexToSimpleRatio !== undefined) {
      if (preferencesData.complexToSimpleRatio < 0 || preferencesData.complexToSimpleRatio > 1) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Complex to simple ratio must be between 0 and 1'
          }
        });
        return;
      }
    }

    // Validate time format for peak productivity
    if (preferencesData.peakProductivityStart !== undefined && preferencesData.peakProductivityStart !== null) {
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(preferencesData.peakProductivityStart)) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Peak productivity start time must be in HH:MM format (24-hour)'
          }
        });
        return;
      }
    }

    if (preferencesData.peakProductivityEnd !== undefined && preferencesData.peakProductivityEnd !== null) {
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(preferencesData.peakProductivityEnd)) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Peak productivity end time must be in HH:MM format (24-hour)'
          }
        });
        return;
      }
    }

    // Validate preferred time blocks (if provided)
    if (preferencesData.preferredTimeBlocks !== undefined) {
      // Ensure it's a valid JSON object
      try {
        if (typeof preferencesData.preferredTimeBlocks !== 'object') {
          res.status(400).json({
            success: false,
            error: {
              code: ErrorCode.VALIDATION_ERROR,
              message: 'Preferred time blocks must be a valid object'
            }
          });
          return;
        }
      } catch (error) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Failed to parse preferred time blocks'
          }
        });
        return;
      }
    }

    // Validate goals (if provided)
    if (preferencesData.shortTermGoals !== undefined) {
      try {
        if (!Array.isArray(preferencesData.shortTermGoals)) {
          res.status(400).json({
            success: false,
            error: {
              code: ErrorCode.VALIDATION_ERROR,
              message: 'Short term goals must be an array'
            }
          });
          return;
        }
      } catch (error) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Failed to parse short term goals'
          }
        });
        return;
      }
    }

    if (preferencesData.longTermGoals !== undefined) {
      try {
        if (!Array.isArray(preferencesData.longTermGoals)) {
          res.status(400).json({
            success: false,
            error: {
              code: ErrorCode.VALIDATION_ERROR,
              message: 'Long term goals must be an array'
            }
          });
          return;
        }
      } catch (error) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Failed to parse long term goals'
          }
        });
        return;
      }
    }

    if (preferencesData.personalValues !== undefined) {
      try {
        if (!Array.isArray(preferencesData.personalValues)) {
          res.status(400).json({
            success: false,
            error: {
              code: ErrorCode.VALIDATION_ERROR,
              message: 'Personal values must be an array'
            }
          });
          return;
        }
      } catch (error) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Failed to parse personal values'
          }
        });
        return;
      }
    }

    // Check if preferences exist for the user
    const existingPreferences = await prisma.userPreferences.findUnique({
      where: {
        userId: user.userId
      }
    });

    if (!existingPreferences) {
      // Create preferences if they don't exist
      const newPreferences = await prisma.userPreferences.create({
        data: {
          userId: user.userId,
          maxTasksPerDay: preferencesData.maxTasksPerDay || 5,
          maxWorkHoursPerDay: preferencesData.maxWorkHoursPerDay || 8.0,
          preferredTimeBlocks: preferencesData.preferredTimeBlocks || {},
          peakProductivityStart: preferencesData.peakProductivityStart || null,
          peakProductivityEnd: preferencesData.peakProductivityEnd || null,
          preferredProjectsPerDay: preferencesData.preferredProjectsPerDay || 3,
          complexToSimpleRatio: preferencesData.complexToSimpleRatio || 0.5,
          shortTermGoals: preferencesData.shortTermGoals || [],
          longTermGoals: preferencesData.longTermGoals || [],
          personalValues: preferencesData.personalValues || []
        }
      });

      // Transform to DTO
      const preferencesDTO: UserPreferencesDTO = {
        id: newPreferences.id,
        userId: newPreferences.userId,
        maxTasksPerDay: newPreferences.maxTasksPerDay,
        maxWorkHoursPerDay: newPreferences.maxWorkHoursPerDay,
        preferredTimeBlocks: newPreferences.preferredTimeBlocks,
        peakProductivityStart: newPreferences.peakProductivityStart,
        peakProductivityEnd: newPreferences.peakProductivityEnd,
        preferredProjectsPerDay: newPreferences.preferredProjectsPerDay,
        complexToSimpleRatio: newPreferences.complexToSimpleRatio,
        shortTermGoals: newPreferences.shortTermGoals,
        longTermGoals: newPreferences.longTermGoals,
        personalValues: newPreferences.personalValues,
        createdAt: newPreferences.createdAt,
        updatedAt: newPreferences.updatedAt
      };

      res.status(201).json({
        success: true,
        data: preferencesDTO
      });
    } else {
      // Update existing preferences
      const updatedPreferences = await prisma.userPreferences.update({
        where: {
          userId: user.userId
        },
        data: {
          ...(preferencesData.maxTasksPerDay !== undefined && { maxTasksPerDay: preferencesData.maxTasksPerDay }),
          ...(preferencesData.maxWorkHoursPerDay !== undefined && { maxWorkHoursPerDay: preferencesData.maxWorkHoursPerDay }),
          ...(preferencesData.preferredTimeBlocks !== undefined && { preferredTimeBlocks: preferencesData.preferredTimeBlocks }),
          ...(preferencesData.peakProductivityStart !== undefined && { peakProductivityStart: preferencesData.peakProductivityStart }),
          ...(preferencesData.peakProductivityEnd !== undefined && { peakProductivityEnd: preferencesData.peakProductivityEnd }),
          ...(preferencesData.preferredProjectsPerDay !== undefined && { preferredProjectsPerDay: preferencesData.preferredProjectsPerDay }),
          ...(preferencesData.complexToSimpleRatio !== undefined && { complexToSimpleRatio: preferencesData.complexToSimpleRatio }),
          ...(preferencesData.shortTermGoals !== undefined && { shortTermGoals: preferencesData.shortTermGoals }),
          ...(preferencesData.longTermGoals !== undefined && { longTermGoals: preferencesData.longTermGoals }),
          ...(preferencesData.personalValues !== undefined && { personalValues: preferencesData.personalValues })
        }
      });

      // Transform to DTO
      const preferencesDTO: UserPreferencesDTO = {
        id: updatedPreferences.id,
        userId: updatedPreferences.userId,
        maxTasksPerDay: updatedPreferences.maxTasksPerDay,
        maxWorkHoursPerDay: updatedPreferences.maxWorkHoursPerDay,
        preferredTimeBlocks: updatedPreferences.preferredTimeBlocks,
        peakProductivityStart: updatedPreferences.peakProductivityStart,
        peakProductivityEnd: updatedPreferences.peakProductivityEnd,
        preferredProjectsPerDay: updatedPreferences.preferredProjectsPerDay,
        complexToSimpleRatio: updatedPreferences.complexToSimpleRatio,
        shortTermGoals: updatedPreferences.shortTermGoals,
        longTermGoals: updatedPreferences.longTermGoals,
        personalValues: updatedPreferences.personalValues,
        createdAt: updatedPreferences.createdAt,
        updatedAt: updatedPreferences.updatedAt
      };

      res.status(200).json({
        success: true,
        data: preferencesDTO
      });
    }
  } catch (error: any) {
    console.error('Update user preferences error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to update user preferences'
      }
    });
  }
};

/**
 * Get user statistics
 * Returns task completion rates, streaks, and other performance metrics
 */
export const getUserStats = async (req: Request, res: Response): Promise<void> => {
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

    // Get user
    const userRecord = await prisma.user.findUnique({
      where: { id: user.userId }
    });

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

    // Get total task counts
    const totalTasks = await prisma.task.count({
      where: { userId: user.userId }
    });

    const completedTasks = await prisma.task.count({
      where: {
        userId: user.userId,
        status: 'COMPLETED'
      }
    });

    // Get daily plans stats
    const totalDailyPlans = await prisma.dailyPlan.count({
      where: { userId: user.userId }
    });

    const completedDailyPlans = await prisma.dailyPlan.count({
      where: {
        userId: user.userId,
        isCompleted: true
      }
    });

    // Get tasks completed in the last 7 days
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const tasksCompletedLast7Days = await prisma.task.count({
      where: {
        userId: user.userId,
        status: 'COMPLETED',
        completedAt: {
          gte: last7Days
        }
      }
    });

    // Get tasks completed in the last 30 days
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const tasksCompletedLast30Days = await prisma.task.count({
      where: {
        userId: user.userId,
        status: 'COMPLETED',
        completedAt: {
          gte: last30Days
        }
      }
    });

    // Get daily plan completion streak
    const dailyPlans = await prisma.dailyPlan.findMany({
      where: {
        userId: user.userId
      },
      orderBy: {
        date: 'desc'
      },
      select: {
        date: true,
        isCompleted: true
      }
    });

    // Calculate current streak
    let currentStreak = 0;
    for (const plan of dailyPlans) {
      if (plan.isCompleted) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let currentLongestStreak = 0;
    for (const plan of dailyPlans) {
      if (plan.isCompleted) {
        currentLongestStreak++;
        if (currentLongestStreak > longestStreak) {
          longestStreak = currentLongestStreak;
        }
      } else {
        currentLongestStreak = 0;
      }
    }

    // Get project counts
    const activeProjects = await prisma.project.count({
      where: {
        userId: user.userId,
        status: 'ACTIVE'
      }
    });

    const completedProjects = await prisma.project.count({
      where: {
        userId: user.userId,
        status: 'COMPLETED'
      }
    });

    // Get task completion by day of week
    const tasksByDayOfWeek = await prisma.$queryRaw`
      SELECT 
        EXTRACT(DOW FROM "completedAt") as day_of_week,
        COUNT(*) as count
      FROM 
        "Task"
      WHERE 
        "userId" = ${user.userId}
        AND "status" = 'COMPLETED'
        AND "completedAt" IS NOT NULL
      GROUP BY 
        day_of_week
      ORDER BY 
        day_of_week
    `;

    // Calculate average tasks per day
    const avgTasksPerDay = totalDailyPlans > 0
      ? (await prisma.dailyPlanTask.count({
          where: {
            dailyPlan: {
              userId: user.userId
            }
          }
        })) / totalDailyPlans
      : 0;

    // Calculate average completion rate
    const avgCompletionRate = totalDailyPlans > 0
      ? (completedDailyPlans / totalDailyPlans) * 100
      : 0;

    // Compile stats
    const stats = {
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
        last7Days: tasksCompletedLast7Days,
        last30Days: tasksCompletedLast30Days,
        byDayOfWeek: tasksByDayOfWeek
      },
      dailyPlans: {
        total: totalDailyPlans,
        completed: completedDailyPlans,
        completionRate: avgCompletionRate,
        avgTasksPerDay: avgTasksPerDay,
        currentStreak: currentStreak,
        longestStreak: longestStreak
      },
      projects: {
        active: activeProjects,
        completed: completedProjects,
        total: activeProjects + completedProjects
      },
      accountAge: {
        days: Math.floor((Date.now() - userRecord.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      }
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve user statistics'
      }
    });
  }
};

/**
 * Update user profile
 * Can update name and email
 */
export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { name, email, currentPassword } = req.body;
    
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

    // Get user
    const userRecord = await prisma.user.findUnique({
      where: { id: user.userId }
    });

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

    // Prepare update data
    const updateData: any = {};

    // Validate and update name if provided
    if (name !== undefined) {
      if (name !== null && (typeof name !== 'string' || name.trim() === '')) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Name must be a non-empty string or null'
          }
        });
        return;
      }
      updateData.name = name;
    }

    // Validate and update email if provided
    if (email !== undefined) {
      // Email validation
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Please provide a valid email address'
          }
        });
        return;
      }

      // Check if email is already in use by another user
      if (email !== userRecord.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email }
        });

        if (existingUser) {
          res.status(409).json({
            success: false,
            error: {
              code: ErrorCode.CONFLICT,
              message: 'Email is already in use'
            }
          });
          return;
        }

        // Require current password for email change
        if (!currentPassword) {
          res.status(400).json({
            success: false,
            error: {
              code: ErrorCode.VALIDATION_ERROR,
              message: 'Current password is required to change email'
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

        updateData.email = email;
      }
    }

    // Update user if there are changes
    if (Object.keys(updateData).length > 0) {
      const updatedUser = await prisma.user.update({
        where: { id: user.userId },
        data: updateData
      });

      // Transform to DTO
      const userDTO: UserDTO = {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      };

      res.status(200).json({
        success: true,
        data: userDTO
      });
    } else {
      // No changes to make
      res.status(200).json({
        success: true,
        data: {
          id: userRecord.id,
          email: userRecord.email,
          name: userRecord.name,
          createdAt: userRecord.createdAt,
          updatedAt: userRecord.updatedAt
        }
      });
    }
  } catch (error: any) {
    console.error('Update user profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to update user profile'
      }
    });
  }
};
