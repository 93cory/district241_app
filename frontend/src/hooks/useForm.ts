"use client";

import { useState, useCallback, type ChangeEvent, type FormEvent } from "react";

type ValidationRule<T> = {
  required?: string;
  minLength?: { value: number; message: string };
  maxLength?: { value: number; message: string };
  pattern?: { value: RegExp; message: string };
  custom?: (value: unknown, values: T) => string | undefined;
};

type ValidationRules<T> = Partial<Record<keyof T, ValidationRule<T>>>;
type Errors<T> = Partial<Record<keyof T, string>>;

interface UseFormOptions<T> {
  initialValues: T;
  rules?: ValidationRules<T>;
  onSubmit: (values: T) => void | Promise<void>;
}

export function useForm<T extends Record<string, unknown>>({
  initialValues,
  rules = {},
  onSubmit,
}: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Errors<T>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);

  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Clear error on change
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleChange = useCallback(
    (field: keyof T) =>
      (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const value =
          e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
        setValue(field, value as T[keyof T]);
      },
    [setValue],
  );

  const handleBlur = useCallback(
    (field: keyof T) => () => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      // Validate single field
      const rule = rules[field];
      if (!rule) return;
      const error = validateField(field, values[field], rule, values);
      setErrors((prev) =>
        error
          ? { ...prev, [field]: error }
          : (() => {
              const n = { ...prev };
              delete n[field];
              return n;
            })(),
      );
    },
    [rules, values],
  );

  const validate = useCallback((): boolean => {
    const newErrors: Errors<T> = {};
    for (const [field, rule] of Object.entries(rules) as [keyof T, ValidationRule<T>][]) {
      const error = validateField(field, values[field], rule, values);
      if (error) newErrors[field] = error;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [rules, values]);

  const handleSubmit = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      if (!validate()) return;
      setSubmitting(true);
      try {
        await onSubmit(values);
      } finally {
        setSubmitting(false);
      }
    },
    [validate, onSubmit, values],
  );

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    submitting,
    setValue,
    handleChange,
    handleBlur,
    handleSubmit,
    validate,
    reset,
  };
}

function validateField<T>(
  _field: keyof T,
  value: unknown,
  rule: ValidationRule<T>,
  allValues: T,
): string | undefined {
  const str = typeof value === "string" ? value : "";

  if (rule.required && (!value || str.trim() === "")) {
    return rule.required;
  }
  if (rule.minLength && str.length < rule.minLength.value) {
    return rule.minLength.message;
  }
  if (rule.maxLength && str.length > rule.maxLength.value) {
    return rule.maxLength.message;
  }
  if (rule.pattern && !rule.pattern.value.test(str)) {
    return rule.pattern.message;
  }
  if (rule.custom) {
    return rule.custom(value, allValues);
  }
  return undefined;
}
