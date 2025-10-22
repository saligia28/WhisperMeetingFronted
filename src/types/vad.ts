/**
 * VAD (Voice Activity Detection) Configuration Types
 */

export interface VadConfig {
  /**
   * VAD aggressiveness level (0-3)
   * 0 = Least aggressive (more likely to detect as speech)
   * 1 = Low aggressiveness
   * 2 = Moderate aggressiveness (balanced, recommended)
   * 3 = Most aggressive (strict filtering)
   */
  aggressiveness: number;

  /**
   * Minimum speech ratio threshold (30-80)
   * Percentage of audio frames that must contain speech to trigger transcription
   */
  speechRatio: number;
}

export const DEFAULT_VAD_CONFIG: VadConfig = {
  aggressiveness: 1,  // 降低到1，更容易检测到语音
  speechRatio: 30,    // 降低到30%，更容易触发转录
};

export const VAD_AGGRESSIVENESS_LABELS = ["松散", "一般", "平衡", "严格"] as const;

export const VAD_CONFIG_LIMITS = {
  aggressiveness: { min: 0, max: 3, step: 1 },
  speechRatio: { min: 30, max: 80, step: 5 },
} as const;
