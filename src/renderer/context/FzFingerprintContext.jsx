import React, { createContext, useContext, useMemo, useState } from 'react';
import { FZ_RECEIPTS } from '../../engine/fzReceipts.js';

const FzFingerprintContext = createContext(null);

export function FzFingerprintProvider({ children }) {
  const [selectedId, setSelectedId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const selectedReceipt = useMemo(
    () => FZ_RECEIPTS.find((r) => r.id === selectedId) ?? null,
    [selectedId]
  );

  const fingerprintReceipt = useMemo(() => {
    if (!selectedReceipt) return null;
    return {
      id: selectedReceipt.id,
      name: selectedReceipt.name,
      description: selectedReceipt.description,
      params: { ...selectedReceipt.params },
    };
  }, [selectedReceipt]);

  const value = useMemo(
    () => ({
      receipts: FZ_RECEIPTS,
      selectedId,
      selectedReceipt,
      expandedId,
      setExpandedId,
      selectReceipt: (id) => {
        setSelectedId(id);
        setExpandedId(id);
      },
      fingerprintReceipt,
    }),
    [selectedId, selectedReceipt, expandedId, fingerprintReceipt]
  );

  return <FzFingerprintContext.Provider value={value}>{children}</FzFingerprintContext.Provider>;
}

export function useFzFingerprint() {
  const ctx = useContext(FzFingerprintContext);
  if (!ctx) throw new Error('useFzFingerprint must be used within FzFingerprintProvider');
  return ctx;
}
