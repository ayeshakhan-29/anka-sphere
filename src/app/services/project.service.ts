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
}
