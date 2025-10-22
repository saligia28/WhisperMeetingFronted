import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { AdjustmentsHorizontalIcon, XMarkIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";
import type { VadConfig } from "../types/vad";
import { VAD_AGGRESSIVENESS_LABELS, VAD_CONFIG_LIMITS, DEFAULT_VAD_CONFIG } from "../types/vad";

interface VadSettingsDrawerProps {
  open: boolean;
  aggressiveness: number;
  speechRatio: number;
  locked: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (settings: VadConfig) => void;
}

export function VadSettingsDrawer({
  open,
  aggressiveness,
  speechRatio,
  locked,
  onOpenChange,
  onChange,
}: VadSettingsDrawerProps) {
  const handleReset = () => {
    if (!locked) {
      onChange(DEFAULT_VAD_CONFIG);
    }
  };

  const handleAggressivenessChange = (value: number) => {
    if (!locked) {
      onChange({ aggressiveness: value, speechRatio });
    }
  };

  const handleSpeechRatioChange = (value: number) => {
    if (!locked) {
      onChange({ aggressiveness, speechRatio: value });
    }
  };

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => !locked && onOpenChange(false)}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        {/* Drawer container */}
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-2xl border-l border-slate-200">
                    {/* Header */}
                    <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <Dialog.Title className="text-lg font-semibold text-slate-900">
                            语音检测阈值
                          </Dialog.Title>
                          <p className="mt-1 text-xs text-slate-500">会前完成调节,开始后自动锁定</p>
                        </div>
                        <div className="ml-3 flex h-7 items-center">
                          <button
                            type="button"
                            disabled={locked}
                            className="rounded-md text-slate-400 hover:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                            onClick={() => onOpenChange(false)}
                          >
                            <span className="sr-only">关闭</span>
                            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      {/* Reset button */}
                      <button
                        type="button"
                        disabled={locked}
                        onClick={handleReset}
                        className="mt-3 text-xs font-medium text-primary-600 hover:text-primary-700 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        重置为默认值
                      </button>
                    </div>

                    {/* Content */}
                    <div className="relative flex-1 px-6 py-6">
                      <div className="space-y-8">
                        {/* VAD Aggressiveness */}
                        <section>
                          <header className="mb-3">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium text-slate-700">VAD 敏感度</label>
                              <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700">
                                {VAD_AGGRESSIVENESS_LABELS[aggressiveness]}
                              </span>
                            </div>
                          </header>

                          {/* Custom slider */}
                          <div className="space-y-3">
                            <div className="relative">
                              <input
                                type="range"
                                min={VAD_CONFIG_LIMITS.aggressiveness.min}
                                max={VAD_CONFIG_LIMITS.aggressiveness.max}
                                step={VAD_CONFIG_LIMITS.aggressiveness.step}
                                value={aggressiveness}
                                disabled={locked}
                                onChange={(e) => handleAggressivenessChange(Number(e.target.value))}
                                className={clsx(
                                  "w-full h-2 rounded-lg appearance-none cursor-pointer",
                                  "bg-slate-200",
                                  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110",
                                  "[&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary-500 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:hover:scale-110",
                                  "disabled:opacity-50 disabled:cursor-not-allowed",
                                )}
                              />
                              {/* Tick marks */}
                              <div className="mt-2 flex justify-between px-0.5">
                                {VAD_AGGRESSIVENESS_LABELS.map((label, idx) => (
                                  <span
                                    key={idx}
                                    className={clsx(
                                      "text-xs transition-colors",
                                      aggressiveness === idx ? "font-medium text-primary-600" : "text-slate-400",
                                    )}
                                  >
                                    {label}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5">
                              <p className="text-xs text-slate-600 leading-relaxed">
                                {aggressiveness <= 1
                                  ? "🔊 适合安静会议室,更容易识别语音"
                                  : aggressiveness === 2
                                    ? "⚖️ 推荐,适合大多数场景"
                                    : "🔇 适合嘈杂环境,严格过滤噪音"}
                              </p>
                            </div>
                          </div>
                        </section>

                        {/* Speech Ratio Threshold */}
                        <section>
                          <header className="mb-3">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium text-slate-700">语音比例阈值</label>
                              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                                {speechRatio}%
                              </span>
                            </div>
                          </header>

                          {/* Custom slider */}
                          <div className="space-y-3">
                            <div className="relative">
                              <input
                                type="range"
                                min={VAD_CONFIG_LIMITS.speechRatio.min}
                                max={VAD_CONFIG_LIMITS.speechRatio.max}
                                step={VAD_CONFIG_LIMITS.speechRatio.step}
                                value={speechRatio}
                                disabled={locked}
                                onChange={(e) => handleSpeechRatioChange(Number(e.target.value))}
                                className={clsx(
                                  "w-full h-2 rounded-lg appearance-none cursor-pointer",
                                  "bg-slate-200",
                                  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110",
                                  "[&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-emerald-500 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:hover:scale-110",
                                  "disabled:opacity-50 disabled:cursor-not-allowed",
                                )}
                              />
                              {/* Value markers */}
                              <div className="mt-2 flex justify-between text-xs text-slate-400">
                                <span>30%</span>
                                <span>50%</span>
                                <span>80%</span>
                              </div>
                            </div>

                            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5">
                              <p className="text-xs text-slate-600 leading-relaxed">
                                {speechRatio < 45
                                  ? "📢 捕获间断发言,但可能处理噪音"
                                  : speechRatio <= 60
                                    ? "✅ 平衡,推荐用于正常会议"
                                    : "🎯 只转写清晰语音,减少无效处理"}
                              </p>
                            </div>
                          </div>
                        </section>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-slate-200 bg-slate-50/50 px-6 py-4">
                      {locked ? (
                        <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                          <span className="text-sm font-medium text-amber-700">🔒 会议进行中,参数已锁定</span>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">参数会在下一次开始录音时生效</p>
                      )}
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

/**
 * Floating Action Button to trigger the VAD settings drawer
 */
interface VadSettingsFabProps {
  onClick: () => void;
  disabled?: boolean;
}

export function VadSettingsFab({ onClick, disabled = false }: VadSettingsFabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="调整语音检测阈值"
      className={clsx(
        "fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200",
        "bg-primary-500 text-white hover:bg-primary-600 hover:shadow-xl active:scale-95",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary-500",
      )}
    >
      <AdjustmentsHorizontalIcon className="h-6 w-6" />
    </button>
  );
}
