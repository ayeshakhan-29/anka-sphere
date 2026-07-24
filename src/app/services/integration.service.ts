import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { IntegrationInfo } from '../models/project.models';

export type OAuthProviderSlug = 'google' | 'meta' | 'tiktok';

@Injectable({ providedIn: 'root' })
export class IntegrationService {
  private api = inject(ApiService);

  getIntegrations(projectId?: string) {
    const url = projectId ? `/integrations?projectId=${projectId}` : '/integrations';
    return this.api.get<{ integrations: IntegrationInfo[] }>(url);
  }

  getAuthUrl(provider: OAuthProviderSlug, projectId?: string) {
    const url = projectId ? `/integrations/${provider}/auth-url?projectId=${projectId}` : `/integrations/${provider}/auth-url`;
    return this.api.get<{ url: string }>(url);
  }

  disconnect(provider: OAuthProviderSlug, projectId?: string) {
    const url = projectId ? `/integrations/${provider}/disconnect?projectId=${projectId}` : `/integrations/${provider}/disconnect`;
    return this.api.post<{ disconnected: string[] }>(url, {});
  }
}
