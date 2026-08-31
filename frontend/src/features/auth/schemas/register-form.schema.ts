import { z } from "zod";

import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@auth/constants";

export const registerFormSchema = z
  .object({
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `A senha deve ter entre ${PASSWORD_MIN_LENGTH} e ${PASSWORD_MAX_LENGTH} caracteres`)
      .max(PASSWORD_MAX_LENGTH, `A senha deve ter entre ${PASSWORD_MIN_LENGTH} e ${PASSWORD_MAX_LENGTH} caracteres`),
    confirmPassword: z.string(),
    termsAccepted: z.boolean(),
  })
  .superRefine((values, context) => {
    if (values.password !== values.confirmPassword) {
      context.addIssue({ code: "custom", path: ["confirmPassword"], message: "As senhas não coincidem" });
    }

    if (!values.termsAccepted) {
      context.addIssue({ code: "custom", path: ["termsAccepted"], message: "É necessário aceitar os termos para continuar" });
    }
  });

export const registerFormStatusSchema = z.enum(["idle", "pending", "success", "error"]);
