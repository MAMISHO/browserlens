import type { ToolResult } from "../../../shared/application/models/ToolResult.js";
import type { PageSnapshot, ScreenshotResult } from "../../domain/models/BrowserModels.js";
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
  WaitForArgs
} from "../DTOs/browser.dto.js";

export interface IBrowserService {
  navigate(input: NavigateArgs): Promise<ToolResult<Record<string, unknown>>>;
  snapshot(input?: SnapshotArgs): Promise<ToolResult<PageSnapshot>>;
  click(input: ClickArgs): Promise<ToolResult<Record<string, unknown>>>;
  fill(input: FillArgs): Promise<ToolResult<Record<string, unknown>>>;
  pressKey(input: PressKeyArgs): Promise<ToolResult<Record<string, unknown>>>;
  waitFor(input: WaitForArgs): Promise<ToolResult<Record<string, unknown>>>;
  evaluate(input: EvaluateArgs): Promise<ToolResult<Record<string, unknown>>>;
  captureScreenshot(input: ScreenshotArgs): Promise<ToolResult<ScreenshotResult>>;
  openInteractive(input?: OpenInteractiveArgs): Promise<ToolResult<Record<string, unknown>>>;
  useHeadless(input?: UseHeadlessArgs): Promise<ToolResult<Record<string, unknown>>>;
  close(): Promise<void>;
}
