import type { AdminUiLoggingSettingKey } from '@spectra/database';
import {
  validateLogLevelInput,
  validateLoggingOutputInput,
  type ValidationResult,
} from '@spectra/logger';

type ValidationError = {
  ok: false;
  error: string;
  message: string;
};

type ValidationSuccess = {
  ok: true;
  value: unknown;
};

export function validateLoggingSettingValue(
  key: AdminUiLoggingSettingKey,
  value: unknown,
): ValidationSuccess | ValidationError {
  const result: ValidationResult<unknown> =
    key === 'logging_level' ?
      validateLogLevelInput(value)
    : validateLoggingOutputInput(value);

  if (result.ok) {
    return { ok: true, value: result.value };
  }
  return result;
}
