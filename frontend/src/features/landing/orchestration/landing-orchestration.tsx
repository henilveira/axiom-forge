import type { ReactElement } from "react";

export function LandingOrchestration({ children, header }: Readonly<{ children: ReactElement; header: ReactElement }>): ReactElement {
  return (
    <>
      {header}
      <main id="top" className="min-h-screen overflow-x-hidden bg-background">{children}</main>
    </>
  );
}
