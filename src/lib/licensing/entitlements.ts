import type { Entitlements, PlanTier, Subscription } from '@/domain/choreo';

/**
 * Central feature gate. ALL feature checks in the app MUST go through here.
 * Adding a new plan = update this file, nothing else.
 */
const ENTITLEMENTS_BY_TIER: Record<PlanTier, Entitlements> = {
  free: {
    maxChoreographies: 2,
    maxFormationsPerChoreo: 8,
    canExportPdf: true,
    canUseAudio: true,
    canUse3DPreview: true,
    canCollaborate: false,
    watermarkOnExport: true,
  },
  pro: {
    maxChoreographies: -1,
    maxFormationsPerChoreo: -1,
    canExportPdf: true,
    canUseAudio: true,
    canUse3DPreview: true,
    canCollaborate: false,
    watermarkOnExport: false,
  },
  team: {
    maxChoreographies: -1,
    maxFormationsPerChoreo: -1,
    canExportPdf: true,
    canUseAudio: true,
    canUse3DPreview: true,
    canCollaborate: true,
    watermarkOnExport: false,
  },
};

export function resolveEntitlements(sub: Subscription | null): Entitlements {
  if (!sub || sub.status !== 'active') return ENTITLEMENTS_BY_TIER.free;
  return ENTITLEMENTS_BY_TIER[sub.tier];
}

export class EntitlementError extends Error {
  constructor(public feature: keyof Entitlements, message?: string) {
    super(message ?? `Feature "${feature}" is not available on your plan.`);
  }
}

/** Hard assertion — throw if the gate fails. Use in server actions & mutations. */
export function assertEntitlement(
  ent: Entitlements,
  feature: keyof Entitlements,
  currentCount?: number,
) {
  const value = ent[feature];
  if (typeof value === 'boolean' && !value) throw new EntitlementError(feature);
  if (typeof value === 'number' && value !== -1 && currentCount !== undefined && currentCount >= value) {
    throw new EntitlementError(feature, `Limit reached (${value}).`);
  }
}
