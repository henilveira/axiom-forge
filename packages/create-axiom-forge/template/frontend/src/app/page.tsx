import { LandingHeader, LandingOrchestration, LandingPageContent } from "@landing";

export default function Home() {
  return (
    <LandingOrchestration header={<LandingHeader />}>
      <LandingPageContent />
    </LandingOrchestration>
  );
}
