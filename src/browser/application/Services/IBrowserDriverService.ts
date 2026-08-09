import type { Page } from "playwright";
import type { PageSnapshot } from "../../domain/models/BrowserModels.js";
import type {
  ClickArgs,
  EvaluateArgs,
  FillArgs,
  NavigateArgs,
  OpenInteractiveArgs,
  PressKeyArgs,
  ScreenshotArgs,
  SnapshotArgs,
  UseHeadlessArgs,
  Viewport,
  WaitForArgs
} from "../DTOs/browser.dto.js";

export interface IBrowserDriverService {
  navigate(input: NavigateArgs): Promise<Record<string, unknown>>;
  snapshot(input?: SnapshotArgs): Promise<PageSnapshot>;
  click(input: ClickArgs): Promise<Record<string, unknown>>;
  fill(input: FillArgs): Promise<Record<string, unknown>>;
  pressKey(input: PressKeyArgs): Promise<Record<string, unknown>>;
  waitFor(input: WaitForArgs): Promise<Record<string, unknown>>;
  evaluate(input: EvaluateArgs): Promise<Record<string, unknown>>;
  screenshot(input: ScreenshotArgs): Promise<void>;
  openInteractive(input?: OpenInteractiveArgs): Promise<Record<string, unknown>>;
  useHeadless(input?: UseHeadlessArgs): Promise<Record<string, unknown>>;
  close(): Promise<void>;
  getPage(viewport?: Viewport): Promise<Page>;
}
