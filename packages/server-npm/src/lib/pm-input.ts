import { z } from "zod";
import { INPUT_LIMITS } from "@paretools/shared";

/** Reusable Zod field for packageManager input on all tools. */
export const packageManagerInput = z
  .enum(["npm", "pnpm"])
  .optional()
  .describe(
    "Package manager to use. Auto-detected from lock files if not specified (pnpm-lock.yaml → pnpm, otherwise npm).",
  );

/** Reusable Zod field for pnpm workspace --filter. */
export const filterInput = z
  .string()
  .max(INPUT_LIMITS.SHORT_STRING_MAX)
  .optional()
  .describe(
    "pnpm workspace filter pattern (e.g., '@scope/pkg', './packages/foo'). Only used with pnpm.",
  );
