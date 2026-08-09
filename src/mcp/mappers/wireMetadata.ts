import type { Mapper } from "@automapper/core";
import { PojosMetadataMap } from "@automapper/pojos";
import type { Viewport, NavigateArgs, SnapshotArgs, ClickArgs, FillArgs, PressKeyArgs, WaitForArgs, EvaluateArgs, ScreenshotArgs, OpenInteractiveArgs, UseHeadlessArgs } from "../../browser/application/DTOs/browser.dto.js";
import type { PageSnapshot, ElementInfo, ScreenshotResult } from "../../browser/domain/models/BrowserModels.js";
import type { AnalyzeImageInput, CompareImagesInput } from "../../vision/application/DTOs/vision.dto.js";
import type { VisionIssue, VisionAnalysis } from "../../vision/domain/models/VisionModels.js";
import type { ExtractTextInput, ExtractMarkdownInput } from "../../ocr/application/DTOs/ocr.dto.js";
import type { TextBlock, ExtractedText, ExtractedMarkdown } from "../../ocr/domain/models/OcrModels.js";
import type { ExecuteCodeInput } from "../../execution/application/DTOs/execution.dto.js";
import type { CommandResult } from "../../execution/domain/models/CommandResult.js";

export interface ViewportWire {
  width: number;
  height: number;
}

export interface ScreenshotWireArgs {
  url?: string;
  selector?: string;
  full_page?: boolean;
  output_path?: string;
  delay_ms?: number;
  viewport?: ViewportWire;
}

export interface BrowserNavigateWireArgs {
  url: string;
  wait_until?: string;
  viewport?: ViewportWire;
}

export interface BrowserSnapshotWireArgs {
  selector?: string;
  max_elements?: number;
}

export interface BrowserClickWireArgs {
  selector: string;
}

export interface BrowserFillWireArgs {
  selector: string;
  value: string;
}

export interface BrowserPressKeyWireArgs {
  key: string;
  selector?: string;
}

export interface BrowserWaitForWireArgs {
  selector?: string;
  timeout_ms?: number;
  state?: string;
}

export interface BrowserEvaluateWireArgs {
  script: string;
}

export interface BrowserOpenInteractiveWireArgs {
  url?: string;
  user_data_dir?: string;
  channel?: string;
  viewport?: ViewportWire;
}

export interface BrowserUseHeadlessWireArgs {
  viewport?: ViewportWire;
}

export interface AnalyzeImageWireArgs {
  goal: string;
  expectations?: string[];
  image_path: string;
}

export interface CompareImagesWireArgs {
  goal: string;
  expectations?: string[];
  reference_image_path: string;
  candidate_image_path: string;
}

export interface ExtractTextWireArgs {
  image_path: string;
}

export interface ExtractMarkdownWireArgs {
  image_path: string;
  instructions?: string;
}

export interface ExecuteCodeWireArgs {
  command: string;
  args?: string[];
  cwd?: string;
  timeout_ms?: number;
  env?: Record<string, string>;
  shell?: boolean;
}

export type ScreenshotWireResult = {
  image_path: string;
  width?: number;
  height?: number;
  blank_like?: boolean;
  warning?: string;
}

export type CommandWireResult = {
  exit_code: number | null;
  stdout: string;
  stderr: string;
  timed_out: boolean;
}

export interface IssueWire {
  type: string;
  description: string;
  severity: string;
}

export type VisionWireResult = {
  matches_expectations: boolean;
  confidence: number;
  issues: IssueWire[];
}

export interface TextBlockWire {
  text: string;
  role?: string;
}

export type ExtractTextWireResult = {
  text: string;
  blocks: TextBlockWire[];
}

export type ExtractMarkdownWireResult = {
  markdown: string;
}

export interface ElementInfoWire {
  selector: string;
  tag: string;
  role: string | null;
  aria_label: string | null;
  text: string;
  value?: string;
  placeholder: string | null;
  disabled: boolean;
}

export type BrowserSnapshotWireResult = {
  url: string;
  title: string;
  found: boolean;
  text: string;
  elements: ElementInfoWire[];
}

export function registerWireMetadata(mapper: Mapper): void {
  void mapper;

  PojosMetadataMap.create<ViewportWire>("ViewportWire", {
    width: Number,
    height: Number
  });
  PojosMetadataMap.create<Viewport>("Viewport", {
    width: Number,
    height: Number
  });
  PojosMetadataMap.create<IssueWire>("IssueWire", {
    type: String,
    description: String,
    severity: String
  });
  PojosMetadataMap.create<VisionIssue>("VisionIssue", {
    type: String,
    description: String,
    severity: String
  });
  PojosMetadataMap.create<TextBlockWire>("TextBlockWire", {
    text: String,
    role: String
  });
  PojosMetadataMap.create<TextBlock>("TextBlock", {
    text: String,
    role: String
  });
  PojosMetadataMap.create<ElementInfoWire>("ElementInfoWire", {
    selector: String,
    tag: String,
    role: String,
    aria_label: String,
    text: String,
    value: String,
    placeholder: String,
    disabled: Boolean
  });
  PojosMetadataMap.create<ElementInfo>("ElementInfo", {
    selector: String,
    tag: String,
    role: String,
    ariaLabel: String,
    text: String,
    value: String,
    placeholder: String,
    disabled: Boolean
  });

  PojosMetadataMap.create<ScreenshotWireArgs>("ScreenshotWireArgs", {
    url: String,
    selector: String,
    full_page: Boolean,
    output_path: String,
    delay_ms: Number,
    viewport: "ViewportWire"
  });
  PojosMetadataMap.create<ScreenshotArgs>("ScreenshotArgs", {
    url: String,
    selector: String,
    fullPage: Boolean,
    outputPath: String,
    delayMs: Number,
    viewport: "Viewport"
  });

  PojosMetadataMap.create<BrowserNavigateWireArgs>("BrowserNavigateWireArgs", {
    url: String,
    wait_until: String,
    viewport: "ViewportWire"
  });
  PojosMetadataMap.create<NavigateArgs>("NavigateArgs", {
    url: String,
    waitUntil: String,
    viewport: "Viewport"
  });

  PojosMetadataMap.create<BrowserSnapshotWireArgs>("BrowserSnapshotWireArgs", {
    selector: String,
    max_elements: Number
  });
  PojosMetadataMap.create<SnapshotArgs>("SnapshotArgs", {
    selector: String,
    maxElements: Number
  });

  PojosMetadataMap.create<BrowserClickWireArgs>("BrowserClickWireArgs", {
    selector: String
  });
  PojosMetadataMap.create<ClickArgs>("ClickArgs", {
    selector: String
  });

  PojosMetadataMap.create<BrowserFillWireArgs>("BrowserFillWireArgs", {
    selector: String,
    value: String
  });
  PojosMetadataMap.create<FillArgs>("FillArgs", {
    selector: String,
    value: String
  });

  PojosMetadataMap.create<BrowserPressKeyWireArgs>("BrowserPressKeyWireArgs", {
    key: String,
    selector: String
  });
  PojosMetadataMap.create<PressKeyArgs>("PressKeyArgs", {
    key: String,
    selector: String
  });

  PojosMetadataMap.create<BrowserWaitForWireArgs>("BrowserWaitForWireArgs", {
    selector: String,
    timeout_ms: Number,
    state: String
  });
  PojosMetadataMap.create<WaitForArgs>("WaitForArgs", {
    selector: String,
    timeoutMs: Number,
    state: String
  });

  PojosMetadataMap.create<BrowserEvaluateWireArgs>("BrowserEvaluateWireArgs", {
    script: String
  });
  PojosMetadataMap.create<EvaluateArgs>("EvaluateArgs", {
    script: String
  });

  PojosMetadataMap.create<BrowserOpenInteractiveWireArgs>("BrowserOpenInteractiveWireArgs", {
    url: String,
    user_data_dir: String,
    channel: String,
    viewport: "ViewportWire"
  });
  PojosMetadataMap.create<OpenInteractiveArgs>("OpenInteractiveArgs", {
    url: String,
    userDataDir: String,
    channel: String,
    viewport: "Viewport"
  });

  PojosMetadataMap.create<BrowserUseHeadlessWireArgs>("BrowserUseHeadlessWireArgs", {
    viewport: "ViewportWire"
  });
  PojosMetadataMap.create<UseHeadlessArgs>("UseHeadlessArgs", {
    viewport: "Viewport"
  });

  PojosMetadataMap.create<AnalyzeImageWireArgs>("AnalyzeImageWireArgs", {
    goal: String,
    expectations: [String],
    image_path: String
  });
  PojosMetadataMap.create<AnalyzeImageInput>("AnalyzeImageInput", {
    goal: String,
    expectations: [String],
    imagePath: String
  });

  PojosMetadataMap.create<CompareImagesWireArgs>("CompareImagesWireArgs", {
    goal: String,
    expectations: [String],
    reference_image_path: String,
    candidate_image_path: String
  });
  PojosMetadataMap.create<CompareImagesInput>("CompareImagesInput", {
    goal: String,
    expectations: [String],
    referenceImagePath: String,
    candidateImagePath: String
  });

  PojosMetadataMap.create<ExtractTextWireArgs>("ExtractTextWireArgs", {
    image_path: String
  });
  PojosMetadataMap.create<ExtractTextInput>("ExtractTextInput", {
    imagePath: String
  });

  PojosMetadataMap.create<ExtractMarkdownWireArgs>("ExtractMarkdownWireArgs", {
    image_path: String,
    instructions: String
  });
  PojosMetadataMap.create<ExtractMarkdownInput>("ExtractMarkdownInput", {
    imagePath: String,
    instructions: String
  });

  PojosMetadataMap.create<ExecuteCodeWireArgs>("ExecuteCodeWireArgs", {
    command: String,
    args: [String],
    cwd: String,
    timeout_ms: Number,
    env: Object,
    shell: Boolean
  });
  PojosMetadataMap.create<ExecuteCodeInput>("ExecuteCodeInput", {
    command: String,
    args: [String],
    cwd: String,
    timeoutMs: Number,
    env: Object,
    shell: Boolean
  });

  PojosMetadataMap.create<ScreenshotWireResult>("ScreenshotWireResult", {
    image_path: String,
    width: Number,
    height: Number,
    blank_like: Boolean,
    warning: String
  });
  PojosMetadataMap.create<ScreenshotResult>("ScreenshotResult", {
    imagePath: String,
    width: Number,
    height: Number,
    blankLike: Boolean,
    warning: String
  });

  PojosMetadataMap.create<CommandWireResult>("CommandWireResult", {
    exit_code: Number,
    stdout: String,
    stderr: String,
    timed_out: Boolean
  });
  PojosMetadataMap.create<CommandResult>("CommandResult", {
    exitCode: Number,
    stdout: String,
    stderr: String,
    timedOut: Boolean
  });

  PojosMetadataMap.create<VisionWireResult>("VisionWireResult", {
    matches_expectations: Boolean,
    confidence: Number,
    issues: ["IssueWire"]
  });
  PojosMetadataMap.create<VisionAnalysis>("VisionAnalysis", {
    matchesExpectations: Boolean,
    confidence: Number,
    issues: ["VisionIssue"]
  });

  PojosMetadataMap.create<ExtractTextWireResult>("ExtractTextWireResult", {
    text: String,
    blocks: ["TextBlockWire"]
  });
  PojosMetadataMap.create<ExtractedText>("ExtractedText", {
    text: String,
    blocks: ["TextBlock"]
  });

  PojosMetadataMap.create<ExtractMarkdownWireResult>("ExtractMarkdownWireResult", {
    markdown: String
  });
  PojosMetadataMap.create<ExtractedMarkdown>("ExtractedMarkdown", {
    markdown: String
  });

  PojosMetadataMap.create<BrowserSnapshotWireResult>("BrowserSnapshotWireResult", {
    url: String,
    title: String,
    found: Boolean,
    text: String,
    elements: ["ElementInfoWire"]
  });
  PojosMetadataMap.create<PageSnapshot>("PageSnapshot", {
    url: String,
    title: String,
    found: Boolean,
    text: String,
    elements: ["ElementInfo"]
  });
}
