import { z } from "zod";

import { EMAIL_MIN_LENGTH } from "@auth/constants";

export const emailSchema = z
  .string()
  .trim()
  .min(EMAIL_MIN_LENGTH, "E-mail inválido")
  .pipe(z.email({ error: "E-mail inválido" }));
