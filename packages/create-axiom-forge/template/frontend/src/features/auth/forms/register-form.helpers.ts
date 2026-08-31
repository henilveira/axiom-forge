import { registerFormSchema } from "@auth/schemas";

export function getRegisterIssueMessage(
  issues: readonly { path: PropertyKey[]; message: string }[],
  field: string,
): string | undefined {
  return issues.find((issue) => issue.path[0] === field)?.message;
}

export function getRegisterValidationErrors(values: { password: string; confirmPassword: string; termsAccepted: boolean }): {
  password: string | undefined;
  confirmPassword: string | undefined;
  termsAccepted: string | undefined;
} {
  const result = registerFormSchema.safeParse(values);
  return { password: result.success ? undefined : getRegisterIssueMessage(result.error.issues, "password"), confirmPassword: result.success ? undefined : getRegisterIssueMessage(result.error.issues, "confirmPassword"), termsAccepted: result.success ? undefined : getRegisterIssueMessage(result.error.issues, "termsAccepted") };
}

export async function executeRegisterSubmit(
  mutation: { getState: () => { status: string }; execute: (input: { email: string; password: string; termsVersion: string }) => Promise<unknown> },
  input: { email: string; password: string; termsVersion: string },
): Promise<boolean> {
  if (mutation.getState().status === "pending") return false;
  await mutation.execute(input);
  return true;
}
