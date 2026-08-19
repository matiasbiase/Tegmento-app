import { OnboardingCards } from '@/components/onboarding/OnboardingCards';

export const dynamic = 'force-dynamic';

// Onboarding estilo cards (actividades + qué querés entender). La rueda de la
// vida ya no vive acá: se arma después desde /rueda/editar.
export default function OnboardingPage() {
  return <OnboardingCards />;
}
