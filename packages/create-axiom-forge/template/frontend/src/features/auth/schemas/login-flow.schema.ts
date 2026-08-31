import { z } from "zod";

export const loginFlowStepSchema = z.enum(["email", "login-password", "register", "verification-pending"]);

export const loginFlowStepActionSchema = z.object({
  canNext: z.boolean(),
  nextLabel: z.string().min(1),
});
