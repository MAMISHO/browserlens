import { injectable, inject } from "tsyringe";
import sharp from "sharp";
import { BROWSER_TOKENS } from "../../../tokens.js";
import { SHARED_TOKENS } from "../../../../shared/tokens.js";
import type { IBrowserDriverService } from "../IBrowserDriverService.js";
import type { IScreenshotStorage } from "../../../../shared/application/Repositories/IScreenshotStorage.js";
import type { IBrowserService } from "../browser.service.js";
import type { ToolResult } from "../../../../shared/application/models/ToolResult.js";
import type { PageSnapshot, ScreenshotResult } from "../../../domain/models/BrowserModels.js";
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
} from "../../DTOs/browser.dto.js";

@injectable()
export class BrowserServiceImpl implements IBrowserService {
  constructor(
    @inject(BROWSER_TOKENS.BrowserDriver) private readonly driver: IBrowserDriverService,
    @inject(SHARED_TOKENS.ScreenshotStorage) private readonly storage: IScreenshotStorage
  ) {}

  async navigate(input: NavigateArgs): Promise<ToolResult<Record<string, unknown>>> {
    try {
      return await this.driver.navigate(input);
    } catch (error) {
      return this.error(error, "Unknown navigation error.");
    }
  }

  async snapshot(input: SnapshotArgs = {}): Promise<ToolResult<PageSnapshot>> {
    try {
      return await this.driver.snapshot(input);
    } catch (error) {
      return this.error(error, "Unknown snapshot error.");
    }
  }

  async click(input: ClickArgs): Promise<ToolResult<Record<string, unknown>>> {
    try {
      return await this.driver.click(input);
    } catch (error) {
      return this.error(error, "Unknown click error.");
    }
  }

  async fill(input: FillArgs): Promise<ToolResult<Record<string, unknown>>> {
    try {
      return await this.driver.fill(input);
    } catch (error) {
      return this.error(error, "Unknown fill error.");
    }
  }

  async pressKey(input: PressKeyArgs): Promise<ToolResult<Record<string, unknown>>> {
    try {
      return await this.driver.pressKey(input);
    } catch (error) {
      return this.error(error, "Unknown key press error.");
    }
  }

  async waitFor(input: WaitForArgs): Promise<ToolResult<Record<string, unknown>>> {
    try {
      return await this.driver.waitFor(input);
    } catch (error) {
      return this.error(error, "Unknown wait error.");
    }
  }

  async evaluate(input: EvaluateArgs): Promise<ToolResult<Record<string, unknown>>> {
    try {
      return await this.driver.evaluate(input);
    } catch (error) {
      return this.error(error, "Unknown evaluate error.");
    }
  }

  async captureScreenshot(input: ScreenshotArgs): Promise<ToolResult<ScreenshotResult>> {
    try {
      const imagePath = await this.storage.resolveScreenshotPath({ outputPath: input.outputPath });
      await this.driver.screenshot({ ...input, outputPath: imagePath });
      return {
        imagePath,
        ...(await this.inspectScreenshot(imagePath))
      };
    } catch (error) {
      return this.error(error, "Unknown screenshot error.");
    }
  }

  async openInteractive(input: OpenInteractiveArgs = {}): Promise<ToolResult<Record<string, unknown>>> {
    try {
      return await this.driver.openInteractive(input);
    } catch (error) {
      return this.error(error, "Unknown interactive browser error.");
    }
  }

  async useHeadless(input: UseHeadlessArgs = {}): Promise<ToolResult<Record<string, unknown>>> {
    try {
      return await this.driver.useHeadless(input);
    } catch (error) {
      return this.error(error, "Unknown headless browser error.");
    }
  }

  async close(): Promise<void> {
    await this.driver.close();
  }

  private async inspectScreenshot(imagePath: string): Promise<Omit<ScreenshotResult, "imagePath">> {
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    const stats = await image.stats();
    const ranges = stats.channels.slice(0, 3).map((channel) => channel.max - channel.min);
    const blankLike = ranges.every((range) => range < 3);

    return {
      width: metadata.width,
      height: metadata.height,
      blankLike,
      warning: blankLike
        ? "Screenshot appears blank or nearly uniform. For visual comparison, recapture a rendered canvas/content selector or navigate directly to the rendered page before calling compare_images."
        : undefined
    };
  }

  private error(error: unknown, fallback: string): ToolResult<never> {
    return {
      error: true,
      message: error instanceof Error ? error.message : fallback,
      details: error
    };
  }
}
