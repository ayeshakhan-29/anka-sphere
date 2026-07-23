import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import {
  Project,
  ProjectProfiling,
  WrittenContent,
  ContentPage,
  Design,
  DesignTask,
  DesignAsset,
  Development,
  DevTask,
  Marketing,
  MarketingTask,
  Milestone,
  DeploymentLog,
  MaintenanceRequest,
  QaTemplateItem,
  Persona,
  Competitor,
  CreateProjectDto,
  ProjectReport,
  ReportUpsert,
  EmailDeliveryProfile,
  EmailDeliveryUpsert,
  AiUsage,
  AiImageResult,
  AiVideoCreateResult,
  AiVideoTaskStatus,
  AiVideoRatio,
  MetricsEnvelope,
  Ga4Metrics,
  GscMetrics,
  AdAccountSummary,
  AdAccountLink,
  AdNetwork,
  SocialPost,
  SocialPostInput,
  EmailCampaign,
  ContentRepurpose,
  CommunityQueueItem,
  AdCreative,
  ConversionEvent,
  Backlink,
  KeywordRankLog,
} from '../models/project.models';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private api = inject(ApiService);

  // ── Projects ──────────────────────────────────────────────────────────────

  getProjects() {
    return this.api.get<Project[]>('/projects');
  }

  getProject(id: string) {
    return this.api.get<Project>(`/projects/${id}`);
  }

  createProject(data: CreateProjectDto) {
    return this.api.post<Project>('/projects', data);
  }

  updateProject(id: string, data: Partial<CreateProjectDto>) {
    return this.api.patch<Project>(`/projects/${id}`, data);
  }

  deleteProject(id: string) {
    return this.api.delete<void>(`/projects/${id}`);
  }

  // ── Profiling ─────────────────────────────────────────────────────────────

  upsertProfiling(projectId: string, data: Partial<ProjectProfiling>) {
    return this.api.put<ProjectProfiling>(`/projects/${projectId}/profiling`, data);
  }

  completeProfiling(projectId: string) {
    return this.api.post<{ message: string }>(`/projects/${projectId}/profiling/complete`, {});
  }

  // ── Personas ──────────────────────────────────────────────────────────────

  createPersona(projectId: string, data: Omit<Persona, 'id'>) {
    return this.api.post<Persona>(`/projects/${projectId}/profiling/personas`, data);
  }

  updatePersona(projectId: string, personaId: string, data: Partial<Persona>) {
    return this.api.patch<Persona>(`/projects/${projectId}/profiling/personas/${personaId}`, data);
  }

  deletePersona(projectId: string, personaId: string) {
    return this.api.delete<void>(`/projects/${projectId}/profiling/personas/${personaId}`);
  }

  // ── Competitors ───────────────────────────────────────────────────────────

  createCompetitor(projectId: string, data: Omit<Competitor, 'id'>) {
    return this.api.post<Competitor>(`/projects/${projectId}/profiling/competitors`, data);
  }

  updateCompetitor(projectId: string, compId: string, data: Partial<Competitor>) {
    return this.api.patch<Competitor>(`/projects/${projectId}/profiling/competitors/${compId}`, data);
  }

  deleteCompetitor(projectId: string, compId: string) {
    return this.api.delete<void>(`/projects/${projectId}/profiling/competitors/${compId}`);
  }

  // ── Milestones ────────────────────────────────────────────────────────────

  getMilestones(projectId: string) {
    return this.api.get<Milestone[]>(`/projects/${projectId}/milestones`);
  }

  createMilestone(projectId: string, data: Omit<Milestone, 'id'>) {
    return this.api.post<Milestone>(`/projects/${projectId}/milestones`, data);
  }

  updateMilestone(projectId: string, msId: string, data: Partial<Milestone>) {
    return this.api.patch<Milestone>(`/projects/${projectId}/milestones/${msId}`, data);
  }

  deleteMilestone(projectId: string, msId: string) {
    return this.api.delete<void>(`/projects/${projectId}/milestones/${msId}`);
  }

  // ── Written Content ───────────────────────────────────────────────────────

  getContent(projectId: string) {
    return this.api.get<WrittenContent>(`/projects/${projectId}/content`);
  }

  upsertContent(projectId: string, data: Partial<WrittenContent>) {
    return this.api.put<WrittenContent>(`/projects/${projectId}/content`, data);
  }

  completeContent(projectId: string) {
    return this.api.post<{ message: string }>(`/projects/${projectId}/content/complete`, {});
  }

  createPage(projectId: string, data: Omit<ContentPage, 'id'>) {
    return this.api.post<ContentPage>(`/projects/${projectId}/content/pages`, data);
  }

  updatePage(projectId: string, pageId: string, data: Partial<ContentPage>) {
    return this.api.patch<ContentPage>(`/projects/${projectId}/content/pages/${pageId}`, data);
  }

  updatePageStatus(projectId: string, pageId: string, status: string) {
    return this.api.patch<ContentPage>(`/projects/${projectId}/content/pages/${pageId}/status`, { status });
  }

  deletePage(projectId: string, pageId: string) {
    return this.api.delete<void>(`/projects/${projectId}/content/pages/${pageId}`);
  }

  // ── Design ────────────────────────────────────────────────────────────────

  getDesign(projectId: string) {
    return this.api.get<Design>(`/projects/${projectId}/design`);
  }

  upsertDesign(projectId: string, data: Partial<Design>) {
    return this.api.put<Design>(`/projects/${projectId}/design`, data);
  }

  completeDesign(projectId: string) {
    return this.api.post<{ message: string; warnings: string[] }>(`/projects/${projectId}/design/complete`, {});
  }

  createDesignTask(projectId: string, data: Omit<DesignTask, 'id'>) {
    return this.api.post<DesignTask>(`/projects/${projectId}/design/tasks`, data);
  }

  updateDesignTask(projectId: string, taskId: string, data: Partial<DesignTask>) {
    return this.api.patch<DesignTask>(`/projects/${projectId}/design/tasks/${taskId}`, data);
  }

  deleteDesignTask(projectId: string, taskId: string) {
    return this.api.delete<void>(`/projects/${projectId}/design/tasks/${taskId}`);
  }

  createDesignAsset(projectId: string, data: Omit<DesignAsset, 'id'>) {
    return this.api.post<DesignAsset>(`/projects/${projectId}/design/assets`, data);
  }

  updateDesignAsset(projectId: string, assetId: string, data: Partial<DesignAsset>) {
    return this.api.patch<DesignAsset>(`/projects/${projectId}/design/assets/${assetId}`, data);
  }

  approveDesignAsset(projectId: string, assetId: string) {
    return this.api.post<DesignAsset>(`/projects/${projectId}/design/assets/${assetId}/approve`, {});
  }

  deleteDesignAsset(projectId: string, assetId: string) {
    return this.api.delete<void>(`/projects/${projectId}/design/assets/${assetId}`);
  }

  // ── Development ───────────────────────────────────────────────────────────

  getDevelopment(projectId: string) {
    return this.api.get<Development>(`/projects/${projectId}/development`);
  }

  upsertDevelopment(projectId: string, data: Partial<Development>) {
    return this.api.put<Development>(`/projects/${projectId}/development`, data);
  }

  completeDevelopment(projectId: string) {
    return this.api.post<{ message: string; warnings: string[] }>(`/projects/${projectId}/development/complete`, {});
  }

  createDevTask(projectId: string, data: Omit<DevTask, 'id'>) {
    return this.api.post<DevTask>(`/projects/${projectId}/development/tasks`, data);
  }

  updateDevTask(projectId: string, taskId: string, data: Partial<DevTask>) {
    return this.api.patch<DevTask>(`/projects/${projectId}/development/tasks/${taskId}`, data);
  }

  deleteDevTask(projectId: string, taskId: string) {
    return this.api.delete<void>(`/projects/${projectId}/development/tasks/${taskId}`);
  }

  // ── Marketing ─────────────────────────────────────────────────────────────

  getMarketing(projectId: string) {
    return this.api.get<Marketing>(`/projects/${projectId}/marketing`);
  }

  upsertMarketing(projectId: string, data: Partial<Marketing>) {
    return this.api.put<Marketing>(`/projects/${projectId}/marketing`, data);
  }

  completeMarketing(projectId: string) {
    return this.api.post<{ message: string; warnings: string[] }>(`/projects/${projectId}/marketing/complete`, {});
  }

  createMarketingTask(projectId: string, data: Omit<MarketingTask, 'id'>) {
    return this.api.post<MarketingTask>(`/projects/${projectId}/marketing/tasks`, data);
  }

  updateMarketingTask(projectId: string, taskId: string, data: Partial<MarketingTask>) {
    return this.api.patch<MarketingTask>(`/projects/${projectId}/marketing/tasks/${taskId}`, data);
  }

  deleteMarketingTask(projectId: string, taskId: string) {
    return this.api.delete<void>(`/projects/${projectId}/marketing/tasks/${taskId}`);
  }

  // ── WP Connections ──────────────────────────────────────────────────────

  getWpConnections(projectId: string) {
    return this.api.get<any[]>(`/projects/${projectId}/development/wp-connections`);
  }

  upsertWpConnection(projectId: string, env: string, data: any) {
    return this.api.put<any>(`/projects/${projectId}/development/wp-connections/${env}`, data);
  }

  // ── Deployment Queue ────────────────────────────────────────────────────

  getDeploymentQueue(projectId: string) {
    return this.api.get<any[]>(`/projects/${projectId}/development/queue`);
  }

  createDeploymentQueueItem(projectId: string, data: any) {
    return this.api.post<any>(`/projects/${projectId}/development/queue`, data);
  }

  updateDeploymentQueueItem(projectId: string, itemId: string, data: any) {
    return this.api.patch<any>(`/projects/${projectId}/development/queue/${itemId}`, data);
  }

  deleteDeploymentQueueItem(projectId: string, itemId: string) {
    return this.api.delete<void>(`/projects/${projectId}/development/queue/${itemId}`);
  }

  syncApprovedPagesToQueue(projectId: string) {
    return this.api.post<{ count: number; items: any[] }>(`/projects/${projectId}/development/queue/sync-approved`, {});
  }

  updateQa(projectId: string, itemId: string, data: any) {
    return this.api.patch<any>(`/projects/${projectId}/development/queue/${itemId}/qa`, data);
  }

  deploy(projectId: string, data: any) {
    return this.api.post<any>(`/projects/${projectId}/development/deploy`, data);
  }

  // ── Deployment Logs ─────────────────────────────────────────────────────

  getDeploymentLogs(projectId: string, itemId: string) {
    return this.api.get<any[]>(`/projects/${projectId}/development/queue/${itemId}/logs`);
  }

  // ── WP Plugins ──────────────────────────────────────────────────────────

  getAllDeploymentLogs(projectId: string) {
    return this.api.get<DeploymentLog[]>(`/projects/${projectId}/development/logs`);
  }
  getWpPlugins(projectId: string) {
    return this.api.get<any[]>(`/projects/${projectId}/development/wp-plugins`);
  }

  upsertWpPlugin(projectId: string, slug: string, data: any) {
    return this.api.put<any>(`/projects/${projectId}/development/wp-plugins/${slug}`, data);
  }

  // ── WP Themes ───────────────────────────────────────────────────────────

  getWpThemes(projectId: string) {
    return this.api.get<any[]>(`/projects/${projectId}/development/wp-themes`);
  }

  upsertWpTheme(projectId: string, slug: string, data: any) {
    return this.api.put<any>(`/projects/${projectId}/development/wp-themes/${slug}`, data);
  }

  // ── Change Log ──────────────────────────────────────────────────────

  getChangeLog(projectId: string) {
    return this.api.get<any[]>(`/projects/${projectId}/development/changelog`);
  }

  createChangeLogEntry(projectId: string, data: any) {
    return this.api.post<any>(`/projects/${projectId}/development/changelog`, data);
  }

  deleteChangeLogEntry(projectId: string, entryId: string) {
    return this.api.delete<void>(`/projects/${projectId}/development/changelog/${entryId}`);
  }

  // ── Project Backup ──────────────────────────────────────────────────

  triggerProjectBackup(projectId: string) {
    return this.api.post<any>(`/projects/${projectId}/development/backup`, {});
  }
  saveQaTemplate(projectId: string, items: QaTemplateItem[]) {
    return this.api.put<{ items: QaTemplateItem[] }>(`/projects/${projectId}/development/qa-template`, { items });
  }

  createMaintenanceRequest(projectId: string, data: Partial<MaintenanceRequest>) {
    return this.api.post<MaintenanceRequest>(`/projects/${projectId}/development/maintenance-requests`, data);
  }

  updateMaintenanceRequest(projectId: string, requestId: string, data: Partial<MaintenanceRequest>) {
    return this.api.patch<MaintenanceRequest>(`/projects/${projectId}/development/maintenance-requests/${requestId}`, data);
  }

  deleteMaintenanceRequest(projectId: string, requestId: string) {
    return this.api.delete<void>(`/projects/${projectId}/development/maintenance-requests/${requestId}`);
  }

  checkUptime(projectId: string) {
    return this.api.post<{ status: string; responseTime: number | null; lastChecked: string | null }>(`/projects/${projectId}/development/uptime-check`, {});
  }

  // ── Reports ───────────────────────────────────────────────────────────────

  getReports(projectId: string) {
    return this.api.get<ProjectReport[]>(`/projects/${projectId}/reports`);
  }

  upsertReport(projectId: string, data: ReportUpsert) {
    return this.api.put<ProjectReport>(`/projects/${projectId}/reports`, data);
  }

  sendReport(projectId: string, reportId: string, to: string[]) {
    return this.api.post<{ report: ProjectReport; previewUrl?: string }>(
      `/projects/${projectId}/reports/${reportId}/send`, { to },
    );
  }

  // ── AI image generation ───────────────────────────────────────────────────

  getEmailDelivery(projectId: string) {
    return this.api.get<EmailDeliveryProfile>(`/projects/${projectId}/email-delivery`);
  }

  saveEmailDelivery(projectId: string, data: EmailDeliveryUpsert) {
    return this.api.put<EmailDeliveryProfile>(`/projects/${projectId}/email-delivery`, data);
  }

  markEmailDeliveryConfigured(projectId: string) {
    return this.api.post<EmailDeliveryProfile>(`/projects/${projectId}/email-delivery/mark-configured`, { configured: true });
  }

  verifyEmailDeliveryDns(projectId: string) {
    return this.api.post<EmailDeliveryProfile>(`/projects/${projectId}/email-delivery/verify-dns`, {});
  }
  generateAiImage(projectId: string, data: { prompt: string; size?: string; model?: string; saveToAssets?: boolean; assetName?: string }) {
    return this.api.post<AiImageResult>(`/projects/${projectId}/design/ai-images`, data);
  }

  editAiImage(projectId: string, data: { image: string; instruction: string; size?: string }) {
    return this.api.post<AiImageResult>(`/projects/${projectId}/design/ai-images/edit`, data);
  }

  getAiUsage(projectId: string) {
    return this.api.get<AiUsage>(`/projects/${projectId}/design/ai-usage`);
  }

  generateAiVideo(projectId: string, data: { prompt: string; duration?: 5 | 10; ratio?: AiVideoRatio; image?: string }) {
    return this.api.post<AiVideoCreateResult>(`/projects/${projectId}/design/ai-videos`, data);
  }

  getAiVideoTask(projectId: string, taskId: string) {
    return this.api.get<AiVideoTaskStatus>(`/projects/${projectId}/design/ai-videos/${taskId}`);
  }

  saveAiVideoToAssets(projectId: string, taskId: string, data: { assetName?: string } = {}) {
    return this.api.post<{ asset: DesignAsset }>(`/projects/${projectId}/design/ai-videos/${taskId}/save`, data);
  }

  generateAiCaptions(projectId: string, data: { platform: string; topic: string }) {
    return this.api.post<{ variantA: string; variantB: string; hashtags: string[] }>(
      `/projects/${projectId}/social/ai-captions`, data,
    );
  }

  aiDraftPage(projectId: string, data: { title: string; notes?: string }) {
    return this.api.post<{ body: string; seoTitle: string; seoDescription: string }>(
      `/projects/${projectId}/content/ai-page-draft`, data,
    );
  }

  generateAiAdCopy(projectId: string, data: { network: 'GOOGLE' | 'META'; goal: string }) {
    return this.api.post<{ headlines: string[]; descriptions: string[] }>(
      `/projects/${projectId}/paid/ai-ad-copy`, data,
    );
  }

  aiDraftReport(projectId: string, type: 'WEEKLY' | 'MONTHLY') {
    return this.api.post<{ summary: string; highlights: string; blockers: string; nextSteps: string }>(
      `/projects/${projectId}/reports/ai-draft`, { type },
    );
  }

  // ── Live metrics (GA4 / GSC) ──────────────────────────────────────────────

  getGa4Metrics(projectId: string, range = 30, refresh = false) {
    return this.api.get<MetricsEnvelope<Ga4Metrics>>(
      `/projects/${projectId}/analytics/ga4?range=${range}&refresh=${refresh}`,
    );
  }

  getGscMetrics(projectId: string, range = 30, refresh = false) {
    return this.api.get<MetricsEnvelope<GscMetrics>>(
      `/projects/${projectId}/analytics/gsc?range=${range}&refresh=${refresh}`,
    );
  }

  // ── Paid — ad account links + live campaigns ──────────────────────────────

  getAdAccountLinks(projectId: string) {
    return this.api.get<{ links: AdAccountLink[] }>(`/projects/${projectId}/paid/ad-accounts`);
  }

  saveAdAccountLink(projectId: string, data: { network: AdNetwork; externalAccountId: string; externalAccountName?: string | null }) {
    return this.api.put<{ link: AdAccountLink }>(`/projects/${projectId}/paid/ad-accounts`, data);
  }

  deleteAdAccountLink(projectId: string, network: AdNetwork) {
    return this.api.delete<{ deleted: boolean }>(`/projects/${projectId}/paid/ad-accounts/${network}`);
  }

  getGoogleAdsCampaigns(projectId: string, range = 30, refresh = false) {
    return this.api.get<MetricsEnvelope<AdAccountSummary>>(
      `/projects/${projectId}/paid/google-ads?range=${range}&refresh=${refresh}`,
    );
  }

  getMetaAdsCampaigns(projectId: string, range = 30, refresh = false) {
    return this.api.get<MetricsEnvelope<AdAccountSummary>>(
      `/projects/${projectId}/paid/meta-ads?range=${range}&refresh=${refresh}`,
    );
  }

  // ── Social posts ──────────────────────────────────────────────────────────

  getSocialPosts(projectId: string) {
    return this.api.get<{ posts: SocialPost[] }>(`/projects/${projectId}/social/posts`);
  }

  createSocialPost(projectId: string, data: SocialPostInput) {
    return this.api.post<{ post: SocialPost }>(`/projects/${projectId}/social/posts`, data);
  }

  updateSocialPost(projectId: string, postId: string, data: Partial<SocialPostInput>) {
    return this.api.patch<{ post: SocialPost }>(`/projects/${projectId}/social/posts/${postId}`, data);
  }

  deleteSocialPost(projectId: string, postId: string) {
    return this.api.delete<{ deleted: boolean }>(`/projects/${projectId}/social/posts/${postId}`);
  }

  publishSocialPost(projectId: string, postId: string) {
    return this.api.post<{ post: SocialPost }>(`/projects/${projectId}/social/posts/${postId}/publish`, {});
  }

  // ── Per-project Google Credentials ────────────────────────────────────────

  getProjectGoogleCredentials(projectId: string) {
    return this.api.get<{
      analyticsPropertyId: string;
      searchConsoleUrl: string;
      googleAdsAccountId: string;
      hasClientId: boolean;
      hasClientSecret: boolean;
      hasDeveloperToken: boolean;
      status: string;
      connectedAt: string | null;
      maskedClientId: string | null;
    }>(`/projects/${projectId}/google-credentials`);
  }

  saveProjectGoogleCredentials(projectId: string, data: {
    clientId?: string;
    clientSecret?: string;
    developerToken?: string;
    analyticsPropertyId?: string;
    searchConsoleUrl?: string;
    googleAdsAccountId?: string;
  }) {
    return this.api.post<{ success: boolean; status: string }>(`/projects/${projectId}/google-credentials`, data);
  }

  // ── Email Campaigns ───────────────────────────────────────────────────────

  getEmailCampaigns(projectId: string) {
    return this.api.get<EmailCampaign[]>(`/projects/${projectId}/email-campaigns`);
  }

  createEmailCampaign(projectId: string, data: Partial<EmailCampaign>) {
    return this.api.post<EmailCampaign>(`/projects/${projectId}/email-campaigns`, data);
  }

  deleteEmailCampaign(projectId: string, campaignId: string) {
    return this.api.delete<void>(`/projects/${projectId}/email-campaigns/${campaignId}`);
  }

  // ── Content Repurposing ───────────────────────────────────────────────────

  getContentRepurposes(projectId: string) {
    return this.api.get<ContentRepurpose[]>(`/projects/${projectId}/repurposing`);
  }

  createContentRepurpose(projectId: string, data: Partial<ContentRepurpose>) {
    return this.api.post<ContentRepurpose>(`/projects/${projectId}/repurposing`, data);
  }

  deleteContentRepurpose(projectId: string, itemId: string) {
    return this.api.delete<void>(`/projects/${projectId}/repurposing/${itemId}`);
  }

  // ── Master Content Calendar ───────────────────────────────────────────────

  getMasterCalendar(projectId: string) {
    return this.api.get<any[]>(`/projects/${projectId}/master-calendar`);
  }

  // ── Community Queue ───────────────────────────────────────────────────────

  getCommunityQueue(projectId: string) {
    return this.api.get<CommunityQueueItem[]>(`/projects/${projectId}/social/community-queue`);
  }

  createCommunityQueueItem(projectId: string, data: Partial<CommunityQueueItem>) {
    return this.api.post<CommunityQueueItem>(`/projects/${projectId}/social/community-queue`, data);
  }

  updateCommunityQueueItem(projectId: string, itemId: string, data: Partial<CommunityQueueItem>) {
    return this.api.patch<CommunityQueueItem>(`/projects/${projectId}/social/community-queue/${itemId}`, data);
  }

  deleteCommunityQueueItem(projectId: string, itemId: string) {
    return this.api.delete<void>(`/projects/${projectId}/social/community-queue/${itemId}`);
  }

  // ── Ad Creatives ──────────────────────────────────────────────────────────

  getAdCreatives(projectId: string) {
    return this.api.get<AdCreative[]>(`/projects/${projectId}/paid/ad-creatives`);
  }

  createAdCreative(projectId: string, data: Partial<AdCreative>) {
    return this.api.post<AdCreative>(`/projects/${projectId}/paid/ad-creatives`, data);
  }

  deleteAdCreative(projectId: string, creativeId: string) {
    return this.api.delete<void>(`/projects/${projectId}/paid/ad-creatives/${creativeId}`);
  }

  // ── Conversion Events ─────────────────────────────────────────────────────

  getConversionEvents(projectId: string) {
    return this.api.get<ConversionEvent[]>(`/projects/${projectId}/paid/conversion-events`);
  }

  createConversionEvent(projectId: string, data: Partial<ConversionEvent>) {
    return this.api.post<ConversionEvent>(`/projects/${projectId}/paid/conversion-events`, data);
  }

  updateConversionEvent(projectId: string, eventId: string, data: Partial<ConversionEvent>) {
    return this.api.patch<ConversionEvent>(`/projects/${projectId}/paid/conversion-events/${eventId}`, data);
  }

  deleteConversionEvent(projectId: string, eventId: string) {
    return this.api.delete<void>(`/projects/${projectId}/paid/conversion-events/${eventId}`);
  }

  // ── Backlinks ──────────────────────────────────────────────────────────────

  getBacklinks(projectId: string) {
    return this.api.get<Backlink[]>(`/projects/${projectId}/seo/backlinks`);
  }

  createBacklink(projectId: string, data: Partial<Backlink>) {
    return this.api.post<Backlink>(`/projects/${projectId}/seo/backlinks`, data);
  }

  deleteBacklink(projectId: string, linkId: string) {
    return this.api.delete<void>(`/projects/${projectId}/seo/backlinks/${linkId}`);
  }

  // ── Rank Tracker ──────────────────────────────────────────────────────────

  getKeywordRankLogs(projectId: string) {
    return this.api.get<KeywordRankLog[]>(`/projects/${projectId}/seo/rank-tracker`);
  }

  createKeywordRankLog(projectId: string, data: Partial<KeywordRankLog>) {
    return this.api.post<KeywordRankLog>(`/projects/${projectId}/seo/rank-tracker`, data);
  }
}

