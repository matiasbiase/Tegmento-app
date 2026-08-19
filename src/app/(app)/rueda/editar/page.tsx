import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { BotonCerrar } from '@/components/ui/BotonCerrar';

export const dynamic = 'force-dynamic';

// Rehacer la rueda sin resetear la app: el wizard corre en modo soloRueda.
export default function EditarRueda() {
  return (
    <>
      <BotonCerrar href="/rueda" posicion="pantalla" etiqueta="Salir de la rueda" />
      <OnboardingWizard soloRueda />
    </>
  );
}
