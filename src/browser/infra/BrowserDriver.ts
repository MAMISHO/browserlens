import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import type { IBrowserDriverService } from "../application/Services/IBrowserDriverService.js";
import type { PageSnapshot } from "../domain/models/BrowserModels.js";
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
} from "../application/DTOs/browser.dto.js";

export class BrowserDriver implements IBrowserDriverService {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private mode: "headless" | "interactive" = "headless";

  async navigate(input: NavigateArgs): Promise<Record<string, unknown>> {
    const page = await this.getPage(input.viewport);
    const response = await page.goto(input.url, {
      waitUntil: input.waitUntil ?? "networkidle",
      timeout: 30_000
    });

    return {
      url: page.url(),
      title: await page.title(),
      status: response?.status() ?? null
    };
  }

  async snapshot(input: SnapshotArgs = {}): Promise<PageSnapshot> {
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
              ariaLabel: element.getAttribute("aria-label"),
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
      { selector: input.selector, maxElements: input.maxElements ?? 120 }
    );

    return {
      url: page.url(),
      title: await page.title(),
      ...data
    };
  }

  async click(input: ClickArgs): Promise<Record<string, unknown>> {
    const page = await this.requirePage();
    await page.locator(input.selector).first().click({ timeout: 10_000 });
    return { clicked: true, url: page.url() };
  }

  async fill(input: FillArgs): Promise<Record<string, unknown>> {
    const page = await this.requirePage();
    await page.locator(input.selector).first().fill(input.value, { timeout: 10_000 });
    return { filled: true, selector: input.selector };
  }

  async pressKey(input: PressKeyArgs): Promise<Record<string, unknown>> {
    const page = await this.requirePage();
    if (input.selector) {
      await page.locator(input.selector).first().press(input.key, { timeout: 10_000 });
    } else {
      await page.keyboard.press(input.key);
    }
    return { pressed: true, key: input.key, url: page.url() };
  }

  async waitFor(input: WaitForArgs): Promise<Record<string, unknown>> {
    const page = await this.requirePage();
    const timeout = input.timeoutMs ?? 10_000;
    if (input.selector) {
      await page.locator(input.selector).first().waitFor({
        state: input.state ?? "visible",
        timeout
      });
    } else {
      await page.waitForTimeout(timeout);
    }
    return { waited: true, url: page.url() };
  }

  async evaluate(input: EvaluateArgs): Promise<Record<string, unknown>> {
    const page = await this.requirePage();
    const value = await page.evaluate((script) => {
      const fn = new Function(`return (${script});`);
      const result = fn();
      return result instanceof Promise ? result : Promise.resolve(result);
    }, input.script);
    return { value };
  }

  async screenshot(input: ScreenshotArgs): Promise<void> {
    const page = await this.getPage(input.viewport);

    if (input.url) {
      await page.goto(input.url, { waitUntil: "networkidle", timeout: 30_000 });
    }

    if (input.delayMs) {
      await page.waitForTimeout(input.delayMs);
    }

    if (input.selector) {
      const locator = page.locator(input.selector).first();
      await locator.waitFor({ state: "visible", timeout: 10_000 });
      await locator.screenshot({ path: input.outputPath! });
    } else {
      await page.screenshot({ path: input.outputPath!, fullPage: input.fullPage ?? true });
    }
  }

  async openInteractive(input: OpenInteractiveArgs = {}): Promise<Record<string, unknown>> {
    await this.close();
    this.mode = "interactive";

    const viewport = input.viewport ?? { width: 1440, height: 1000 };
    const userDataDir = input.userDataDir ?? process.env.BROWSERLENS_USER_DATA_DIR;
    const channel = input.channel ?? process.env.BROWSERLENS_CHANNEL;

    if (userDataDir) {
      this.context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        channel,
        viewport
      });
    } else {
      this.browser = await chromium.launch({ headless: false, channel });
      this.context = await this.browser.newContext({ viewport });
    }

    this.page = this.context.pages()[0] ?? (await this.context.newPage());
    if (input.url) {
      await this.page.goto(input.url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    }

    return {
      interactive: true,
      mode: this.mode,
      url: this.page.url(),
      title: await this.page.title(),
      persistent_profile: Boolean(userDataDir),
      user_data_dir: userDataDir ?? null,
      channel: channel ?? null,
      message:
        "Interactive browser opened. The user can log in or complete manual actions, then the agent can continue with browser_wait_for, browser_snapshot, capture_screenshot, analyze_image, compare_images, extract_text, or extract_markdown."
    };
  }

  async useHeadless(input: UseHeadlessArgs = {}): Promise<Record<string, unknown>> {
    await this.close();
    this.mode = "headless";
    const page = await this.getPage(input.viewport);
    return {
      interactive: false,
      mode: this.mode,
      url: page.url(),
      message: "Headless browser session started."
    };
  }

  async close(): Promise<void> {
    await this.page?.close().catch(() => undefined);
    this.page = null;
    await this.context?.close().catch(() => undefined);
    this.context = null;
    await this.browser?.close().catch(() => undefined);
    this.browser = null;
  }

  async getPage(viewport?: Viewport): Promise<Page> {
    if (!this.page || this.page.isClosed()) {
      const context = await this.getBrowser();
      this.page = context.pages()[0] ?? (await context.newPage());
      if (viewport) {
        await this.page.setViewportSize(viewport);
      }
    } else if (viewport) {
      await this.page.setViewportSize(viewport);
    }
    return this.page;
  }

  private async getBrowser(): Promise<BrowserContext> {
    if (!this.context) {
      const headless = process.env.BROWSERLENS_HEADLESS?.toLowerCase() !== "false";
      const channel = process.env.BROWSERLENS_CHANNEL;
      const userDataDir = process.env.BROWSERLENS_USER_DATA_DIR;
      this.mode = headless ? "headless" : "interactive";

      if (userDataDir) {
        this.context = await chromium.launchPersistentContext(userDataDir, {
          headless,
          channel,
          viewport: { width: 1440, height: 1000 }
        });
      } else {
        this.browser = await chromium.launch({ headless, channel });
        this.context = await this.browser.newContext({
          viewport: { width: 1440, height: 1000 }
        });
      }
    }
    return this.context;
  }

  private async requirePage(): Promise<Page> {
    if (!this.page || this.page.isClosed()) {
      throw new Error("No active browser page. Call browser_navigate first.");
    }
    return this.page;
  }
}
