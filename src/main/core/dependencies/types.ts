import type { DependencyCategory, DependencyId, DependencyStatus } from '@shared/dependencies';

export interface ProbeResult {
  command: string;
  path: string | null;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
}

export interface DependencyDescriptor {
  id: DependencyId;
  name: string;
  category: DependencyCategory;
  commands: string[];
  versionArgs?: string[];
  docUrl?: string;
  installHint?: string;
  installCommand?: string;
  resolveStatus?: (result: ProbeResult) => DependencyStatus;
}
