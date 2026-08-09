export interface Viewport {
  width: number;
  height: number;
}

export type WaitUntil = "load" | "domcontentloaded" | "networkidle";

export type WaitForState = "attached" | "detached" | "visible" | "hidden";

export interface NavigateArgs {
  url: string;
  waitUntil?: WaitUntil;
  viewport?: Viewport;
}

export interface SnapshotArgs {
  selector?: string;
  maxElements?: number;
}

export interface ClickArgs {
  selector: string;
}

export interface FillArgs {
  selector: string;
  value: string;
}

export interface PressKeyArgs {
  key: string;
  selector?: string;
}

export interface WaitForArgs {
  selector?: string;
  timeoutMs?: number;
  state?: WaitForState;
}

export interface EvaluateArgs {
  script: string;
}

export interface ScreenshotArgs {
  url?: string;
  selector?: string;
  fullPage?: boolean;
  outputPath?: string;
  delayMs?: number;
  viewport?: Viewport;
}

export interface OpenInteractiveArgs {
  url?: string;
  userDataDir?: string;
  channel?: string;
  viewport?: Viewport;
}

export interface UseHeadlessArgs {
  viewport?: Viewport;
}
