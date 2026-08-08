export interface PageSnapshot {
  url: string;
  title: string;
  found: boolean;
  text: string;
  elements: ElementInfo[];
}

export interface ElementInfo {
  selector: string;
  tag: string;
  role: string | null;
  ariaLabel: string | null;
  text: string;
  value?: string;
  placeholder: string | null;
  disabled: boolean;
}

export interface ScreenshotResult {
  imagePath: string;
  width?: number;
  height?: number;
  blankLike?: boolean;
  warning?: string;
}
