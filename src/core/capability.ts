import { i18n } from '@/i18n';

export type DeviceTier = 'High' | 'Mid' | 'Low';

export interface DeviceSpecs {
  concurrency: number;
  memory: number;
  hasWebGPU: boolean;
  hasWebCodecs: boolean;
}

export interface CapabilityPolicy {
  tier: DeviceTier;
  specs: DeviceSpecs;
}

const classifyTier = ({
  concurrency,
  memory,
  hasWebGPU,
  hasWebCodecs,
}: DeviceSpecs): DeviceTier => {
  if ((hasWebGPU || concurrency >= 8) && memory >= 6) return 'High';
  if (concurrency <= 2 || memory <= 2 || (!hasWebCodecs && !hasWebGPU)) return 'Low';
  return 'Mid';
};

export const getDeviceTierReason = (specs: DeviceSpecs): string => {
  const { concurrency, memory, hasWebGPU } = specs;
  const tier = classifyTier(specs);
  if (tier === 'High') {
    const accel = hasWebGPU ? i18n.t('tier_accel_webgpu') : i18n.t('tier_accel_multithread');
    return i18n.t('tier_reason_high', { concurrency, memory, accel });
  }
  return i18n.t(tier === 'Low' ? 'tier_reason_low' : 'tier_reason_mid', { concurrency, memory });
};

export const detectDeviceCapabilities = (): CapabilityPolicy => {
  const nav = navigator as Navigator & { deviceMemory?: number; gpu?: unknown };
  const specs: DeviceSpecs = {
    concurrency: nav.hardwareConcurrency || 4,
    memory: nav.deviceMemory || 4,
    hasWebGPU: Boolean(nav.gpu),
    hasWebCodecs: 'VideoEncoder' in window && 'VideoDecoder' in window,
  };
  return { tier: classifyTier(specs), specs };
};

let cachedPolicy: CapabilityPolicy | undefined;

export const getDevicePolicy = () => (cachedPolicy ??= detectDeviceCapabilities());
