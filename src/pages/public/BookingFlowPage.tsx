import { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Barbershop } from '@/types';
import { BookingProvider } from '@/components/booking/BookingContext';
import { BookingProgress } from '@/components/booking/BookingProgress';
import { StepService } from './steps/StepService';
import { StepBarber } from './steps/StepBarber';
import { StepDate } from './steps/StepDate';
import { StepSlot } from './steps/StepSlot';
import { StepCustomer } from './steps/StepCustomer';
import { publicPath } from '@/utils/publicPath';
import { ArrowLeft } from 'lucide-react';

export function BookingFlowPage() {
  const { barbershop } = useOutletContext<{ barbershop: Barbershop }>();
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  function next() {
    setStep((s) => Math.min(s + 1, 5));
  }
  function back() {
    if (step === 1) {
      navigate(publicPath(barbershop.slug));
    } else {
      setStep((s) => s - 1);
    }
  }

  return (
    <BookingProvider>
      <div className="mx-auto flex min-h-screen max-w-xl flex-col px-5 py-8">
        <button onClick={back} className="mb-6 flex w-fit items-center gap-2 text-sm text-graphite hover:text-ink">
          <ArrowLeft size={16} /> Voltar
        </button>

        <BookingProgress current={step} />

        <div className="mt-8 flex-1">
          {step === 1 && <StepService barbershop={barbershop} onNext={next} />}
          {step === 2 && <StepBarber barbershop={barbershop} onNext={next} />}
          {step === 3 && <StepDate onNext={next} />}
          {step === 4 && <StepSlot barbershop={barbershop} onNext={next} />}
          {step === 5 && <StepCustomer barbershop={barbershop} />}
        </div>
      </div>
    </BookingProvider>
  );
}
