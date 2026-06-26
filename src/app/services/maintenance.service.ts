import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Maintenance } from '../models/project.models';

@Injectable({ providedIn: 'root' })
export class MaintenanceService {
  private api = inject(ApiService);

  getStatus() {
    return this.api.get<Maintenance>('/maintenance');
  }

  updateUptime(uptimeStatus: string) {
    return this.api.patch<Maintenance>('/maintenance/uptime', { uptimeStatus });
  }

  triggerBackup(note?: string) {
    return this.api.post<{ message: string; backupLog: string }>('/maintenance/backup', { note });
  }

  addPerfNote(message: string) {
    return this.api.post<{ message: string; performanceNotes: string }>('/maintenance/perf-note', { message });
  }
}
