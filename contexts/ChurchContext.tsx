import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Church } from "@/constants/ChurchTypes";

const STORAGE_KEY = "church.selection";

type StoredSelection = {
  onboarded: boolean;
  church: Church | null;
};

type ChurchContextValue = StoredSelection & {
  /** False until the saved selection has been read from storage. */
  ready: boolean;
  /** Saves the user's church (or null for basic usage) and finishes onboarding. */
  chooseChurch: (church: Church | null) => void;
};

const ChurchContext = createContext<ChurchContextValue | null>(null);

export function ChurchProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<StoredSelection>({
    onboarded: false,
    church: null,
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<StoredSelection>;
          setSelection({
            onboarded: Boolean(parsed.onboarded),
            church: parsed.church ?? null,
          });
        }
      })
      .catch(console.warn)
      .finally(() => setReady(true));
  }, []);

  const chooseChurch = useCallback((church: Church | null) => {
    const next: StoredSelection = {
      onboarded: true,
      church: church
        ? {
            id: church.id,
            name: church.name,
            address: church.address,
            city: church.city,
            country: church.country,
            latitude: church.latitude,
            longitude: church.longitude,
          }
        : null,
    };
    setSelection(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(console.warn);
  }, []);

  const value = useMemo(
    () => ({ ...selection, ready, chooseChurch }),
    [selection, ready, chooseChurch]
  );

  return <ChurchContext.Provider value={value}>{children}</ChurchContext.Provider>;
}

export function useChurch() {
  const context = useContext(ChurchContext);

  if (!context) {
    throw new Error("useChurch must be used inside ChurchProvider");
  }

  return context;
}
