import { createContext, ReactNode, useContext, useState } from 'react';
import { BookingSelection } from '@/types';

interface BookingContextValue {
  selection: BookingSelection;
  update: (patch: Partial<BookingSelection>) => void;
  reset: () => void;
}

const initial: BookingSelection = {
  service: null,
  barber: null,
  date: null,
  slot: null,
  resolvedBarberId: null,
  customerName: '',
  customerWhatsapp: '',
  customerEmail: '',
};

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<BookingSelection>(initial);

  function update(patch: Partial<BookingSelection>) {
    setSelection((prev) => ({ ...prev, ...patch }));
  }

  function reset() {
    setSelection(initial);
  }

  return <BookingContext.Provider value={{ selection, update, reset }}>{children}</BookingContext.Provider>;
}

export function useBooking(): BookingContextValue {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking precisa estar dentro de <BookingProvider>');
  return ctx;
}
