import { OpenAI } from 'openai';
import { PrismaClient } from '@prisma/client';
import {
  AIPromptContext,
  AIGeneratedPlan,
  ProjectDTO,
  TaskDTO,
  TaskComplexity,
  EnergyType,
  AppError,
  ErrorCode
} from '../types';

// Initialize Prisma client
const prisma = new PrismaClient();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Default OpenAI model to use
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4-turbo';

/**
 * AI Service for generating daily plans optimized for ADHD users
 */
export class AIService {
  /**
   * Generate a daily plan based on user context, projects, and tasks
   * 
   * @param userId - User ID to generate plan for
   * @param date - Date to generate plan for (defaults to today)
   * @returns Promise resolving to generated plan
   */
  public static async generateDailyPlan(
    userId: string,
    date: Date = new Date()
  ): Promise<AIGeneratedPlan> {
    try {
      // 1. Gather all necessary context data
      const context = await this.buildPromptContext(userId, date);
      
      // 2. Generate plan using OpenAI
      const generatedPlan = await this.callOpenAI(context);
      
      // 3. Save AI history for future reference
      await this.saveAIHistory(userId, context, generatedPlan);
      
      return generatedPlan;
    } catch (error: any) {
      console.error('AI plan generation error:', error);
      
      // If OpenAI fails, use fallback planning
      if (error.code === ErrorCode.SERVICE_UNAVAILABLE) {
        console.log('Using fallback planning due to AI service unavailability');
        return this.generateFallbackPlan(userId, date);
      }
      
      // Re-throw other errors
      throw error;
    }
  }
  
  /**
   * Build the context needed for the AI prompt
   * 
   * @param userId - User ID to build context for
   * @param date - Date to build context for
   * @returns Promise resolving to context object
   */
  private static async buildPromptContext(
    userId: string,
    date: Date
  ): Promise<AIPromptContext> {
    // Get user preferences
    const userPreferences = await prisma.userPreferences.findUnique({
      where: { userId }
    });
    
    if (!userPreferences) {
      const error = new Error('User preferences not found') as AppError;
      error.statusCode = 404;
      error.code = ErrorCode.NOT_FOUND;
      throw error;
    }
    
    // Get active projects
    const projects = await prisma.project.findMany({
      where: {
        userId,
        status: 'ACTIVE'
      },
      include: {
        tasks: {
          where: {
            status: {
              in: ['NOT_STARTED', 'IN_PROGRESS']
            }
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { updatedAt: 'desc' }
      ]
    });
    
    // Transform to DTOs and filter out projects with no available tasks
    const projectDTOs: ProjectDTO[] = projects
      .map(project => ({
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
      }))
      .filter(project => project.tasks.length > 0);
    
    // Get all available tasks across projects
    const availableTasks: TaskDTO[] = projectDTOs.flatMap(project => 
      project.tasks.map(task => ({
        ...task,
        project: {
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
      }))
    );
    
    // Get task completion history for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const completionHistory = await prisma.dailyPlan.findMany({
      where: {
        userId,
        date: {
          gte: sevenDaysAgo,
          lt: date
        }
      },
      include: {
        tasks: true
      },
      orderBy: {
        date: 'desc'
      }
    });
    
    // Transform completion history to simpler format
    const historyData = completionHistory.map(plan => ({
      date: plan.date,
      tasksCompleted: plan.tasks.filter(t => t.isCompleted).length,
      tasksPlanned: plan.tasks.length
    }));
    
    // Build the context object
    return {
      user: {
        dailyLimit: userPreferences.maxTasksPerDay,
        projectsPerDay: userPreferences.preferredProjectsPerDay,
        peakHours: userPreferences.peakProductivityStart 
          ? `${userPreferences.peakProductivityStart} - ${userPreferences.peakProductivityEnd}`
          : null,
        currentGoals: userPreferences.shortTermGoals
      },
      projects: projectDTOs,
      availableTasks,
      completionHistory: historyData
    };
  }
  
  /**
   * Call OpenAI API to generate a daily plan
   * 
   * @param context - Context data for the prompt
   * @returns Promise resolving to generated plan
   */
  private static async callOpenAI(context: AIPromptContext): Promise<AIGeneratedPlan> {
    try {
      // Build the prompt with ADHD-specific considerations
      const prompt = this.buildADHDPrompt(context);
      
      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant specialized in task planning for people with ADHD. You understand the unique challenges they face with executive function, task initiation, and maintaining focus. Your goal is to create balanced, achievable daily plans that maintain interest and momentum.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });
      
      // Parse the response
      const content = response.choices[0]?.message?.content;
      
      if (!content) {
        throw this.createAIError('Empty response from OpenAI');
      }
      
      try {
        // Parse JSON response
        const parsedResponse = JSON.parse(content);
        
        // Validate response structure
        return this.validateAndTransformResponse(parsedResponse, context);
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        throw this.createAIError('Failed to parse AI response');
      }
    } catch (error: any) {
      console.error('OpenAI API error:', error);
      
      // Handle OpenAI API errors
      if (error.status === 429) {
        throw this.createAIError('Rate limit exceeded with OpenAI API', ErrorCode.SERVICE_UNAVAILABLE);
      }
      
      if (error.status >= 500) {
        throw this.createAIError('OpenAI service is currently unavailable', ErrorCode.SERVICE_UNAVAILABLE);
      }
      
      // Re-throw our custom errors
      if (error.code) {
        throw error;
      }
      
      // Generic error
      throw this.createAIError('Failed to generate plan with AI', ErrorCode.SERVICE_UNAVAILABLE);
    }
  }
  
  /**
   * Build an ADHD-optimized prompt for the AI
   * 
   * @param context - Context data for the prompt
   * @returns Formatted prompt string
   */
  private static buildADHDPrompt(context: AIPromptContext): string {
    const { user, projects, availableTasks, completionHistory } = context;
    
    // Format projects for the prompt
    const projectsText = projects.map(project => {
      const deadline = project.hardDeadline 
        ? `Hard deadline: ${project.hardDeadline.toISOString().split('T')[0]}`
        : project.softDeadline
          ? `Soft deadline: ${project.softDeadline.toISOString().split('T')[0]}`
          : 'No deadline';
      
      return `- Project: "${project.name}" (${project.priority} priority, ${project.category})
  Goal: ${project.goal || 'Not specified'}
  ${deadline}
  Available tasks: ${project.tasks.length}`;
    }).join('\n\n');
    
    // Format tasks for the prompt
    const tasksText = availableTasks.map(task => {
      const complexityMap: Record<TaskComplexity, string> = {
        'VERY_SMALL': '15 min',
        'SMALL': '30 min',
        'MEDIUM': '1 hour',
        'LARGE': '2 hours',
        'VERY_LARGE': '2+ hours'
      };
      
      const energyTypeMap: Record<EnergyType, string> = {
        'CREATIVE': 'Creative energy',
        'ROUTINE': 'Routine/administrative energy',
        'COMMUNICATION': 'Social/communication energy',
        'PHYSICAL': 'Physical energy'
      };
      
      return `- Task: "${task.name}" (Project: ${task.project?.name})
  Priority: ${task.priority}/5
  Complexity: ${complexityMap[task.complexity]}
  Energy type: ${energyTypeMap[task.energyType]}
  Tags: ${task.tags?.join(', ') || 'None'}
  ID: ${task.id}`;
    }).join('\n\n');
    
    // Format completion history
    const historyText = completionHistory
      ? `Recent completion history:
${completionHistory.map(day => 
  `- ${day.date.toISOString().split('T')[0]}: ${day.tasksCompleted}/${day.tasksPlanned} tasks completed`
).join('\n')}`
      : 'No recent completion history available.';
    
    // Build the final prompt with ADHD-specific instructions
    return `
You are a personal planner for someone with ADHD. Create a daily plan that is balanced, engaging, and achievable.

USER CONTEXT:
- Maximum tasks per day: ${user.dailyLimit}
- Preferred projects per day: ${user.projectsPerDay}
- Peak productivity hours: ${user.peakHours || 'Not specified'}
- Current goals: ${JSON.stringify(user.currentGoals || [])}

ACTIVE PROJECTS:
${projectsText}

AVAILABLE TASKS:
${tasksText}

HISTORY:
${historyText}

ADHD CONSIDERATIONS:
1. Switching between different projects helps maintain interest and motivation
2. Balance complex tasks with simpler ones to avoid cognitive fatigue
3. Match task energy types to different parts of the day (creative work during peak hours)
4. Group similar tasks when possible for efficiency
5. Include small wins early in the day to build momentum
6. Consider task dependencies and deadlines
7. Limit total number of tasks to prevent overwhelm

INSTRUCTIONS:
Create a daily plan with the following:
1. A selection of ${user.dailyLimit} tasks maximum
2. Tasks from ${user.projectsPerDay} different projects
3. A mix of complexity levels and energy types
4. A suggested order of completion
5. Recommended time blocks for each task
6. Brief advice for approaching each task

RESPONSE FORMAT:
Provide your response as a JSON object with the following structure:
{
  "tasks": [
    {
      "taskId": "task-id-here",
      "order": 1,
      "recommendedStartTime": "09:00",
      "recommendedEndTime": "09:30",
      "aiAdvice": "Brief advice for this specific task"
    },
    ...more tasks...
  ],
  "reasoning": "Detailed explanation of why you selected these tasks and arranged them in this order"
}
`;
  }
  
  /**
   * Validate and transform the AI response into the expected format
   * 
   * @param response - Raw response from OpenAI
   * @param context - Original context data
   * @returns Validated and transformed AIGeneratedPlan
   */
  private static validateAndTransformResponse(
    response: any,
    context: AIPromptContext
  ): AIGeneratedPlan {
    // Validate tasks array exists
    if (!response.tasks || !Array.isArray(response.tasks) || response.tasks.length === 0) {
      throw this.createAIError('Invalid AI response: missing or empty tasks array');
    }
    
    // Validate reasoning exists
    if (!response.reasoning || typeof response.reasoning !== 'string') {
      throw this.createAIError('Invalid AI response: missing or invalid reasoning');
    }
    
    // Create a map of available task IDs for validation
    const availableTaskIds = new Set(context.availableTasks.map(task => task.id));
    
    // Validate each task in the response
    const validatedTasks = response.tasks.map((task: any, index: number) => {
      // Validate task ID
      if (!task.taskId || !availableTaskIds.has(task.taskId)) {
        throw this.createAIError(`Invalid task ID in AI response: ${task.taskId}`);
      }
      
      // Validate order
      const order = task.order || index + 1;
      
      // Validate time format if provided
      if (task.recommendedStartTime && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(task.recommendedStartTime)) {
        task.recommendedStartTime = null;
      }
      
      if (task.recommendedEndTime && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(task.recommendedEndTime)) {
        task.recommendedEndTime = null;
      }
      
      return {
        taskId: task.taskId,
        order,
        recommendedStartTime: task.recommendedStartTime || null,
        recommendedEndTime: task.recommendedEndTime || null,
        aiAdvice: task.aiAdvice || null
      };
    });
    
    // Ensure we don't exceed the user's daily limit
    const userLimit = context.user.dailyLimit;
    const finalTasks = validatedTasks.slice(0, userLimit);
    
    return {
      tasks: finalTasks,
      reasoning: response.reasoning
    };
  }
  
  /**
   * Generate a fallback plan when AI service is unavailable
   * Uses heuristics to create a balanced plan without AI
   * 
   * @param userId - User ID to generate plan for
   * @param date - Date to generate plan for
   * @returns Promise resolving to generated plan
   */
  private static async generateFallbackPlan(
    userId: string,
    date: Date
  ): Promise<AIGeneratedPlan> {
    try {
      // Get context data
      const context = await this.buildPromptContext(userId, date);
      
      // Get user preferences
      const { dailyLimit, projectsPerDay } = context.user;
      
      // Sort projects by priority
      const prioritizedProjects = [...context.projects].sort((a, b) => {
        // First by hard deadline (if exists)
        if (a.hardDeadline && b.hardDeadline) {
          return a.hardDeadline.getTime() - b.hardDeadline.getTime();
        }
        if (a.hardDeadline) return -1;
        if (b.hardDeadline) return 1;
        
        // Then by priority
        if (a.priority !== b.priority) {
          return a.priority === 'HIGH' ? -1 : a.priority === 'LOW' ? 1 : 0;
        }
        
        // Then by soft deadline (if exists)
        if (a.softDeadline && b.softDeadline) {
          return a.softDeadline.getTime() - b.softDeadline.getTime();
        }
        if (a.softDeadline) return -1;
        if (b.softDeadline) return 1;
        
        return 0;
      });
      
      // Limit to preferred number of projects
      const selectedProjects = prioritizedProjects.slice(0, projectsPerDay);
      
      // Get all tasks from selected projects
      let allTasks = selectedProjects.flatMap(project => 
        context.availableTasks.filter(task => task.projectId === project.id)
      );
      
      // Sort tasks by priority and complexity
      allTasks.sort((a, b) => {
        // First by priority (higher first)
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        
        // Then mix complexity (start with a medium task, then alternate between easy and hard)
        const complexityOrder: Record<TaskComplexity, number> = {
          'MEDIUM': 1,
          'SMALL': 2,
          'LARGE': 3,
          'VERY_SMALL': 4,
          'VERY_LARGE': 5
        };
        
        return complexityOrder[a.complexity] - complexityOrder[b.complexity];
      });
      
      // Limit to daily task limit
      const selectedTasks = allTasks.slice(0, dailyLimit);
      
      // Create a balanced order of tasks
      // Start with a medium task, then alternate between simple and complex
      const complexityGroups: Record<string, TaskDTO[]> = {
        easy: selectedTasks.filter(t => ['VERY_SMALL', 'SMALL'].includes(t.complexity)),
        medium: selectedTasks.filter(t => t.complexity === 'MEDIUM'),
        complex: selectedTasks.filter(t => ['LARGE', 'VERY_LARGE'].includes(t.complexity))
      };
      
      // Create an ordered list starting with a medium task if available
      const orderedTasks: TaskDTO[] = [];
      
      // Start with a medium task if available
      if (complexityGroups.medium.length > 0) {
        orderedTasks.push(complexityGroups.medium.shift()!);
      } else if (complexityGroups.easy.length > 0) {
        orderedTasks.push(complexityGroups.easy.shift()!);
      } else if (complexityGroups.complex.length > 0) {
        orderedTasks.push(complexityGroups.complex.shift()!);
      }
      
      // Then alternate between easy and complex tasks
      while (
        complexityGroups.easy.length > 0 || 
        complexityGroups.medium.length > 0 || 
        complexityGroups.complex.length > 0
      ) {
        // After a complex task, add an easy task
        if (
          orderedTasks.length > 0 && 
          ['LARGE', 'VERY_LARGE', 'MEDIUM'].includes(orderedTasks[orderedTasks.length - 1].complexity)
        ) {
          if (complexityGroups.easy.length > 0) {
            orderedTasks.push(complexityGroups.easy.shift()!);
          } else if (complexityGroups.medium.length > 0) {
            orderedTasks.push(complexityGroups.medium.shift()!);
          } else if (complexityGroups.complex.length > 0) {
            orderedTasks.push(complexityGroups.complex.shift()!);
          }
        } 
        // After an easy task, add a more complex task
        else {
          if (complexityGroups.complex.length > 0) {
            orderedTasks.push(complexityGroups.complex.shift()!);
          } else if (complexityGroups.medium.length > 0) {
            orderedTasks.push(complexityGroups.medium.shift()!);
          } else if (complexityGroups.easy.length > 0) {
            orderedTasks.push(complexityGroups.easy.shift()!);
          }
        }
      }
      
      // Map to the expected format
      const tasks = orderedTasks.map((task, index) => {
        // Generate simple time blocks (9 AM start, 30-120 min per task)
        const complexityDuration: Record<TaskComplexity, number> = {
          'VERY_SMALL': 15,
          'SMALL': 30,
          'MEDIUM': 60,
          'LARGE': 90,
          'VERY_LARGE': 120
        };
        
        const startHour = 9; // Default start at 9 AM
        let currentMinutes = 0;
        
        // Calculate start time for this task
        for (let i = 0; i < index; i++) {
          currentMinutes += complexityDuration[orderedTasks[i].complexity];
        }
        
        const taskStartHour = startHour + Math.floor(currentMinutes / 60);
        const taskStartMinute = currentMinutes % 60;
        
        const taskEndHour = startHour + Math.floor((currentMinutes + complexityDuration[task.complexity]) / 60);
        const taskEndMinute = (currentMinutes + complexityDuration[task.complexity]) % 60;
        
        const formatTime = (hour: number, minute: number) => 
          `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        const recommendedStartTime = formatTime(taskStartHour, taskStartMinute);
        const recommendedEndTime = formatTime(taskEndHour, taskEndMinute);
        
        // Generate simple advice based on task type
        let aiAdvice = '';
        switch (task.energyType) {
          case 'CREATIVE':
            aiAdvice = 'Find a quiet space with minimal distractions for this creative task.';
            break;
          case 'ROUTINE':
            aiAdvice = 'Consider using a timer to stay on track with this routine task.';
            break;
          case 'COMMUNICATION':
            aiAdvice = 'Prepare key points in advance for this communication task.';
            break;
          case 'PHYSICAL':
            aiAdvice = 'Make sure to take short breaks during this physical task.';
            break;
          default:
            aiAdvice = 'Break this task into smaller steps if it feels overwhelming.';
        }
        
        return {
          taskId: task.id,
          order: index + 1,
          recommendedStartTime,
          recommendedEndTime,
          aiAdvice
        };
      });
      
      // Create reasoning text
      const reasoning = `
This plan was generated using the fallback system because the AI service was unavailable.
It includes ${tasks.length} tasks from ${selectedProjects.length} different projects, prioritizing:
1. Projects with upcoming deadlines
2. High priority tasks
3. A balance of task complexity (alternating between simpler and more complex tasks)
4. Variety in task types to maintain engagement

The plan starts at 9:00 AM and includes estimated time blocks based on each task's complexity.
For best results, try to follow the suggested order, but feel free to adjust based on your energy levels.
      `.trim();
      
      return {
        tasks,
        reasoning
      };
    } catch (error) {
      console.error('Fallback planning error:', error);
      
      // If even the fallback fails, return a minimal valid plan
      return {
        tasks: [],
        reasoning: 'Unable to generate plan due to technical difficulties. Please try again later.'
      };
    }
  }
  
  /**
   * Save AI interaction history for future reference and improvement
   * 
   * @param userId - User ID
   * @param requestData - Context data sent to AI
   * @param responseData - Plan data received from AI
   */
  private static async saveAIHistory(
    userId: string,
    requestData: AIPromptContext,
    responseData: AIGeneratedPlan
  ): Promise<void> {
    try {
      await prisma.aIHistory.create({
        data: {
          userId,
          requestData: requestData as any,
          responseData: responseData as any
        }
      });
    } catch (error) {
      console.error('Failed to save AI history:', error);
      // Non-critical error, don't throw
    }
  }
  
  /**
   * Create a standardized AI service error
   * 
   * @param message - Error message
   * @param code - Error code
   * @returns AppError object
   */
  private static createAIError(
    message: string,
    code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR
  ): AppError {
    const error = new Error(message) as AppError;
    error.statusCode = code === ErrorCode.SERVICE_UNAVAILABLE ? 503 : 500;
    error.code = code;
    return error;
  }
}

export default AIService;
