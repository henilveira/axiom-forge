import { z } from "zod";

export const multiStepFormStepSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

export const multiStepFormShellThemeSchema = z.enum(["light", "dark"]);
export const multiStepFormVariantSchema = z.enum(["card", "plain"]);
