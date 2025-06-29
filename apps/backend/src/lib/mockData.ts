import { hashSync } from 'bcrypt';

// Mock database for testing without a real database connection
// This provides in-memory data that mimics the structure of our Prisma models

// Local Enum Definitions (matching Prisma schema)
export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
}

export enum ProjectPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum ProjectCategory {
  WORK = 'WORK',
  PERSONAL = 'PERSONAL',
  STUDY = 'STUDY',
  HEALTH = 'HEALTH',
  FINANCE = 'FINANCE',
  SOCIAL = 'SOCIAL',
  HOBBY = 'HOBBY',
  OTHER = 'OTHER',
}

export enum TaskStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  POSTPONED = 'POSTPONED',
}

export enum TaskComplexity {
  VERY_SMALL = 'VERY_SMALL', // 15 min
  SMALL = 'SMALL',       // 30 min
  MEDIUM = 'MEDIUM',      // 1 hour
  LARGE = 'LARGE',       // 2 hours
  VERY_LARGE = 'VERY_LARGE',  // 2+ hours
}

export enum EnergyType {
  CREATIVE = 'CREATIVE',
  ROUTINE = 'ROUTINE',
  COMMUNICATION = 'COMMUNICATION',
  PHYSICAL = 'PHYSICAL',
}

// Define interfaces for mock data to match Prisma types
interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface UserPreferences {
  id: string;
  userId: string;
  maxTasksPerDay: number;
  maxWorkHoursPerDay: number;
  preferredTimeBlocks: any;
  peakProductivityStart: string | null;
  peakProductivityEnd: string | null;
  preferredProjectsPerDay: number;
  complexToSimpleRatio: number;
  shortTermGoals: any;
  longTermGoals: any;
  personalValues: any;
  createdAt: Date;
  updatedAt: Date;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  goal: string | null;
  priority: ProjectPriority;
  category: ProjectCategory;
  status: ProjectStatus;
  softDeadline: Date | null;
  hardDeadline: Date | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Task {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  complexity: TaskComplexity;
  energyType: EnergyType;
  status: TaskStatus;
  tags: string[] | null;
  projectId: string;
  userId: string;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface DailyPlan {
  id: string;
  date: Date;
  aiReasoning: string | null;
  isCompleted: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface DailyPlanTask {
  id: string;
  dailyPlanId: string;
  taskId: string;
  order: number;
  recommendedStartTime: string | null;
  recommendedEndTime: string | null;
  aiAdvice: string | null;
  isCompleted: boolean;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  createdAt: Date;
}

interface AIHistory {
  id: string;
  userId: string;
  requestData: any;
  responseData: any;
  createdAt: Date;
}

// ======== Mock Users ========
export const users: User[] = [
  {
    id: 'user-1',
    email: 'demo@adhd-tasks.com',
    passwordHash: hashSync('Password123', 10), // Never store plain passwords in real code
    name: 'Demo User',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  },
  {
    id: 'user-2',
    email: 'test@adhd-tasks.com',
    passwordHash: hashSync('Password123', 10),
    name: 'Test User',
    createdAt: new Date('2025-01-02'),
    updatedAt: new Date('2025-01-02')
  }
];

// ======== User Preferences ========
export const userPreferences: UserPreferences[] = [
  {
    id: 'pref-1',
    userId: 'user-1',
    maxTasksPerDay: 5,
    maxWorkHoursPerDay: 6.0, // Reduced for ADHD-friendly workload
    preferredTimeBlocks: {
      morning: ['08:00-10:00'],
      afternoon: ['13:00-15:00'],
      evening: ['19:00-20:00']
    },
    peakProductivityStart: '09:00',
    peakProductivityEnd: '11:00',
    preferredProjectsPerDay: 3, // ADHD feature: switching between projects
    complexToSimpleRatio: 0.4, // 40% complex, 60% simple tasks
    shortTermGoals: ['Complete project X', 'Learn new skill Y'],
    longTermGoals: ['Career advancement', 'Better work-life balance'],
    personalValues: ['Creativity', 'Growth', 'Connection'],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  },
  {
    id: 'pref-2',
    userId: 'user-2',
    maxTasksPerDay: 7,
    maxWorkHoursPerDay: 8.0,
    preferredTimeBlocks: {
      morning: ['07:00-09:00'],
      afternoon: ['14:00-16:00'],
      evening: ['20:00-21:00']
    },
    peakProductivityStart: '07:00',
    peakProductivityEnd: '10:00',
    preferredProjectsPerDay: 2,
    complexToSimpleRatio: 0.6, // 60% complex, 40% simple tasks
    shortTermGoals: ['Finish course', 'Organize home office'],
    longTermGoals: ['Start own business', 'Publish book'],
    personalValues: ['Focus', 'Independence', 'Achievement'],
    createdAt: new Date('2025-01-02'),
    updatedAt: new Date('2025-01-02')
  }
];

// ======== Projects ========
export const projects: Project[] = [
  {
    id: 'project-1',
    name: 'Work Presentation',
    description: 'Quarterly results presentation for the team',
    goal: 'Create engaging slides and practice delivery',
    priority: ProjectPriority.HIGH,
    category: ProjectCategory.WORK,
    status: ProjectStatus.ACTIVE,
    softDeadline: new Date('2025-07-10'),
    hardDeadline: new Date('2025-07-15'),
    userId: 'user-1',
    createdAt: new Date('2025-06-01'),
    updatedAt: new Date('2025-06-01')
  },
  {
    id: 'project-2',
    name: 'Home Organization',
    description: 'Declutter and organize living spaces',
    goal: 'Create a more peaceful environment',
    priority: ProjectPriority.MEDIUM,
    category: ProjectCategory.PERSONAL,
    status: ProjectStatus.ACTIVE,
    softDeadline: new Date('2025-07-20'),
    hardDeadline: null,
    userId: 'user-1',
    createdAt: new Date('2025-06-02'),
    updatedAt: new Date('2025-06-02')
  },
  {
    id: 'project-3',
    name: 'Learn React Native',
    description: 'Study mobile development with React Native',
    goal: 'Build a simple mobile app',
    priority: ProjectPriority.LOW,
    category: ProjectCategory.STUDY,
    status: ProjectStatus.ACTIVE,
    softDeadline: null,
    hardDeadline: null,
    userId: 'user-1',
    createdAt: new Date('2025-06-03'),
    updatedAt: new Date('2025-06-03')
  },
  {
    id: 'project-4',
    name: 'Exercise Routine',
    description: 'Establish regular workout schedule',
    goal: 'Improve physical health and mental clarity',
    priority: ProjectPriority.MEDIUM,
    category: ProjectCategory.HEALTH,
    status: ProjectStatus.ACTIVE,
    softDeadline: null,
    hardDeadline: null,
    userId: 'user-1',
    createdAt: new Date('2025-06-04'),
    updatedAt: new Date('2025-06-04')
  },
  {
    id: 'project-5',
    name: 'Budget Planning',
    description: 'Review and optimize monthly budget',
    goal: 'Reduce unnecessary expenses',
    priority: ProjectPriority.HIGH,
    category: ProjectCategory.FINANCE,
    status: ProjectStatus.PAUSED,
    softDeadline: new Date('2025-07-01'),
    hardDeadline: null,
    userId: 'user-1',
    createdAt: new Date('2025-06-05'),
    updatedAt: new Date('2025-06-15')
  }
];

// ======== Tasks ========
export const tasks: Task[] = [
  // Work Presentation Tasks
  {
    id: 'task-1',
    name: 'Gather data for presentation',
    description: 'Collect quarterly metrics from the analytics dashboard',
    priority: 4, // High priority (1-5 scale)
    complexity: TaskComplexity.MEDIUM,
    energyType: EnergyType.ROUTINE,
    status: TaskStatus.COMPLETED,
    tags: ['research', 'data'],
    projectId: 'project-1',
    userId: 'user-1',
    completedAt: new Date('2025-06-28'),
    createdAt: new Date('2025-06-10'),
    updatedAt: new Date('2025-06-28')
  },
  {
    id: 'task-2',
    name: 'Create slide deck',
    description: 'Design presentation slides with key points and visuals',
    priority: 5, // Highest priority
    complexity: TaskComplexity.LARGE,
    energyType: EnergyType.CREATIVE,
    status: TaskStatus.IN_PROGRESS,
    tags: ['design', 'creative'],
    projectId: 'project-1',
    userId: 'user-1',
    completedAt: null,
    createdAt: new Date('2025-06-12'),
    updatedAt: new Date('2025-06-27')
  },
  {
    id: 'task-3',
    name: 'Practice presentation',
    description: 'Rehearse delivery and timing',
    priority: 3, // Medium priority
    complexity: TaskComplexity.MEDIUM,
    energyType: EnergyType.COMMUNICATION,
    status: TaskStatus.NOT_STARTED,
    tags: ['speaking', 'preparation'],
    projectId: 'project-1',
    userId: 'user-1',
    completedAt: null,
    createdAt: new Date('2025-06-14'),
    updatedAt: new Date('2025-06-14')
  },
  
  // Home Organization Tasks
  {
    id: 'task-4',
    name: 'Sort kitchen cabinets',
    description: 'Remove unused items and organize essentials',
    priority: 2, // Lower priority
    complexity: TaskComplexity.SMALL,
    energyType: EnergyType.PHYSICAL,
    status: TaskStatus.NOT_STARTED,
    tags: ['cleaning', 'kitchen'],
    projectId: 'project-2',
    userId: 'user-1',
    completedAt: null,
    createdAt: new Date('2025-06-15'),
    updatedAt: new Date('2025-06-15')
  },
  {
    id: 'task-5',
    name: 'Organize desk',
    description: 'Clear workspace and set up productivity system',
    priority: 4, // High priority
    complexity: TaskComplexity.SMALL,
    energyType: EnergyType.PHYSICAL,
    status: TaskStatus.NOT_STARTED,
    tags: ['workspace', 'productivity'],
    projectId: 'project-2',
    userId: 'user-1',
    completedAt: null,
    createdAt: new Date('2025-06-16'),
    updatedAt: new Date('2025-06-16')
  },
  
  // Learn React Native Tasks
  {
    id: 'task-6',
    name: 'Complete React Native tutorial',
    description: 'Follow the official getting started guide',
    priority: 3, // Medium priority
    complexity: TaskComplexity.LARGE,
    energyType: EnergyType.CREATIVE,
    status: TaskStatus.NOT_STARTED,
    tags: ['learning', 'coding'],
    projectId: 'project-3',
    userId: 'user-1',
    completedAt: null,
    createdAt: new Date('2025-06-17'),
    updatedAt: new Date('2025-06-17')
  },
  {
    id: 'task-7',
    name: 'Set up development environment',
    description: 'Install required tools and dependencies',
    priority: 4, // High priority (blocker for other tasks)
    complexity: TaskComplexity.SMALL,
    energyType: EnergyType.ROUTINE,
    status: TaskStatus.NOT_STARTED,
    tags: ['setup', 'coding'],
    projectId: 'project-3',
    userId: 'user-1',
    completedAt: null,
    createdAt: new Date('2025-06-18'),
    updatedAt: new Date('2025-06-18')
  },
  
  // Exercise Routine Tasks
  {
    id: 'task-8',
    name: 'Morning walk',
    description: '30-minute walk around the neighborhood',
    priority: 3, // Medium priority
    complexity: TaskComplexity.SMALL,
    energyType: EnergyType.PHYSICAL,
    status: TaskStatus.NOT_STARTED,
    tags: ['exercise', 'morning'],
    projectId: 'project-4',
    userId: 'user-1',
    completedAt: null,
    createdAt: new Date('2025-06-19'),
    updatedAt: new Date('2025-06-19')
  },
  {
    id: 'task-9',
    name: 'Strength training',
    description: 'Basic bodyweight exercises',
    priority: 2, // Lower priority
    complexity: TaskComplexity.MEDIUM,
    energyType: EnergyType.PHYSICAL,
    status: TaskStatus.NOT_STARTED,
    tags: ['exercise', 'strength'],
    projectId: 'project-4',
    userId: 'user-1',
    completedAt: null,
    createdAt: new Date('2025-06-20'),
    updatedAt: new Date('2025-06-20')
  },
  
  // Budget Planning Tasks
  {
    id: 'task-10',
    name: 'Review last month\'s expenses',
    description: 'Categorize and analyze spending patterns',
    priority: 3, // Medium priority
    complexity: TaskComplexity.MEDIUM,
    energyType: EnergyType.ROUTINE,
    status: TaskStatus.NOT_STARTED,
    tags: ['finance', 'analysis'],
    projectId: 'project-5',
    userId: 'user-1',
    completedAt: null,
    createdAt: new Date('2025-06-21'),
    updatedAt: new Date('2025-06-21')
  },
  {
    id: 'task-11',
    name: 'Create budget spreadsheet',
    description: 'Set up categories and formulas',
    priority: 4, // High priority
    complexity: TaskComplexity.VERY_SMALL,
    energyType: EnergyType.ROUTINE,
    status: TaskStatus.NOT_STARTED,
    tags: ['finance', 'organization'],
    projectId: 'project-5',
    userId: 'user-1',
    completedAt: null,
    createdAt: new Date('2025-06-22'),
    updatedAt: new Date('2025-06-22')
  }
];

// ======== Daily Plans ========
export const dailyPlans: DailyPlan[] = [
  {
    id: 'plan-1',
    date: new Date('2025-06-28'),
    aiReasoning: `This plan balances tasks from 3 different projects to maintain engagement while respecting your energy patterns. 
    I've scheduled creative work during your peak productivity hours (9-11am) and included a mix of complexity levels.
    The plan alternates between different energy types to prevent fatigue and includes short breaks between tasks.`,
    isCompleted: false,
    userId: 'user-1',
    createdAt: new Date('2025-06-28'),
    updatedAt: new Date('2025-06-28')
  }
];

// ======== Daily Plan Tasks ========
export const dailyPlanTasks: DailyPlanTask[] = [
  {
    id: 'planTask-1',
    dailyPlanId: 'plan-1',
    taskId: 'task-2', // Create slide deck (creative, high priority)
    order: 1,
    recommendedStartTime: '09:00',
    recommendedEndTime: '11:00',
    aiAdvice: 'Start with this creative task during your peak productivity hours. Break it into sections and take a 5-minute break every 25 minutes.',
    isCompleted: false,
    completedAt: null,
    createdAt: new Date('2025-06-28'),
    updatedAt: new Date('2025-06-28')
  },
  {
    id: 'planTask-2',
    dailyPlanId: 'plan-1',
    taskId: 'task-5', // Organize desk (physical, quick win)
    order: 2,
    recommendedStartTime: '11:15',
    recommendedEndTime: '11:45',
    aiAdvice: 'This physical task provides a change of pace after the creative work. It\'s also a quick win to build momentum.',
    isCompleted: false,
    completedAt: null,
    createdAt: new Date('2025-06-28'),
    updatedAt: new Date('2025-06-28')
  },
  {
    id: 'planTask-3',
    dailyPlanId: 'plan-1',
    taskId: 'task-7', // Set up development environment (routine, high priority)
    order: 3,
    recommendedStartTime: '13:30',
    recommendedEndTime: '14:00',
    aiAdvice: 'This task is a blocker for your learning project. It\'s short but important, perfect for after lunch when energy might be lower.',
    isCompleted: false,
    completedAt: null,
    createdAt: new Date('2025-06-28'),
    updatedAt: new Date('2025-06-28')
  },
  {
    id: 'planTask-4',
    dailyPlanId: 'plan-1',
    taskId: 'task-8', // Morning walk (physical, refreshing)
    order: 4,
    recommendedStartTime: '15:00',
    recommendedEndTime: '15:30',
    aiAdvice: 'A physical activity in the afternoon will help refresh your mind and prevent the afternoon slump.',
    isCompleted: false,
    completedAt: null,
    createdAt: new Date('2025-06-28'),
    updatedAt: new Date('2025-06-28')
  },
  {
    id: 'planTask-5',
    dailyPlanId: 'plan-1',
    taskId: 'task-3', // Practice presentation (communication)
    order: 5,
    recommendedStartTime: '16:00',
    recommendedEndTime: '17:00',
    aiAdvice: 'End the day with this communication task. Speaking aloud will use different mental muscles than earlier tasks.',
    isCompleted: false,
    completedAt: null,
    createdAt: new Date('2025-06-28'),
    updatedAt: new Date('2025-06-28')
  }
];

// ======== Task Dependencies ========
export const taskDependencies = [
  {
    id: 'dep-1',
    taskId: 'task-3', // Practice presentation
    dependsOnTaskId: 'task-2', // Create slide deck
    createdAt: new Date('2025-06-14')
  },
  {
    id: 'dep-2',
    taskId: 'task-6', // Complete React Native tutorial
    dependsOnTaskId: 'task-7', // Set up development environment
    createdAt: new Date('2025-06-17')
  }
];

// ======== AI History ========
export const aiHistory = [
  {
    id: 'ai-1',
    userId: 'user-1',
    requestData: {
      user: {
        dailyLimit: 5,
        projectsPerDay: 3,
        peakHours: '09:00 - 11:00',
        currentGoals: ['Complete project X', 'Learn new skill Y']
      },
      projects: [
        // Simplified project data for the request
        { id: 'project-1', name: 'Work Presentation', priority: 'HIGH' },
        { id: 'project-2', name: 'Home Organization', priority: 'MEDIUM' },
        { id: 'project-3', name: 'Learn React Native', priority: 'LOW' },
        { id: 'project-4', name: 'Exercise Routine', priority: 'MEDIUM' }
      ],
      availableTasks: [
        // Simplified task data for the request
        { id: 'task-2', name: 'Create slide deck', complexity: 'LARGE', energyType: 'CREATIVE', priority: 5 },
        { id: 'task-3', name: 'Practice presentation', complexity: 'MEDIUM', energyType: 'COMMUNICATION', priority: 3 },
        { id: 'task-5', name: 'Organize desk', complexity: 'SMALL', energyType: 'PHYSICAL', priority: 4 },
        { id: 'task-7', name: 'Set up development environment', complexity: 'SMALL', energyType: 'ROUTINE', priority: 4 },
        { id: 'task-8', name: 'Morning walk', complexity: 'SMALL', energyType: 'PHYSICAL', priority: 3 }
      ]
    },
    responseData: {
      tasks: [
        { taskId: 'task-2', order: 1, recommendedStartTime: '09:00', recommendedEndTime: '11:00', 
          aiAdvice: 'Start with this creative task during your peak productivity hours.' },
        { taskId: 'task-5', order: 2, recommendedStartTime: '11:15', recommendedEndTime: '11:45', 
          aiAdvice: 'This physical task provides a change of pace after the creative work.' },
        { taskId: 'task-7', order: 3, recommendedStartTime: '13:30', recommendedEndTime: '14:00', 
          aiAdvice: 'This task is a blocker for your learning project.' },
        { taskId: 'task-8', order: 4, recommendedStartTime: '15:00', recommendedEndTime: '15:30', 
          aiAdvice: 'A physical activity in the afternoon will help refresh your mind.' },
        { taskId: 'task-3', order: 5, recommendedStartTime: '16:00', recommendedEndTime: '17:00', 
          aiAdvice: 'End the day with this communication task.' }
      ],
      reasoning: 'This plan balances tasks from 3 different projects to maintain engagement while respecting your energy patterns.'
    },
    createdAt: new Date('2025-06-28')
  }
];

// ======== Mock Database Functions ========

// User functions
export const findUserByEmail = (email: string) => {
  return users.find(user => user.email === email);
};

export const findUserById = (id: string) => {
  return users.find(user => user.id === id);
};

// User Preferences functions
export const findUserPreferences = (userId: string) => {
  return userPreferences.find(pref => pref.userId === userId);
};

// Project functions
export const findUserProjects = (userId: string) => {
  return projects.filter(project => project.userId === userId);
};

export const findProjectById = (id: string) => {
  return projects.find(project => project.id === id);
};

// Task functions
export const findProjectTasks = (projectId: string) => {
  return tasks.filter(task => task.projectId === projectId);
};

export const findUserTasks = (userId: string) => {
  return tasks.filter(task => task.userId === userId);
};

export const findTaskById = (id: string) => {
  return tasks.find(task => task.id === id);
};

// Daily Plan functions
export const findUserDailyPlans = (userId: string) => {
  return dailyPlans.filter(plan => plan.userId === userId);
};

export const findDailyPlanById = (id: string) => {
  return dailyPlans.find(plan => plan.id === id);
};

export const findDailyPlanTasks = (planId: string) => {
  return dailyPlanTasks.filter(task => task.dailyPlanId === planId);
};

// Get today's plan for a user
export const findTodayPlan = (userId: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return dailyPlans.find(plan => {
    const planDate = new Date(plan.date);
    planDate.setHours(0, 0, 0, 0);
    return plan.userId === userId && planDate.getTime() === today.getTime();
  });
};

// Task Dependencies functions
export const findTaskDependencies = (taskId: string) => {
  return taskDependencies.filter(dep => dep.taskId === taskId);
};

export const findDependentTasks = (taskId: string) => {
  return taskDependencies.filter(dep => dep.dependsOnTaskId === taskId);
};

// AI History functions
export const findUserAIHistory = (userId: string) => {
  return aiHistory.filter(history => history.userId === userId);
};
