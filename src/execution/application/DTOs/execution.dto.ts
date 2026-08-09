export interface ExecuteCodeInput {
  command: string;
  args?: string[];
  cwd?: string;
  timeoutMs?: number;
  env?: Record<string, string>;
  shell?: boolean;
}
