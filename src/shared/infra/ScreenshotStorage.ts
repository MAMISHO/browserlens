import { mkdir } from "node:fs/promises";
import { homedir, platform, tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import type { IScreenshotStorage, ScreenshotStorageOptions } from "../application/Repositories/IScreenshotStorage.js";

const APP_DIRECTORY_NAME = "browserlens";

export class ScreenshotStorage implements IScreenshotStorage {
  async resolveScreenshotPath(options: ScreenshotStorageOptions = {}): Promise<string> {
    const cwd = options.cwd ?? process.cwd();
    const target = options.outputPath
      ? resolveUserOutputPath(options.outputPath, cwd)
      : join(defaultScreenshotDirectory(cwd), createScreenshotFilename(options.now ?? new Date()));

    await mkdir(dirname(target), { recursive: true });
    return target;
  }

  temporaryScreenshotDirectory(projectName: string): string {
    return join(tmpdir(), APP_DIRECTORY_NAME, "screenshots", sanitizePathSegment(projectName));
  }
}

function resolveUserOutputPath(outputPath: string, cwd: string): string {
  return isAbsolute(outputPath) ? outputPath : resolve(cwd, outputPath);
}

function defaultScreenshotDirectory(cwd: string): string {
  const override = process.env.BROWSERLENS_SCREENSHOT_DIR?.trim();
  const projectName = sanitizePathSegment(basename(resolve(cwd)) || "default-project");

  if (override) {
    return join(resolve(override), projectName);
  }

  return join(userWritableDataDirectory(), APP_DIRECTORY_NAME, "screenshots", projectName);
}

function userWritableDataDirectory(): string {
  const currentPlatform = platform();

  if (currentPlatform === "darwin") {
    return join(homedir(), "Library", "Application Support");
  }

  if (currentPlatform === "win32") {
    return process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local");
  }

  return process.env.XDG_DATA_HOME || join(homedir(), ".local", "share");
}

function createScreenshotFilename(date: Date): string {
  const timestamp = date.toISOString().replace(/[:.]/g, "-");
  return `screenshot-${timestamp}.jpg`;
}

function sanitizePathSegment(value: string): string {
  const sanitized = value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return sanitized || `project-${Date.now()}`;
}
