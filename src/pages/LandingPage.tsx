import { LandingHeader } from '@/components/landing/LandingHeader';
import { Hero } from '@/components/landing/Hero';
import { ProblemSection } from '@/components/landing/ProblemSection';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { CustomerExperience } from '@/components/landing/CustomerExperience';
import { ProductShowcase } from '@/components/landing/ProductShowcase';
import { FinalCTA } from '@/components/landing/FinalCTA';
import { LandingFooter } from '@/components/landing/LandingFooter';

/**
 * Landing page oficial do SaaS StarBarber.
 *
 * Importante: esta página NÃO está associada a nenhuma barbearia/tenant.
 * Não usa useBarbershop, não depende de slug, não consulta o Supabase.
 * A identidade visual (cores/tipografia) usa os valores padrão definidos
 * em src/index.css (:root) — os mesmos que uma barbearia usa antes de
 * qualquer tema próprio ser aplicado, já que essa é a identidade do
 * próprio StarBarber.
 */
export function LandingPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <LandingHeader />
      <main>
        <Hero />
        <ProblemSection />
        <HowItWorks />
        <FeaturesSection />
        <CustomerExperience />
        <ProductShowcase />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
