export type PipelineStage = 'PROFILING' | 'WRITTEN_CONTENT' | 'DESIGN' | 'DEVELOPMENT' | 'MARKETING';
export type PipelineStatus = 'LOCKED' | 'IN_PROGRESS' | 'APPROVED';
export type ProjectStatus = 'ACTIVE' | 'ON_HOLD' | 'COMPLETED';
export type UserRole = 'ADMIN' | 'MANAGER_PRODUCT_MODELLING' | 'MANAGER_PRODUCT_DEVELOPMENT' | 'MANAGER_PRODUCT_GROWTH' | 'CONTENT_WRITER' | 'DESIGNER' | 'DEVELOPER' | 'SOCIAL_MEDIA' | 'PAID_ADS' | 'SEO';
export type MilestoneStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE';
export type PageStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REVISION';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type AssetType = 'IMAGE' | 'VIDEO' | 'FONT' | 'DOCUMENT' | 'OTHER';

export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
  role?: UserRole;
}

export interface ProjectMember {
  id: string;
  user: User;
  role: string;
}

export interface PipelineEntry {
  id: string;
  projectId: string;
  stage: PipelineStage;
  status: PipelineStatus;
  startedAt?: string;
  approvedAt?: string;
}

export interface Milestone {
  id: string;
  label: string;
  status: MilestoneStatus;
  dueDate?: string;
  sortOrder: number;
}

export interface Persona {
  id: string;
  name: string;
  age?: string;
  role?: string;
  painPoints?: string;
  goals?: string;
}

export interface Competitor {
  id: string;
  name: string;
  url?: string;
  strengths?: string;
  weaknesses?: string;
}

export interface ProjectProfiling {
  id: string;
  projectId: string;
  companyName?: string;
  industry?: string;
  about?: string;
  objectives?: string;
  brandVoice?: string;
  toneOfVoice?: string;
  primaryKeywords?: string;
  secondaryKeywords?: string;
  completedAt?: string;
  personas: Persona[];
  competitors: Competitor[];
}

export interface ContentPage {
  id: string;
  title: string;
  slug?: string;
  body?: string;
  metaTitle?: string;
  metaDescription?: string;
  status: PageStatus;
  wordCount?: number;
  sortOrder: number;
}

export interface WrittenContent {
  id: string;
  projectId: string;
  contentBrief?: string;
  toneOfVoice?: string;
  completedAt?: string;
  pages: ContentPage[];
}

export interface DesignTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  dueDate?: string;
  sortOrder: number;
}

export interface DesignAsset {
  id: string;
  name: string;
  type: AssetType;
  url: string;
  notes?: string;
  version: number;
  approvedAt?: string;
}

export interface Design {
  id: string;
  projectId: string;
  brief?: string;
  styleGuide?: string;
  figmaUrl?: string;
  completedAt?: string;
  tasks: DesignTask[];
  assets: DesignAsset[];
}

export interface DevTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeName?: string;
  dueDate?: string;
  sortOrder: number;
}

export interface Development {
  id: string;
  projectId: string;
  techStack?: string;
  repoUrl?: string;
  stagingUrl?: string;
  liveUrl?: string;
  notes?: string;
  completedAt?: string;
  tasks: DevTask[];
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  status: ProjectStatus;
  currentStage: PipelineStage;
  description?: string;
  startDate?: string;
  targetDate?: string;
  createdAt: string;
  updatedAt: string;
  members: ProjectMember[];
  pipeline: PipelineEntry[];
  milestones?: Milestone[];
  profiling?: ProjectProfiling;
  content?: WrittenContent;
  design?: Design;
  development?: Development;
  _count?: { milestones: number };
}

export interface CreateProjectDto {
  name: string;
  clientName: string;
  description?: string;
  startDate?: string;
  targetDate?: string;
}
