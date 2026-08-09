import { z } from "zod";

export const executeSchema = z.object({
  command: z.string().min(1),
  args: z.array(z.string()).optional(),
  cwd: z.string().optional(),
  timeout_ms: z.number().int().positive().optional(),
  env: z.record(z.string()).optional(),
  shell: z.boolean().optional()
});

export const screenshotSchema = z.object({
  url: z.string().optional(),
  selector: z.string().optional(),
  full_page: z.boolean().optional(),
  output_path: z.string().optional(),
  delay_ms: z.number().int().nonnegative().max(120_000).optional(),
  viewport: z
    .object({
      width: z.number().int().positive(),
      height: z.number().int().positive()
    })
    .optional()
});

export const browserNavigateSchema = z.object({
  url: z.string().min(1),
  wait_until: z.enum(["load", "domcontentloaded", "networkidle"]).optional(),
  viewport: z
    .object({
      width: z.number().int().positive(),
      height: z.number().int().positive()
    })
    .optional()
});

export const browserSnapshotSchema = z.object({
  selector: z.string().optional(),
  max_elements: z.number().int().positive().max(500).optional()
});

export const browserClickSchema = z.object({ selector: z.string().min(1) });
export const browserFillSchema = z.object({ selector: z.string().min(1), value: z.string() });
export const browserPressKeySchema = z.object({ key: z.string().min(1), selector: z.string().optional() });
export const browserWaitForSchema = z.object({
  selector: z.string().optional(),
  timeout_ms: z.number().int().positive().optional(),
  state: z.enum(["attached", "detached", "visible", "hidden"]).optional()
});
export const browserEvaluateSchema = z.object({ script: z.string().min(1) });
export const browserOpenInteractiveSchema = z.object({
  url: z.string().optional(),
  user_data_dir: z.string().optional(),
  channel: z.string().optional(),
  viewport: z
    .object({
      width: z.number().int().positive(),
      height: z.number().int().positive()
    })
    .optional()
});
export const browserUseHeadlessSchema = z.object({
  viewport: z
    .object({
      width: z.number().int().positive(),
      height: z.number().int().positive()
    })
    .optional()
});

export const analyzeSchema = z.object({
  goal: z.string().min(1),
  expectations: z.array(z.string()).default([]),
  image_path: z.string().min(1)
});

export const compareImagesSchema = z.object({
  goal: z.string().min(1),
  expectations: z.array(z.string()).default([]),
  reference_image_path: z.string().min(1),
  candidate_image_path: z.string().min(1)
});

export const extractTextSchema = z.object({
  image_path: z.string().min(1)
});

export const extractMarkdownSchema = z.object({
  image_path: z.string().min(1),
  instructions: z.string().optional()
});
