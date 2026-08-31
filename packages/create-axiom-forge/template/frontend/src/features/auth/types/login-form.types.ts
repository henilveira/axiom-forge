import type { z } from "zod";

import type { loginFormStatusSchema, loginPasswordSchema } from "@auth/schemas";

export type LoginFormValues = z.infer<typeof loginPasswordSchema>;
export type LoginFormStatus = z.infer<typeof loginFormStatusSchema>;
