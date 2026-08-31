import type { z } from "zod";

import type { loginFlowStepActionSchema, loginFlowStepSchema } from "@auth/schemas";

export type LoginFlowStep = z.infer<typeof loginFlowStepSchema>;
export type LoginFlowStepAction = z.infer<typeof loginFlowStepActionSchema> & { onNext: () => void };
