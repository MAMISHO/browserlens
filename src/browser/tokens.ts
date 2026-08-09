import type { InjectionToken } from "tsyringe";

export const BROWSER_TOKENS = {
  BrowserService: "IBrowserService" as InjectionToken<import("./application/Services/browser.service.js").IBrowserService>,
  BrowserDriver: "IBrowserDriverService" as InjectionToken<import("./application/Services/IBrowserDriverService.js").IBrowserDriverService>
} as const;
