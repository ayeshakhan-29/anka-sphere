import { Injectable, signal, computed } from '@angular/core';
import { Project, PipelineStage, PipelineStatus } from '../models/project.models';

const STAGE_ORDER: PipelineStage[] = ['PROFILING', 'WRITTEN_CONTENT', 'DESIGN', 'DEVELOPMENT', 'MARKETING'];

@Injectable({ providedIn: 'root' })
export class ProjectStateService {
  readonly project = signal<Project | null>(null);
  readonly loading = signal(false);

  readonly pipeline = computed(() => {
    const p = this.project();
    if (!p) return [];
    return STAGE_ORDER.map((stage, i) => {
      const entry = p.pipeline.find(e => e.stage === stage);
      return {
        id: i + 1,
        stage,
        label: STAGE_LABELS[stage],
        dept: STAGE_DEPTS[stage],
        gate: STAGE_GATES[stage],
        status: entryStatus(entry?.status),
        approvedAt: entry?.approvedAt,
        startedAt: entry?.startedAt,
      };
    });
  });

  setProject(project: Project) {
    this.project.set(project);
  }

  clear() {
    this.project.set(null);
  }
}

function entryStatus(status?: PipelineStatus): 'completed' | 'active' | 'locked' {
  if (status === 'APPROVED') return 'completed';
  if (status === 'IN_PROGRESS') return 'active';
  return 'locked';
}

const STAGE_LABELS: Record<PipelineStage, string> = {
  PROFILING:       'Project Profiling',
  WRITTEN_CONTENT: 'Written Content',
  DESIGN:          'Design',
  DEVELOPMENT:     'Development',
  MARKETING:       'Marketing',
};

const STAGE_DEPTS: Record<PipelineStage, string> = {
  PROFILING:       'Product Modelling',
  WRITTEN_CONTENT: 'Product Modelling',
  DESIGN:          'Product Modelling',
  DEVELOPMENT:     'Product Development',
  MARKETING:       'Product Growth',
};

const STAGE_GATES: Record<PipelineStage, 'hard' | 'soft' | 'none'> = {
  PROFILING:       'hard',
  WRITTEN_CONTENT: 'hard',
  DESIGN:          'soft',
  DEVELOPMENT:     'soft',
  MARKETING:       'none',
};
