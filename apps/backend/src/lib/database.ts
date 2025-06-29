import { PrismaClient } from '@prisma/client';
import * as mockData from './mockData';

// Initialize Prisma client
const prisma = new PrismaClient();

// Determine if we should run in mock mode (no DATABASE_URL provided)
const isMockMode = !process.env.DATABASE_URL;

// Create a database abstraction layer that works with both Prisma and mock data
class Database {
  private readonly prisma: PrismaClient;
  private readonly mockMode: boolean;

  constructor() {
    this.prisma = prisma;
    this.mockMode = isMockMode;
    
    if (this.mockMode) {
      console.log('🔶 Running in MOCK mode with in-memory data');
    } else {
      console.log('🔷 Running with real PostgreSQL database');
    }
  }

  // ======== User Methods ========

  async findUserByEmail(email: string) {
    if (this.mockMode) {
      return mockData.findUserByEmail(email);
    }
    return this.prisma.user.findUnique({
      where: { email }
    });
  }

  async findUserById(id: string) {
    if (this.mockMode) {
      return mockData.findUserById(id);
    }
    return this.prisma.user.findUnique({
      where: { id }
    });
  }

  async createUser(data: any) {
    if (this.mockMode) {
      // In mock mode, we'd just return a fake user
      const newUser = {
        id: `user-${Date.now()}`,
        email: data.email,
        passwordHash: data.passwordHash,
        name: data.name,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockData.users.push(newUser);
      return newUser;
    }
    return this.prisma.user.create({ data });
  }

  async updateUser(id: string, data: any) {
    if (this.mockMode) {
      const userIndex = mockData.users.findIndex(user => user.id === id);
      if (userIndex === -1) return null;
      
      mockData.users[userIndex] = {
        ...mockData.users[userIndex],
        ...data,
        updatedAt: new Date()
      };
      return mockData.users[userIndex];
    }
    return this.prisma.user.update({
      where: { id },
      data
    });
  }

  // ======== User Preferences Methods ========

  async findUserPreferences(userId: string) {
    if (this.mockMode) {
      return mockData.findUserPreferences(userId);
    }
    return this.prisma.userPreferences.findUnique({
      where: { userId }
    });
  }

  async createUserPreferences(data: any) {
    if (this.mockMode) {
      const newPreferences = {
        id: `pref-${Date.now()}`,
        userId: data.userId,
        maxTasksPerDay: data.maxTasksPerDay || 5,
        maxWorkHoursPerDay: data.maxWorkHoursPerDay || 8.0,
        preferredTimeBlocks: data.preferredTimeBlocks || {},
        peakProductivityStart: data.peakProductivityStart || null,
        peakProductivityEnd: data.peakProductivityEnd || null,
        preferredProjectsPerDay: data.preferredProjectsPerDay || 3,
        complexToSimpleRatio: data.complexToSimpleRatio || 0.5,
        shortTermGoals: data.shortTermGoals || [],
        longTermGoals: data.longTermGoals || [],
        personalValues: data.personalValues || [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockData.userPreferences.push(newPreferences);
      return newPreferences;
    }
    return this.prisma.userPreferences.create({ data });
  }

  async updateUserPreferences(userId: string, data: any) {
    if (this.mockMode) {
      const prefIndex = mockData.userPreferences.findIndex(pref => pref.userId === userId);
      if (prefIndex === -1) return null;
      
      mockData.userPreferences[prefIndex] = {
        ...mockData.userPreferences[prefIndex],
        ...data,
        updatedAt: new Date()
      };
      return mockData.userPreferences[prefIndex];
    }
    return this.prisma.userPreferences.update({
      where: { userId },
      data
    });
  }

  // ======== Project Methods ========

  async findProjects(userId: string, filters: any = {}) {
    if (this.mockMode) {
      let filteredProjects = mockData.findUserProjects(userId);
      
      // Apply filters
      if (filters.status) {
        filteredProjects = filteredProjects.filter(p => p.status === filters.status);
      }
      if (filters.category) {
        filteredProjects = filteredProjects.filter(p => p.category === filters.category);
      }
      if (filters.priority) {
        filteredProjects = filteredProjects.filter(p => p.priority === filters.priority);
      }
      
      return filteredProjects;
    }
    
    return this.prisma.project.findMany({
      where: {
        userId,
        ...(filters.status && { status: filters.status }),
        ...(filters.category && { category: filters.category }),
        ...(filters.priority && { priority: filters.priority })
      }
    });
  }

  async findProjectById(id: string) {
    if (this.mockMode) {
      return mockData.findProjectById(id);
    }
    return this.prisma.project.findUnique({
      where: { id }
    });
  }

  async createProject(data: any) {
    if (this.mockMode) {
      const newProject = {
        id: `project-${Date.now()}`,
        name: data.name,
        description: data.description || null,
        goal: data.goal || null,
        priority: data.priority || 'MEDIUM',
        category: data.category || 'PERSONAL',
        status: data.status || 'ACTIVE',
        softDeadline: data.softDeadline || null,
        hardDeadline: data.hardDeadline || null,
        userId: data.userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockData.projects.push(newProject);
      return newProject;
    }
    return this.prisma.project.create({ data });
  }

  async updateProject(id: string, data: any) {
    if (this.mockMode) {
      const projectIndex = mockData.projects.findIndex(project => project.id === id);
      if (projectIndex === -1) return null;
      
      mockData.projects[projectIndex] = {
        ...mockData.projects[projectIndex],
        ...data,
        updatedAt: new Date()
      };
      return mockData.projects[projectIndex];
    }
    return this.prisma.project.update({
      where: { id },
      data
    });
  }

  async deleteProject(id: string) {
    if (this.mockMode) {
      const projectIndex = mockData.projects.findIndex(project => project.id === id);
      if (projectIndex === -1) return null;
      
      const deletedProject = mockData.projects[projectIndex];
      mockData.projects.splice(projectIndex, 1);
      
      // Also delete associated tasks
      const tasksToDelete = mockData.tasks.filter(task => task.projectId === id);
      tasksToDelete.forEach(task => {
        const taskIndex = mockData.tasks.findIndex(t => t.id === task.id);
        if (taskIndex !== -1) {
          mockData.tasks.splice(taskIndex, 1);
        }
      });
      
      return deletedProject;
    }
    return this.prisma.project.delete({
      where: { id }
    });
  }

  // ======== Task Methods ========

  async findTasks(userId: string, filters: any = {}) {
    if (this.mockMode) {
      let filteredTasks = mockData.findUserTasks(userId);
      
      // Apply filters
      if (filters.status) {
        filteredTasks = filteredTasks.filter(t => t.status === filters.status);
      }
      if (filters.projectId) {
        filteredTasks = filteredTasks.filter(t => t.projectId === filters.projectId);
      }
      if (filters.complexity) {
        filteredTasks = filteredTasks.filter(t => t.complexity === filters.complexity);
      }
      if (filters.energyType) {
        filteredTasks = filteredTasks.filter(t => t.energyType === filters.energyType);
      }
      
      return filteredTasks;
    }
    
    return this.prisma.task.findMany({
      where: {
        userId,
        ...(filters.status && { status: filters.status }),
        ...(filters.projectId && { projectId: filters.projectId }),
        ...(filters.complexity && { complexity: filters.complexity }),
        ...(filters.energyType && { energyType: filters.energyType })
      }
    });
  }

  async findTaskById(id: string) {
    if (this.mockMode) {
      return mockData.findTaskById(id);
    }
    return this.prisma.task.findUnique({
      where: { id }
    });
  }

  async createTask(data: any) {
    if (this.mockMode) {
      const newTask = {
        id: `task-${Date.now()}`,
        name: data.name,
        description: data.description || null,
        priority: data.priority || 3,
        complexity: data.complexity || 'MEDIUM',
        energyType: data.energyType || 'ROUTINE',
        status: data.status || 'NOT_STARTED',
        tags: data.tags || [],
        projectId: data.projectId,
        userId: data.userId,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockData.tasks.push(newTask);
      return newTask;
    }
    return this.prisma.task.create({ data });
  }

  async updateTask(id: string, data: any) {
    if (this.mockMode) {
      const taskIndex = mockData.tasks.findIndex(task => task.id === id);
      if (taskIndex === -1) return null;
      
      mockData.tasks[taskIndex] = {
        ...mockData.tasks[taskIndex],
        ...data,
        updatedAt: new Date()
      };
      return mockData.tasks[taskIndex];
    }
    return this.prisma.task.update({
      where: { id },
      data
    });
  }

  async deleteTask(id: string) {
    if (this.mockMode) {
      const taskIndex = mockData.tasks.findIndex(task => task.id === id);
      if (taskIndex === -1) return null;
      
      const deletedTask = mockData.tasks[taskIndex];
      mockData.tasks.splice(taskIndex, 1);
      return deletedTask;
    }
    return this.prisma.task.delete({
      where: { id }
    });
  }

  // ======== Daily Plan Methods ========

  async findTodayPlan(userId: string) {
    if (this.mockMode) {
      return mockData.findTodayPlan(userId);
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return this.prisma.dailyPlan.findFirst({
      where: {
        userId,
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        tasks: {
          include: {
            task: {
              include: {
                project: true
              }
            }
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    });
  }

  async createDailyPlan(data: any) {
    if (this.mockMode) {
      const newPlanId = `plan-${Date.now()}`;
      const newPlan = {
        id: newPlanId,
        date: data.date || new Date(),
        aiReasoning: data.aiReasoning || null,
        isCompleted: false,
        userId: data.userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      mockData.dailyPlans.push(newPlan);
      
      // Create plan tasks
      if (data.tasks && Array.isArray(data.tasks)) {
        data.tasks.forEach((taskItem: any, index: number) => {
          const newPlanTask = {
            id: `planTask-${Date.now()}-${index}`,
            dailyPlanId: newPlanId,
            taskId: taskItem.taskId,
            order: taskItem.order || index + 1,
            recommendedStartTime: taskItem.recommendedStartTime || null,
            recommendedEndTime: taskItem.recommendedEndTime || null,
            aiAdvice: taskItem.aiAdvice || null,
            isCompleted: false,
            completedAt: null,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          mockData.dailyPlanTasks.push(newPlanTask);
        });
      }
      
      return this.findDailyPlanById(newPlanId);
    }
    
    // For real database, we need a transaction
    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.dailyPlan.create({
        data: {
          date: data.date || new Date(),
          aiReasoning: data.aiReasoning,
          isCompleted: false,
          userId: data.userId
        }
      });
      
      if (data.tasks && Array.isArray(data.tasks)) {
        await Promise.all(
          data.tasks.map((taskItem: any, index: number) =>
            tx.dailyPlanTask.create({
              data: {
                dailyPlanId: plan.id,
                taskId: taskItem.taskId,
                order: taskItem.order || index + 1,
                recommendedStartTime: taskItem.recommendedStartTime,
                recommendedEndTime: taskItem.recommendedEndTime,
                aiAdvice: taskItem.aiAdvice,
                isCompleted: false
              }
            })
          )
        );
      }
      
      return tx.dailyPlan.findUnique({
        where: { id: plan.id },
        include: {
          tasks: {
            include: {
              task: {
                include: {
                  project: true
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
  }

  async findDailyPlanById(id: string) {
    if (this.mockMode) {
      const plan = mockData.findDailyPlanById(id);
      if (!plan) return null;
      
      const planTasks = mockData.findDailyPlanTasks(id);
      
      // Attach task details to each plan task
      const tasksWithDetails = planTasks.map(planTask => {
        const task = mockData.findTaskById(planTask.taskId);
        const project = task ? mockData.findProjectById(task.projectId) : null;
        
        return {
          ...planTask,
          task: {
            ...task,
            project
          }
        };
      });
      
      return {
        ...plan,
        tasks: tasksWithDetails
      };
    }
    
    return this.prisma.dailyPlan.findUnique({
      where: { id },
      include: {
        tasks: {
          include: {
            task: {
              include: {
                project: true
              }
            }
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    });
  }

  async updateDailyPlan(id: string, data: any) {
    if (this.mockMode) {
      const planIndex = mockData.dailyPlans.findIndex(plan => plan.id === id);
      if (planIndex === -1) return null;
      
      // Update plan
      if (data.isCompleted !== undefined) {
        mockData.dailyPlans[planIndex].isCompleted = data.isCompleted;
      }
      mockData.dailyPlans[planIndex].updatedAt = new Date();
      
      // Update tasks if provided
      if (data.tasks && Array.isArray(data.tasks)) {
        data.tasks.forEach((taskUpdate: any) => {
          const planTaskIndex = mockData.dailyPlanTasks.findIndex(
            pt => pt.dailyPlanId === id && pt.taskId === taskUpdate.taskId
          );
          
          if (planTaskIndex !== -1) {
            if (taskUpdate.order !== undefined) {
              mockData.dailyPlanTasks[planTaskIndex].order = taskUpdate.order;
            }
            if (taskUpdate.recommendedStartTime !== undefined) {
              mockData.dailyPlanTasks[planTaskIndex].recommendedStartTime = taskUpdate.recommendedStartTime;
            }
            if (taskUpdate.recommendedEndTime !== undefined) {
              mockData.dailyPlanTasks[planTaskIndex].recommendedEndTime = taskUpdate.recommendedEndTime;
            }
            if (taskUpdate.aiAdvice !== undefined) {
              mockData.dailyPlanTasks[planTaskIndex].aiAdvice = taskUpdate.aiAdvice;
            }
            if (taskUpdate.isCompleted !== undefined) {
              mockData.dailyPlanTasks[planTaskIndex].isCompleted = taskUpdate.isCompleted;
              
              if (taskUpdate.isCompleted && !mockData.dailyPlanTasks[planTaskIndex].isCompleted) {
                mockData.dailyPlanTasks[planTaskIndex].completedAt = new Date();
              } else if (!taskUpdate.isCompleted && mockData.dailyPlanTasks[planTaskIndex].isCompleted) {
                mockData.dailyPlanTasks[planTaskIndex].completedAt = null;
              }
            }
            
            mockData.dailyPlanTasks[planTaskIndex].updatedAt = new Date();
          }
        });
      }
      
      return this.findDailyPlanById(id);
    }
    
    // For real database, we need a transaction
    return this.prisma.$transaction(async (tx) => {
      // Update plan
      if (data.isCompleted !== undefined) {
        await tx.dailyPlan.update({
          where: { id },
          data: { isCompleted: data.isCompleted }
        });
      }
      
      // Update tasks if provided
      if (data.tasks && Array.isArray(data.tasks)) {
        for (const taskUpdate of data.tasks) {
          const planTask = await tx.dailyPlanTask.findFirst({
            where: {
              dailyPlanId: id,
              taskId: taskUpdate.taskId
            }
          });
          
          if (planTask) {
            await tx.dailyPlanTask.update({
              where: { id: planTask.id },
              data: {
                ...(taskUpdate.order !== undefined && { order: taskUpdate.order }),
                ...(taskUpdate.recommendedStartTime !== undefined && { recommendedStartTime: taskUpdate.recommendedStartTime }),
                ...(taskUpdate.recommendedEndTime !== undefined && { recommendedEndTime: taskUpdate.recommendedEndTime }),
                ...(taskUpdate.aiAdvice !== undefined && { aiAdvice: taskUpdate.aiAdvice }),
                ...(taskUpdate.isCompleted !== undefined && { 
                  isCompleted: taskUpdate.isCompleted,
                  completedAt: taskUpdate.isCompleted ? new Date() : null
                })
              }
            });
          }
        }
      }
      
      return tx.dailyPlan.findUnique({
        where: { id },
        include: {
          tasks: {
            include: {
              task: {
                include: {
                  project: true
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
  }

  // ======== Connection Management ========
  
  async connect() {
    if (!this.mockMode) {
      await this.prisma.$connect();
    }
  }
  
  async disconnect() {
    if (!this.mockMode) {
      await this.prisma.$disconnect();
    }
  }
}

// Export a singleton instance
const db = new Database();
export default db;
