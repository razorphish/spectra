const MAX_TEXT = 4000;
const MAX_TENANT_HINT = 512;
const MAX_TERMS = 128;
const MAX_ACCEPTED_AT = 64;

export type ParQuestionnaireV1 = {
  v: 1;
  attestations?: {
    productionTermsAccepted?: boolean;
    sandboxTestingCompleted?: boolean;
  };
  termsVersion?: string;
  acceptedAt?: string;
  intendedProductionTenantId?: string;
};

export type ParDocumentsEnvelope = {
  questionnaire: ParQuestionnaireV1;
};

export class ParQuestionnaireValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: { path: string; message: string }[],
  ) {
    super(message);
    this.name = 'ParQuestionnaireValidationError';
  }
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

/**
 * Validates PAR questionnaire `documents` envelope (v1) without Zod (keeps @spectra/database lean).
 */
export function parseParDocumentsEnvelope(raw: unknown): ParDocumentsEnvelope {
  const issues: { path: string; message: string }[] = [];
  if (!isRecord(raw)) {
    issues.push({ path: '', message: 'documents must be an object.' });
    throw new ParQuestionnaireValidationError('Invalid documents.', issues);
  }
  const q = raw['questionnaire'];
  if (!isRecord(q)) {
    issues.push({ path: 'questionnaire', message: 'questionnaire object is required.' });
    throw new ParQuestionnaireValidationError('Invalid questionnaire.', issues);
  }
  if (q['v'] !== 1) {
    issues.push({ path: 'questionnaire.v', message: 'questionnaire.v must be 1.' });
  }
  const attestations = q['attestations'];
  if (attestations !== undefined && !isRecord(attestations)) {
    issues.push({ path: 'questionnaire.attestations', message: 'attestations must be an object when present.' });
  }
  for (const key of ['termsVersion', 'acceptedAt', 'intendedProductionTenantId'] as const) {
    const v = q[key];
    if (v !== undefined && typeof v !== 'string') {
      issues.push({ path: `questionnaire.${key}`, message: `${key} must be a string when present.` });
    }
  }
  const termsVersion = typeof q['termsVersion'] === 'string' ? q['termsVersion'] : undefined;
  const acceptedAt = typeof q['acceptedAt'] === 'string' ? q['acceptedAt'] : undefined;
  const intendedProductionTenantId =
    typeof q['intendedProductionTenantId'] === 'string' ? q['intendedProductionTenantId'] : undefined;

  if (termsVersion && termsVersion.length > MAX_TERMS) {
    issues.push({ path: 'questionnaire.termsVersion', message: 'termsVersion is too long.' });
  }
  if (acceptedAt && acceptedAt.length > MAX_ACCEPTED_AT) {
    issues.push({ path: 'questionnaire.acceptedAt', message: 'acceptedAt is too long.' });
  }
  if (intendedProductionTenantId && intendedProductionTenantId.length > MAX_TENANT_HINT) {
    issues.push({
      path: 'questionnaire.intendedProductionTenantId',
      message: 'intendedProductionTenantId is too long.',
    });
  }

  const att = isRecord(attestations) ? attestations : undefined;
  const termsOn =
    att?.['productionTermsAccepted'] === true || att?.['sandboxTestingCompleted'] === true;
  if (termsOn) {
    if (!termsVersion?.trim()) {
      issues.push({
        path: 'questionnaire.termsVersion',
        message: 'termsVersion is required when attestations are true.',
      });
    }
    if (!acceptedAt?.trim()) {
      issues.push({
        path: 'questionnaire.acceptedAt',
        message: 'acceptedAt is required when attestations are true.',
      });
    }
  }

  if (issues.length) {
    throw new ParQuestionnaireValidationError('Invalid questionnaire.', issues);
  }

  const questionnaire: ParQuestionnaireV1 = {
    v: 1,
    attestations:
      att ?
        {
          productionTermsAccepted:
            att['productionTermsAccepted'] === true ? true : undefined,
          sandboxTestingCompleted: att['sandboxTestingCompleted'] === true ? true : undefined,
        }
      : undefined,
    termsVersion,
    acceptedAt,
    intendedProductionTenantId,
  };

  return { questionnaire };
}
