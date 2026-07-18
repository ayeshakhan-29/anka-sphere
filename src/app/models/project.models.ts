export type PipelineStage = 'PROFILING' | 'WRITTEN_CONTENT' | 'DESIGN' | 'DEVELOPMENT' | 'MARKETING';
export type PipelineStatus = 'LOCKED' | 'IN_PROGRESS' | 'APPROVED';
export type ProjectStatus = 'ACTIVE' | 'ON_HOLD' | 'COMPLETED';
export type UserRole = 'ADMIN' | 'MANAGER_PRODUCT_MODELLING' | 'MANAGER_PRODUCT_DEVELOPMENT' | 'MANAGER_PRODUCT_GROWTH' | 'CONTENT_WRITER' | 'DESIGNER' | 'DEVELOPER' | 'SOCIAL_MEDIA' | 'PAID_ADS' | 'SEO';
export type MilestoneStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE';
export type PageStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REVISION';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type AssetType = 'IMAGE' | 'VIDEO' | 'FONT' | 'DOCUMENT' | 'OTHER';

export interface Maintenance {
  id: string;
  uptimeStatus: 'OPERATIONAL' | 'DEGRADED' | 'DOWN';
  backupLog: string;
  performanceNotes: string;
  updatedAt: string;
}

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
  scope?: string;
  budget?: string;
  priority?: string;
  brandVoice?: string;
  tagline?: string;
  brandColours?: string;
  typography?: string;
  brandRefs?: string;
  brandDislikes?: string;
  toneOfVoice?: string;
  primaryKeywords?: string;
  secondaryKeywords?: string;
  existingDomain?: string;
  localSeo?: string;
  seoNotes?: string;
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
  seoTitle?: string;
  seoDescription?: string;
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

export type DevTaskStatus = 'SETUP' | 'IN_DEVELOPMENT' | 'IN_QA' | 'STAGING' | 'LIVE' | 'MAINTENANCE';

export interface DevTask {
  id: string;
  title: string;
  description?: string;
  status: DevTaskStatus;
  priority: TaskPriority;
  assigneeName?: string;
  dueDate?: string;
  sortOrder: number;
  pageId?: string;
}

export type MarketingTaskCategory = 'CONTENT' | 'SOCIAL' | 'PAID' | 'SEO' | 'ANALYTICS' | 'OTHER';

export interface MarketingTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  category?: MarketingTaskCategory;
  assigneeName?: string;
  dueDate?: string;
  sortOrder: number;
}

export interface Marketing {
  id: string;
  projectId: string;
  strategy?: string;
  targetAudience?: string;
  budget?: string;
  channels?: string;
  notes?: string;
  completedAt?: string;
  tasks: MarketingTask[];
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

  // Maintenance & Uptime fields
  performanceNotes?: string;
  backupLog?: BackupEntry[];
  uptimeStatus?: string;
  uptimeResponseTime?: number;
  uptimeLastChecked?: string;
  changeLog?: ChangeLogEntry[];
  qaTemplate?: QaTemplateItem[];
  maintenanceRequests?: MaintenanceRequest[];
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
  analyticsPropertyId?: string;
  searchConsoleUrl?: string;
  createdAt: string;
  updatedAt: string;
  members: ProjectMember[];
  pipeline: PipelineEntry[];
  milestones?: Milestone[];
  profiling?: ProjectProfiling;
  content?: WrittenContent;
  design?: Design;
  development?: Development;
  marketing?: Marketing;
  _count?: { milestones: number };
}

export interface CreateProjectDto {
  name: string;
  clientName: string;
  description?: string;
  startDate?: string;
  targetDate?: string;
  analyticsPropertyId?: string;
  searchConsoleUrl?: string;
}

// ── Maintenance Models ────────────────────────────────────────────────

export interface BackupEntry {
  date: string;
  provider: string;
  size: string;
  note?: string;
}

export interface ChangeLogEntry {
  id: string;
  projectId: string;
  pageName: string;
  description: string;
  changedBy: string;
  changedAt: string;
}

export interface QaTemplateItem {
  id: string;
  label: string;
}

export interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  target?: string;
  requestedBy?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE';
  createdAt: string;
}

// ── WP Deployment Models ──────────────────────────────────────────────

export type WpEnv = 'DEV' | 'STAGING' | 'PRODUCTION';
export type QueueItemStatus = 'QUEUED' | 'IN_PROGRESS' | 'IN_QA' | 'STAGING_DONE' | 'LIVE_DONE' | 'FAILED';
export type QaStatus = 'NOT_STARTED' | 'PASS' | 'FAIL';
export type ContentKind = 'PAGE' | 'POST';
export type WpConnectionStatus = 'ACTIVE' | 'INACTIVE';

export interface WpConnection {
  id: string;
  projectId: string;
  env: WpEnv;
  siteUrl: string;
  wpUsername: string;
  status: WpConnectionStatus;
  connectionOk?: boolean;
  connectionMessage?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WpConnectionUpsert {
  siteUrl: string;
  wpUsername: string;
  wpAppPassword?: string;
  status?: WpConnectionStatus;
  notes?: string;
}

export interface DeploymentQueueItem {
  id: string;
  projectId: string;
  contentKind: ContentKind;
  pageId?: string;
  postId?: string;
  title: string;
  slug?: string;
  status: QueueItemStatus;
  qaStatus: QaStatus;
  qaNotes?: string;
  qaChecklist?: Record<string, boolean>;
  targetEnv: WpEnv;
  wpPostId?: number;
  wpUrl?: string;
  errorMessage?: string;
  deployedAt?: string;
  createdAt: string;
  updatedAt: string;
  page?: ContentPage;
  logs?: DeploymentLog[];
}

export interface DeploymentLog {
  id: string;
  queueItemId: string;
  env: WpEnv;
  status: 'SUCCESS' | 'ERROR';
  requestBody?: unknown;
  responseBody?: unknown;
  errorMessage?: string;
  durationMs?: number;
  pushedBy?: string;
  createdAt: string;
}

export interface WPPlugin {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  version?: string;
  status: 'ACTIVE' | 'INACTIVE';
  description?: string;
  lastUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WPPluginUpsert {
  name: string;
  slug: string;
  version?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  description?: string;
  lastUpdatedAt?: string;
}

export interface WPTheme {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  version?: string;
  status: 'ACTIVE' | 'INACTIVE';
  description?: string;
  lastUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WPThemeUpsert {
  name: string;
  slug: string;
  version?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  description?: string;
  lastUpdatedAt?: string;
}

// ── Reports ───────────────────────────────────────────────────────────────────

export type ReportType = 'WEEKLY' | 'MONTHLY';

export interface ProjectReport {
  id: string;
  projectId: string;
  type: ReportType;
  period: string;
  periodStart: string;
  status: 'DRAFT' | 'READY' | 'SENT';
  summary?: string;
  blockers?: string;
  highlights?: string;
  nextSteps?: string;
  auto: boolean;
  sentTo?: string;
  sentAt?: string;
  sentByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportUpsert {
  type: ReportType;
  period: string;
  periodStart: string;
  status?: 'DRAFT' | 'READY' | 'SENT';
  summary?: string;
  blockers?: string;
  highlights?: string;
  nextSteps?: string;
}

export type EmailDeliveryProvider = 'RESEND' | 'POSTMARK' | 'SENDGRID' | 'MAILGUN' | 'CUSTOM_SMTP';
export type EmailDeliveryStatus = 'PENDING_DNS' | 'ACTIVE';

export interface EmailDnsRecord {
  type: 'TXT' | 'CNAME' | 'MX';
  host: string;
  value: string;
  priority?: number;
  purpose: 'SPF' | 'DKIM' | 'DMARC' | 'RETURN_PATH' | 'INBOUND';
  required: boolean;
  /** Present after a verify-dns check */
  verified?: boolean;
  actual?: string | null;
}

export interface EmailDeliverySettings {
  id: string;
  projectId: string;
  provider: EmailDeliveryProvider;
  domain: string;
  fromName: string;
  fromEmail: string;
  replyToEmail?: string | null;
  status: EmailDeliveryStatus;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmailDeliveryProfile {
  settings: EmailDeliverySettings | null;
  dnsRecords: EmailDnsRecord[];
  estimatedSetupMinutes: number;
  activeFrom: string | null;
  /** Present on verify-dns responses */
  allRequiredVerified?: boolean;
}

export interface EmailDeliveryUpsert {
  provider: EmailDeliveryProvider;
  domain: string;
  fromName: string;
  fromLocalPart: string;
  replyToEmail?: string;
}

// ── AI image generation ───────────────────────────────────────────────────────

export interface AiUsageEvent {
  id: string;
  provider: string;
  operation: string;
  userName?: string;
  prompt?: string;
  costUsd: number;
  success: boolean;
  createdAt: string;
}

export interface AiUsage {
  recent: AiUsageEvent[];
  month: { count: number; costUsd: number };
  total: { count: number; costUsd: number };
}

export interface AiImageResult {
  image: string;
  revisedPrompt: string | null;
  costUsd: number;
  asset: DesignAsset | null;
}

export type AiImageModel = 'openai' | 'stability';

// ── AI video (Runway gen4_turbo — async task API) ─────────────────────────────

export type AiVideoRatio = '1280:720' | '720:1280' | '960:960';

export interface AiVideoCreateResult {
  taskId: string;
  costUsd: number;
}

export type AiVideoTaskState = 'PENDING' | 'THROTTLED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';

export interface AiVideoTaskStatus {
  status: AiVideoTaskState;
  progress: number;        // 0–1
  videoUrl: string | null; // ephemeral Runway URL for preview
  failure: string | null;
}

// ── Integrations ──────────────────────────────────────────────────────────────

export type IntegrationProvider =
  | 'OPENAI'
  | 'GOOGLE_ANALYTICS'
  | 'GOOGLE_SEARCH_CONSOLE'
  | 'GOOGLE_ADS'
  | 'META'
  | 'TIKTOK'
  | 'STABILITY'
  | 'RUNWAY'
  | 'AWS_S3';

export type IntegrationStatus = 'NOT_CONFIGURED' | 'PENDING' | 'CONNECTED' | 'ERROR';

export interface IntegrationInfo {
  provider: IntegrationProvider;
  kind: 'oauth' | 'env';
  status: IntegrationStatus;
  configured: boolean;
  accountName: string | null;
  connectedAt: string | null;
  lastSyncedAt: string | null;
  errorMessage: string | null;
}

// ── Live metrics (GA4 / GSC / Ads) ───────────────────────────────────────────

export interface MetricsEnvelope<T> {
  data: T;
  fetchedAt: string;
  cached: boolean;
}

export interface Ga4Metrics {
  propertyId: string;
  rangeDays: number;
  sessions: number;
  totalUsers: number;
  newUsers: number;
  conversions: number;
  engagementRate: number;
  averageSessionDuration: number;
  topPages: Array<{ path: string; sessions: number; users: number }>;
  sessionsByDay: Array<{ date: string; sessions: number }>;
}

export interface GscMetrics {
  siteUrl: string;
  rangeDays: number;
  clicks: number;
  impressions: number;
  ctr: number;
  avgPosition: number;
  topQueries: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
  topPages: Array<{ page: string; clicks: number; impressions: number }>;
}

export interface AdCampaign {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
}

export interface AdAccountSummary {
  accountId: string;
  rangeDays: number;
  totals: { spend: number; impressions: number; clicks: number; conversions: number };
  campaigns: AdCampaign[];
}

export type AdNetwork = 'GOOGLE' | 'META';

export interface AdAccountLink {
  id: string;
  projectId: string;
  network: AdNetwork;
  externalAccountId: string;
  externalAccountName: string | null;
  externalCampaignIds: string[] | null;
  createdAt: string;
  updatedAt: string;
}

// ── Social posts ─────────────────────────────────────────────────────────────

export type SocialPlatform = 'INSTAGRAM' | 'TIKTOK' | 'FACEBOOK' | 'LINKEDIN' | 'X';
export type SocialPostStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED';

export interface SocialPost {
  id: string;
  projectId: string;
  platform: SocialPlatform;
  caption: string;
  hashtags: string | null;
  mediaAssetId: string | null;
  mediaAsset: { id: string; name: string; type: string; url: string; thumbnailUrl: string | null } | null;
  scheduledAt: string | null;
  status: SocialPostStatus;
  externalPostId: string | null;
  externalUrl: string | null;
  errorMessage: string | null;
  publishedAt: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SocialPostInput {
  platform: SocialPlatform;
  caption: string;
  hashtags?: string | null;
  mediaAssetId?: string | null;
  scheduledAt?: string | null;
  status?: 'DRAFT' | 'SCHEDULED';
  createdByName?: string | null;
}
