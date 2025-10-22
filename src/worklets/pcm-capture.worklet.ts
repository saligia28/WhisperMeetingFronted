// @ts-nocheck

class PcmCaptureProcessor extends AudioWorkletProcessor {
  process(inputs: Float32Array[][]): boolean {
    const [channelGroup] = inputs;
    if (channelGroup && channelGroup[0]) {
      // Clone the buffer because the underlying memory is reused by the audio thread.
      this.port.postMessage(channelGroup[0].slice());
    }
    return true;
  }
}

registerProcessor("pcm-capture-processor", PcmCaptureProcessor);
