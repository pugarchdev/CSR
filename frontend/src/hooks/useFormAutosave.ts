"use client";

import { useState, useEffect, useCallback } from "react";

export interface AutosaveOptions<T> {
  formKey: string;
  initialValues: T;
  debounceMs?: number;
}

export function useFormAutosave<T extends Record<string, any>>({
  formKey,
  initialValues,
  debounceMs = 1000,
}: AutosaveOptions<T>) {
  const storageKey = `mahacsr_draft_${formKey}`;
  const [formData, setFormData] = useState<T>(initialValues);
  const [isSaved, setIsSaved] = useState<boolean>(true);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Restore saved draft on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          setFormData((prev) => ({ ...prev, ...parsed }));
          setLastSavedAt(new Date());
        }
      } catch (err) {
        console.warn(`[Autosave] Failed to parse draft for key ${storageKey}`, err);
      }
    }
  }, [storageKey]);

  // Debounced autosave to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsSaved(false);
    const handler = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(formData));
        setIsSaved(true);
        setLastSavedAt(new Date());
      } catch (err) {
        console.error(`[Autosave] Failed to persist draft for key ${storageKey}`, err);
      }
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [formData, storageKey, debounceMs]);

  const updateField = useCallback((field: keyof T, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const resetDraft = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(storageKey);
    }
    setFormData(initialValues);
    setIsSaved(true);
    setLastSavedAt(null);
  }, [storageKey, initialValues]);

  return {
    formData,
    setFormData,
    updateField,
    resetDraft,
    isSaved,
    lastSavedAt,
  };
}
