/**
 * AudioWorklet: capture mono float input, decimate/resample to 16 kHz, emit s16le PCM chunks (~10 ms).
 * Loaded from /audio-worklets/pcm-capture-processor.js
 */
class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._acc = [];
    this._inRate = sampleRate;
    this._outRate = 16000;
    this._ratio = this._inRate / this._outRate;
    this._needIn = Math.max(1, Math.ceil(160 * this._ratio));
  }

  _rms(arr, len) {
    let sum = 0;
    for (let i = 0; i < len; i += 1) {
      const x = arr[i];
      sum += x * x;
    }
    return Math.sqrt(sum / Math.max(1, len));
  }

  process(inputs) {
    const ch0 = inputs[0]?.[0];
    if (!ch0 || ch0.length === 0) return true;

    for (let i = 0; i < ch0.length; i += 1) {
      this._acc.push(ch0[i]);
    }

    while (this._acc.length >= this._needIn) {
      const slice = this._acc.splice(0, this._needIn);
      const outF = new Float32Array(160);
      for (let j = 0; j < 160; j += 1) {
        const pos = j * this._ratio;
        const k = Math.floor(pos);
        const f = pos - k;
        const a = slice[k] ?? 0;
        const b = slice[k + 1] ?? a;
        outF[j] = a * (1 - f) + b * f;
      }
      const pcm = new Int16Array(160);
      for (let j = 0; j < 160; j += 1) {
        const s = Math.max(-1, Math.min(1, outF[j]));
        pcm[j] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      const rms = this._rms(outF, 160);
      this.port.postMessage({ pcm: pcm.buffer, rms }, [pcm.buffer]);
    }
    return true;
  }
}

registerProcessor("pcm-capture-processor", PcmCaptureProcessor);
