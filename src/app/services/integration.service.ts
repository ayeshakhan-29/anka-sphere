import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { IntegrationInfo } from '../models/project.models';

export type OAuthProviderSlug = 'google' | 'meta' | 'tiktok';

@Injectable({ providedIn: 'root' })
export class IntegrationService {
  private api = inject(ApiService);

  getIntegrations() {
    return this.api.get<{ integrations: IntegrationInfo[] }>('/integrations');
  }

  getAuthUrl(provider: OAuthProviderSlug) {
    return this.api.get<{ url: string }>(`/integrations/${provider}/auth-url`);
  }

  disconnect(provider: OAuthProviderSlug) {
    return this.api.post<{ disconnected: string[] }>(`/integrations/${provider}/disconnect`, {});
  }
}
