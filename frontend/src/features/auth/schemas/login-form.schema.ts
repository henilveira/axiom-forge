import { z } from "zod";

export const loginPasswordSchema = z.object({
  password: z.string().min(1, "Informe sua senha"),
});

export const loginFormStatusSchema = z.enum(["idle", "pending", "success", "error"]);
