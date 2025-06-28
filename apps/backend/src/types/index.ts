import { Request } from 'express';
import {
  User,
  Project,
  Task,
  ProjectStatus,
  ProjectPriority,
  ProjectCategory,
  TaskStatus,
  TaskComplexity,
  EnergyType,
  UserPreferences
} from '@prisma/client';

// ======== Authentication Types ========

export interface RegisterDTO {
  email: string;
  password: string;
  name?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  token: string;
  user: UserDTO;
}

// ======== Extended Express Request ========

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

// ======== Error Types ========

export interface AppError extends Error {
  statusCode: number;
  code?: string;
  details?: unknown;
}

export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFLICT = 'CONFLICT',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}

// ======== Data Transfer Objects ========

export interface UserDTO {
  id: string;
  email: string;
  name?: string | null;
  createdAt: Date;
  updatedAt: Date;
  preferences?: UserPreferencesDTO | null;
}

export interface UserPreferencesDTO {
  id: string;
  userId: string;
  maxTasksPerDay: number;
  maxWorkHoursPerDay: number;
  preferredTimeBlocks?: any;
  peakProductivityStart?: string | null;
  peakProductivityEnd?: string | null;
  preferredProjectsPerDay: number;
  complexToSimpleRatio: number;
  shortTermGoals?: any;
  longTermGoals?: any;
  personalValues?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectDTO {
  id: string;
  name: string;
  description?: string | null;
  goal?: string | null;
  priority: ProjectPriority;
  category: ProjectCategory;
  status: ProjectStatus;
  softDeadline?: Date | null;
  hardDeadline?: Date | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  tasks?: TaskDTO[];
}

export interface TaskDTO {
  id: string;
  name: string;
  description?: string | null;
  priority: number;
  complexity: TaskComplexity;
  energyType: EnergyType;
  status: TaskStatus;
  tags?: string[];
  projectId: string;
  userId: string;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  dependencies?: TaskDTO[];
  project?: ProjectDTO;
}

export interface DailyPlanDTO {
  id: string;
  date: Date;
  aiReasoning?: string | null;
  isCompleted: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  tasks: DailyPlanTaskDTO[];
}

export interface DailyPlanTaskDTO {
  id: string;
  dailyPlanId: string;
  taskId: string;
  order: number;
  recommendedStartTime?: string | null;
  recommendedEndTime?: string | null;
  aiAdvice?: string | null;
  isCompleted: boolean;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  task: TaskDTO;
}

// ======== Request/Response Types ========

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ======== Project Request Types ========

export interface CreateProjectDTO {
  name: string;
  description?: string;
  goal?: string;
  priority?: ProjectPriority;
  category?: ProjectCategory;
  softDeadline?: Date;
  hardDeadline?: Date;
}

export interface UpdateProjectDTO {
  name?: string;
  description?: string;
  goal?: string;
  priority?: ProjectPriority;
  category?: ProjectCategory;
  status?: ProjectStatus;
  softDeadline?: Date | null;
  hardDeadline?: Date | null;
}

// ======== Task Request Types ========

export interface CreateTaskDTO {
  name: string;
  description?: string;
  priority?: number;
  complexity?: TaskComplexity;
  energyType?: EnergyType;
  tags?: string[];
  projectId: string;
  dependsOnTaskIds?: string[];
}

export interface UpdateTaskDTO {
  name?: string;
  description?: string;
  priority?: number;
  complexity?: TaskComplexity;
  energyType?: EnergyType;
  status?: TaskStatus;
  tags?: string[];
  projectId?: string;
  dependsOnTaskIds?: string[];
}

// ======== User Preferences Types ========

export interface UpdateUserPreferencesDTO {
  maxTasksPerDay?: number;
  maxWorkHoursPerDay?: number;
  preferredTimeBlocks?: any;
  peakProductivityStart?: string | null;
  peakProductivityEnd?: string | null;
  preferredProjectsPerDay?: number;
  complexToSimpleRatio?: number;
  shortTermGoals?: any;
  longTermGoals?: any;
  personalValues?: any;
}

// ======== AI Service Types ========

export interface AIPromptContext {
  user: {
    dailyLimit: number;
    projectsPerDay: number;
    peakHours: string | null;
    currentGoals: any;
  };
  projects: ProjectDTO[];
  availableTasks: TaskDTO[];
  completionHistory?: {
    date: Date;
    tasksCompleted: number;
    tasksPlanned: number;
  }[];
}

export interface AIGeneratedPlan {
  tasks: {
    taskId: string;
    order: number;
    recommendedStartTime?: string;
    recommendedEndTime?: string;
    aiAdvice?: string;
  }[];
  reasoning: string;
}

export interface AIHistoryEntry {
  id: string;
  userId: string;
  requestData: AIPromptContext;
  responseData: AIGeneratedPlan;
  createdAt: Date;
}

// ======== Daily Plan Types ========

export interface CreateDailyPlanDTO {
  date?: Date;
  tasks: {
    taskId: string;
    order: number;
    recommendedStartTime?: string;
    recommendedEndTime?: string;
    aiAdvice?: string;
  }[];
  aiReasoning?: string;
}

export interface UpdateDailyPlanDTO {
  isCompleted?: boolean;
  tasks?: {
    taskId: string;
    order?: number;
    recommendedStartTime?: string;
    recommendedEndTime?: string;
    aiAdvice?: string;
    isCompleted?: boolean;
  }[];
}

// ======== Task Dependency Types ========

export interface TaskDependencyDTO {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  createdAt: Date;
}
