import type { Mapper } from "@automapper/core";
import type { ToolResult } from "../../shared/application/models/ToolResult.js";
import type { PageSnapshot, ScreenshotResult } from "../../browser/domain/models/BrowserModels.js";
import type { BrowserSnapshotWireResult, ScreenshotWireResult } from "./wireMetadata.js";
import { isStructuredError } from "./wireMapper.js";

export function mapScreenshotResult(mapper: Mapper, result: ToolResult<ScreenshotResult>): Record<string, unknown> {
  if (isStructuredError(result)) return result as unknown as Record<string, unknown>;
  return mapper.map(result, "ScreenshotResult", "ScreenshotWireResult") as ScreenshotWireResult;
}

export function mapSnapshotResult(mapper: Mapper, result: ToolResult<PageSnapshot>): Record<string, unknown> {
  if (isStructuredError(result)) return result as unknown as Record<string, unknown>;
  return mapper.map(result, "PageSnapshot", "BrowserSnapshotWireResult") as BrowserSnapshotWireResult;
}

export function mapNavigateResult(mapper: Mapper, result: ToolResult<Record<string, unknown>>): Record<string, unknown> {
  void mapper;
  return result as unknown as Record<string, unknown>;
}

export function mapClickResult(mapper: Mapper, result: ToolResult<Record<string, unknown>>): Record<string, unknown> {
  void mapper;
  return result as unknown as Record<string, unknown>;
}

export function mapFillResult(mapper: Mapper, result: ToolResult<Record<string, unknown>>): Record<string, unknown> {
  void mapper;
  return result as unknown as Record<string, unknown>;
}

export function mapPressKeyResult(mapper: Mapper, result: ToolResult<Record<string, unknown>>): Record<string, unknown> {
  void mapper;
  return result as unknown as Record<string, unknown>;
}

export function mapWaitForResult(mapper: Mapper, result: ToolResult<Record<string, unknown>>): Record<string, unknown> {
  void mapper;
  return result as unknown as Record<string, unknown>;
}

export function mapEvaluateResult(mapper: Mapper, result: ToolResult<Record<string, unknown>>): Record<string, unknown> {
  void mapper;
  return result as unknown as Record<string, unknown>;
}

export function mapOpenInteractiveResult(mapper: Mapper, result: ToolResult<Record<string, unknown>>): Record<string, unknown> {
  void mapper;
  return result as unknown as Record<string, unknown>;
}

export function mapUseHeadlessResult(mapper: Mapper, result: ToolResult<Record<string, unknown>>): Record<string, unknown> {
  void mapper;
  return result as unknown as Record<string, unknown>;
}
