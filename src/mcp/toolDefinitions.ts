export const TOOL_DEFINITIONS: Array<{ name: string; description: string; inputSchema: Record<string, unknown> }> = [
  {
    name: "execute_code",
    description: "Execute a local command or script and return stdout/stderr. Supports Playwright scripts through the local Node runtime.",
    inputSchema: {
      type: "object",
      properties: {
        command: { type: "string" },
        args: { type: "array", items: { type: "string" } },
        cwd: { type: "string" },
        timeout_ms: { type: "number" },
        env: { type: "object", additionalProperties: { type: "string" } },
        shell: { type: "boolean" }
      },
      required: ["command"]
    }
  },
  {
    name: "browser_navigate",
    description: "Navigate the persistent Playwright page to a URL. Returns text/JSON only, never image content.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string" },
        wait_until: { type: "string", enum: ["load", "domcontentloaded", "networkidle"] },
        viewport: {
          type: "object",
          properties: {
            width: { type: "number" },
            height: { type: "number" }
          },
          required: ["width", "height"]
        }
      },
      required: ["url"]
    }
  },
  {
    name: "browser_snapshot",
    description: "Read the active page as structured text/DOM metadata for non-vision models. Use this for navigation, selectors, forms, and page state. Do not use it as a substitute for visual comparison because DOM/text can match while rendered layout differs.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string" },
        max_elements: { type: "number" }
      }
    }
  },
  {
    name: "browser_click",
    description: "Click a selector on the active Playwright page. Returns JSON only.",
    inputSchema: {
      type: "object",
      properties: { selector: { type: "string" } },
      required: ["selector"]
    }
  },
  {
    name: "browser_fill",
    description: "Fill an input-like selector on the active Playwright page. Returns JSON only.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string" },
        value: { type: "string" }
      },
      required: ["selector", "value"]
    }
  },
  {
    name: "browser_press_key",
    description: "Press a keyboard key on the active page or on a selector. Returns JSON only.",
    inputSchema: {
      type: "object",
      properties: {
        key: { type: "string" },
        selector: { type: "string" }
      },
      required: ["key"]
    }
  },
  {
    name: "browser_wait_for",
    description: "Wait for a selector state, or wait timeout_ms when no selector is supplied. Returns JSON only.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string" },
        timeout_ms: { type: "number" },
        state: { type: "string", enum: ["attached", "detached", "visible", "hidden"] }
      }
    }
  },
  {
    name: "browser_evaluate",
    description: "Evaluate JavaScript on the active page and return JSON-serializable data. Intended for bounded DOM inspection.",
    inputSchema: {
      type: "object",
      properties: { script: { type: "string" } },
      required: ["script"]
    }
  },
  {
    name: "browser_open_interactive",
    description: "Switch to a visible Playwright browser so the user can log in, complete 2FA/SSO, or perform manual actions. This closes the current browser session and opens a headed session. Use user_data_dir for a persistent profile.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string" },
        user_data_dir: {
          type: "string",
          description: "Optional persistent Playwright user data directory. Also configurable with BROWSERLENS_USER_DATA_DIR."
        },
        channel: {
          type: "string",
          description: "Optional browser channel, for example chrome. Also configurable with BROWSERLENS_CHANNEL."
        },
        viewport: {
          type: "object",
          properties: {
            width: { type: "number" },
            height: { type: "number" }
          },
          required: ["width", "height"]
        }
      }
    }
  },
  {
    name: "browser_use_headless",
    description: "Close the current browser session and start a fresh headless Playwright session. Use after interactive login/testing when a clean automated browser is desired.",
    inputSchema: {
      type: "object",
      properties: {
        viewport: {
          type: "object",
          properties: {
            width: { type: "number" },
            height: { type: "number" }
          },
          required: ["width", "height"]
        }
      }
    }
  },
  {
    name: "capture_screenshot",
    description: "Capture a screenshot with Playwright from the active page or a URL/selector and store it locally. Returns only JSON metadata such as image_path, dimensions, and blank_like; never image bytes. Use delay_ms when a canvas, iframe, animation, or client-rendered content needs extra time after navigation or selector visibility before capture. If blank_like is true, the capture is probably not useful for visual comparison and should be recaptured from the rendered canvas/content, often with delay_ms. For visual understanding, pass image_path to analyze_image, compare_images, or extract_text.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string" },
        selector: { type: "string" },
        full_page: { type: "boolean" },
        output_path: { type: "string" },
        delay_ms: {
          type: "number",
          description: "Milliseconds to wait immediately before taking the screenshot. Use this for delayed canvas/iframe/client rendering, for example 2000-5000."
        },
        viewport: {
          type: "object",
          properties: {
            width: { type: "number" },
            height: { type: "number" }
          },
          required: ["width", "height"]
        }
      }
    }
  },
  {
    name: "analyze_image",
    description: "Interpret one screenshot using the configured multimodal Ollama model and return strict textual JSON for text-only models. Use after capture_screenshot when you need to understand what is visually rendered. expectations is optional.",
    inputSchema: {
      type: "object",
      properties: {
        goal: { type: "string" },
        expectations: { type: "array", items: { type: "string" } },
        image_path: { type: "string" }
      },
      required: ["goal", "image_path"]
    }
  },
  {
    name: "compare_images",
    description: "Compare two screenshots visually using the configured multimodal Ollama model and return strict textual JSON for text-only models. Use this for visual parity: first capture the reference page, then capture the candidate page, then call compare_images with reference_image_path and candidate_image_path. Pass expectations that define what matters and what should be tolerated, such as same photo with different crop/scale should be reported as crop/scale, not a different identity. Do not rely on browser_snapshot/DOM when rendered composition matters. Do not infer database/code causes from the image result. A result with matches_expectations:false is a successful comparison that found visual differences, not a tool failure. Only error:true means the tool failed. expectations is optional but strongly recommended.",
    inputSchema: {
      type: "object",
      properties: {
        goal: { type: "string" },
        expectations: { type: "array", items: { type: "string" } },
        reference_image_path: { type: "string" },
        candidate_image_path: { type: "string" }
      },
      required: ["goal", "reference_image_path", "candidate_image_path"]
    }
  },
  {
    name: "extract_text",
    description: "Extract visible text from an image using deepseek-ocr via Ollama.",
    inputSchema: {
      type: "object",
      properties: {
        image_path: { type: "string" }
      },
      required: ["image_path"]
    }
  },
  {
    name: "extract_markdown",
    description: "Extract readable content from an image as clean Markdown using the configured OCR model, commonly deepseek-ocr. Useful for screenshots, documents, tables, forms, and UI text that a text-only or multimodal agent should consume without image tokens.",
    inputSchema: {
      type: "object",
      properties: {
        image_path: { type: "string" },
        instructions: {
          type: "string",
          description: "Optional guidance for preserving tables, forms, code blocks, language, or other document-specific structure."
        }
      },
      required: ["image_path"]
    }
  }
];
