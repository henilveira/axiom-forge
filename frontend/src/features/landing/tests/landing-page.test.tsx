import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LandingHeader, LandingOrchestration, LandingPageContent } from "@landing";

function assertLandingSections(markup: string): void {
  expect(markup.match(/id="features"/g)).toHaveLength(1);
  expect(markup.match(/id="how-it-works"/g)).toHaveLength(1);
  expect(markup.match(/id="next-steps"/g)).toHaveLength(1);
}

describe("starter landing composition", () => {
  const markup = renderToStaticMarkup(
    <LandingOrchestration header={<LandingHeader />}>
      <LandingPageContent />
    </LandingOrchestration>,
  );

  it("renders the required sections and a local login CTA", () => {
    assertLandingSections(markup);
    expect(markup).toContain('<main id="top"');
    expect(markup.match(/href="\/login"/g)?.length).toBeGreaterThan(0);
  });

  it("fails the section assertion when a required section is absent", () => {
    function assertMissingSection(): void {
      assertLandingSections(markup.replace('id="features"', ""));
    }

    expect(assertMissingSection).toThrow();
  });

  it("contains no external product URLs or business claims", () => {
    expect(markup).not.toContain("http://");
    expect(markup).not.toContain("https://");
    expect(markup).toContain("0");
  });
});

describe("starter landing header", () => {
  it("renders navigation and mobile menu control attributes", () => {
    const markup = renderToStaticMarkup(<LandingHeader />);

    expect(markup).toContain('aria-label="Navegação principal"');
    expect(markup).toContain('href="#features"');
    expect(markup).toContain('href="#next-steps"');
    expect(markup).toContain('href="#how-it-works"');
    expect(markup).toContain('type="button"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('aria-controls="landing-mobile-menu"');
    expect(markup).toContain('aria-label="Abrir menu"');
    expect(markup).not.toContain('id="landing-mobile-menu"');
  });
});
