import type { Metadata } from "next";
import type { ReactElement } from "react";

import { LoginFlow } from "@auth";

export const metadata: Metadata = {
  title: "Entrar — Starter App",
  description: "Acesse sua conta.",
};

export default function LoginPage(): ReactElement {
  return <LoginFlow />;
}
