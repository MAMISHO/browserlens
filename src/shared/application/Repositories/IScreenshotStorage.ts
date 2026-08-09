export interface ScreenshotStorageOptions {
  cwd?: string;
  now?: Date;
  outputPath?: string;
}

export interface IScreenshotStorage {
  resolveScreenshotPath(options?: ScreenshotStorageOptions): Promise<string>;
  temporaryScreenshotDirectory(projectName: string): string;
}
