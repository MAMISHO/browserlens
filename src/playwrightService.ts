import { chromium, type Browser, type Page } from "playwright";
import sharp from "sharp";
import { resolveScreenshotPath } from "./screenshotStorage.js";
import type { ToolResult } from "./types.js";

export interface CaptureScreenshotInput {
  url?: string;
  selector?: string;
  full_page?: boolean;
  output_path?: string;
  delay_ms?: number;
  viewport?: {
    width: number;
    height: number;
  };
}

export interface CaptureScreenshotOutput {
  image_path: string;
  width?: number;
  height?: number;
  blank_like?: boolean;
  warning?: string;
}

export interface BrowserNavigateInput {
  url: string;
  wait_until?: "load" | "domcontentloaded" | "networkidle";
  viewport?: {
    width: number;
    height: number;
  };
}

export interface BrowserSnapshotInput {
  selector?: string;
  max_elements?: number;
}

export interface BrowserClickInput {
  selector: string;
}

export interface BrowserFillInput {
  selector: string;
  value: string;
}

export interface BrowserPressKeyInput {
  key: string;
  selector?: string;
}

export interface BrowserWaitForInput {
  selector?: string;
  timeout_ms?: number;
  state?: "attached" | "detached" | "visible" | "hidden";
}

export interface BrowserEvaluateInput {
  script: string;
}

export class PlaywrightService {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async navigate(input: BrowserNavigateInput): Promise<ToolResult<Record<string, unknown>>> {
    try {
      const page = await this.getPage(input.viewport);
      const response = await page.goto(input.url, {
        waitUntil: input.wait_until ?? "networkidle",
        timeout: 30_000
      });

      return {
        url: page.url(),
        title: await page.title(),
        status: response?.status() ?? null
      };
    } catch (error) {
      return this.error(error, "Unknown navigation error.");
    }
  }

  async snapshot(input: BrowserSnapshotInput = {}): Promise<ToolResult<Record<string, unknown>>> {
    try {
      const page = await this.requirePage();
      const data = await page.evaluate(
        ({ selector, maxElements }) => {
          const root = selector ? document.querySelector(selector) : document.body;
          if (!root) {
            return { found: false, elements: [], text: "" };
          }

          const visible = (element: Element) => {
            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return (
              style.visibility !== "hidden" &&
              style.display !== "none" &&
              rect.width > 0 &&
              rect.height > 0
            );
          };

          const cssPath = (element: Element) => {
            if (element.id) return `#${CSS.escape(element.id)}`;
            const parts: string[] = [];
            let current: Element | null = element;
            while (current && current.nodeType === Node.ELEMENT_NODE && parts.length < 5) {
              const tag = current.tagName.toLowerCase();
              const parent: Element | null = current.parentElement;
              if (!parent) {
                parts.unshift(tag);
                break;
              }
              const siblings = Array.from(parent.children).filter(
                (child: Element) => child.tagName === current!.tagName
              );
              const index = siblings.indexOf(current) + 1;
              parts.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${index})` : tag);
              current = parent;
            }
            return parts.join(" > ");
          };

          const elements = Array.from(
            root.querySelectorAll(
              "a,button,input,textarea,select,[role],[aria-label],h1,h2,h3,h4,h5,h6,label,[contenteditable='true']"
            )
          )
            .filter(visible)
            .slice(0, maxElements)
            .map((element) => {
              const htmlElement = element as HTMLElement;
              const input = element as HTMLInputElement;
              return {
                selector: cssPath(element),
                tag: element.tagName.toLowerCase(),
                role: element.getAttribute("role"),
                aria_label: element.getAttribute("aria-label"),
                text: (htmlElement.innerText || element.textContent || "").trim().slice(0, 300),
                value: "value" in input ? input.value : undefined,
                placeholder: input.getAttribute?.("placeholder") ?? null,
                disabled: "disabled" in input ? Boolean(input.disabled) : false
              };
            });

          return {
            found: true,
            text: (root as HTMLElement).innerText?.trim().slice(0, 6000) ?? "",
            elements
          };
        },
        { selector: input.selector, maxElements: input.max_elements ?? 120 }
      );

      return {
        url: page.url(),
        title: await page.title(),
        ...data
      };
    } catch (error) {
      return this.error(error, "Unknown snapshot error.");
    }
  }

  async click(input: BrowserClickInput): Promise<ToolResult<Record<string, unknown>>> {
    try {
      const page = await this.requirePage();
      await page.locator(input.selector).first().click({ timeout: 10_000 });
      return { clicked: true, url: page.url() };
    } catch (error) {
      return this.error(error, "Unknown click error.");
    }
  }

  async fill(input: BrowserFillInput): Promise<ToolResult<Record<string, unknown>>> {
    try {
      const page = await this.requirePage();
      await page.locator(input.selector).first().fill(input.value, { timeout: 10_000 });
      return { filled: true, selector: input.selector };
    } catch (error) {
      return this.error(error, "Unknown fill error.");
    }
  }

  async pressKey(input: BrowserPressKeyInput): Promise<ToolResult<Record<string, unknown>>> {
    try {
      const page = await this.requirePage();
      if (input.selector) {
        await page.locator(input.selector).first().press(input.key, { timeout: 10_000 });
      } else {
        await page.keyboard.press(input.key);
      }
      return { pressed: true, key: input.key, url: page.url() };
    } catch (error) {
      return this.error(error, "Unknown key press error.");
    }
  }

  async waitFor(input: BrowserWaitForInput): Promise<ToolResult<Record<string, unknown>>> {
    try {
      const page = await this.requirePage();
      const timeout = input.timeout_ms ?? 10_000;
      if (input.selector) {
        await page.locator(input.selector).first().waitFor({
          state: input.state ?? "visible",
          timeout
        });
      } else {
        await page.waitForTimeout(timeout);
      }
      return { waited: true, url: page.url() };
    } catch (error) {
      return this.error(error, "Unknown wait error.");
    }
  }

  async evaluate(input: BrowserEvaluateInput): Promise<ToolResult<Record<string, unknown>>> {
    try {
      const page = await this.requirePage();
      const value = await page.evaluate((script) => {
        const fn = new Function(`return (${script});`);
        const result = fn();
        return result instanceof Promise ? result : Promise.resolve(result);
      }, input.script);
      return { value };
    } catch (error) {
      return this.error(error, "Unknown evaluate error.");
    }
  }

  async captureScreenshot(input: CaptureScreenshotInput): Promise<ToolResult<CaptureScreenshotOutput>> {
    try {
      const page = await this.getPage(input.viewport);

      if (input.url) {
        await page.goto(input.url, { waitUntil: "networkidle", timeout: 30_000 });
      }

      if (input.delay_ms) {
        await page.waitForTimeout(input.delay_ms);
      }

      const imagePath = await this.resolveOutputPath(input.output_path);
      if (input.selector) {
        const locator = page.locator(input.selector).first();
        await locator.waitFor({ state: "visible", timeout: 10_000 });
        await locator.screenshot({ path: imagePath });
      } else {
        await page.screenshot({ path: imagePath, fullPage: input.full_page ?? true });
      }

      return {
        image_path: imagePath,
        ...(await this.inspectScreenshot(imagePath))
      };
    } catch (error) {
      return {
        error: true,
        message: error instanceof Error ? error.message : "Unknown screenshot error.",
        details: error
      };
    }
  }

  async close(): Promise<void> {
    await this.page?.close().catch(() => undefined);
    this.page = null;
    await this.browser?.close();
    this.browser = null;
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
    }
    return this.browser;
  }

  private async getPage(viewport?: { width: number; height: number }): Promise<Page> {
    if (!this.page || this.page.isClosed()) {
      const browser = await this.getBrowser();
      this.page = await browser.newPage({
        viewport: viewport ?? { width: 1440, height: 1000 }
      });
    } else if (viewport) {
      await this.page.setViewportSize(viewport);
    }
    return this.page;
  }

  private async requirePage(): Promise<Page> {
    if (!this.page || this.page.isClosed()) {
      throw new Error("No active browser page. Call browser_navigate first.");
    }
    return this.page;
  }

  private async resolveOutputPath(outputPath?: string): Promise<string> {
    return resolveScreenshotPath({ outputPath });
  }

  private async inspectScreenshot(imagePath: string): Promise<Omit<CaptureScreenshotOutput, "image_path">> {
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    const stats = await image.stats();
    const ranges = stats.channels.slice(0, 3).map((channel) => channel.max - channel.min);
    const blankLike = ranges.every((range) => range < 3);

    return {
      width: metadata.width,
      height: metadata.height,
      blank_like: blankLike,
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
