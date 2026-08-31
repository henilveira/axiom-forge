import type { ReactElement } from "react";

import { BenefitsSection } from "./landing-benefits";
import { CTAGeneric } from "./landing-cta";
import { FooterProfessional } from "./landing-footer";
import { HeroProfessional } from "./landing-hero";
import { NextStepsSection } from "./landing-next-steps";
import { SocialProof } from "./landing-social-proof";
import { TestimonialsSection } from "./landing-testimonials";
import { TimelineSection } from "./landing-timeline";

export function LandingPageContent(): ReactElement {
  return <><HeroProfessional /><SocialProof /><BenefitsSection /><TimelineSection /><TestimonialsSection /><NextStepsSection /><CTAGeneric /><FooterProfessional /></>;
}
