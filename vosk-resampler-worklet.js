/**
 * vosk-resampler-worklet.js — AudioWorkletProcessor for Vosk-WASM
 * ---------------------------------------------------------------------------
 * Resamples the browser's native microphone stream (typically 48 kHz Float32)
 * down to 16 kHz Float32, then ships frames to the main thread for the Vosk
 * recognizer. We resample with linear interpolation rather than nearest-
 * neighbour — the extra ~4 floating-point ops per sample is negligible on
 * any device that can run a 40 MB acoustic model, and the aliasing
 * reduction matters audibly for the recognizer.
 *
 * Format contract: vosk-browser's KaldiRecognizer.acceptWaveform() accepts
 * an AudioBuffer-like or a Float32Array at the sample rate the recognizer
 * was constructed with. We send Float32Array.
 *
 * Note on transferables: postMessage with a transferable second argument
 * moves the buffer's underlying ArrayBuffer instead of copying it. The
 * processor allocates a fresh buffer per quantum so giving up ownership
 * is safe.
 * ---------------------------------------------------------------------------
 */

class VoskResamplerProcessor extends AudioWorkletProcessor {
    /**
     * processorOptions:
     *   * targetSampleRate (default 16000) — Vosk model sample rate
     */
    constructor(options) {
        super();
        const opts = (options && options.processorOptions) || {};
        this._targetSampleRate = opts.targetSampleRate || 16000;

        // Track a fractional position so successive quanta stitch together
        // without seams. AudioWorklet hands us 128-frame quanta by default,
        // and at 48000 → 16000 (ratio 3:1) each quantum yields ~42-43 output
        // samples; the fractional remainder rolls into the next quantum.
        this._fraction = 0;
    }

    process(inputs /*, outputs, parameters */) {
        const channels = inputs[0];
        if (!channels || channels.length === 0 || !channels[0]) {
            return true;   // mic not feeding us yet — stay alive
        }

        const input = channels[0];           // Float32Array, length=128 normally
        const inLen = input.length;
        if (inLen === 0) return true;

        // `sampleRate` is a global available inside the AudioWorkletProcessor
        // execution scope; it's the AudioContext's sample rate.
        const ratio = sampleRate / this._targetSampleRate;

        // Reserve a generous output buffer; trim before posting.
        const maxOut = Math.ceil(inLen / ratio) + 1;
        const out = new Float32Array(maxOut);

        let outIdx = 0;
        let pos    = this._fraction;
        while (pos < inLen - 1) {
            const i0 = Math.floor(pos);
            const i1 = i0 + 1;
            const frac = pos - i0;
            // Linear interpolation.
            out[outIdx++] = input[i0] + (input[i1] - input[i0]) * frac;
            pos += ratio;
        }
        // Stash the leftover fraction past the end so the next quantum
        // resumes at the right sub-sample offset.
        this._fraction = pos - inLen;
        if (this._fraction < 0) this._fraction = 0;

        if (outIdx > 0) {
            // Send only the populated slice; transfer ownership for zero-copy.
            const trimmed = out.subarray(0, outIdx);
            // Copy into a fresh ArrayBuffer so we can transfer it without
            // affecting `out` (subarray shares the backing store).
            const xfer = new Float32Array(trimmed).buffer;
            this.port.postMessage(new Float32Array(xfer), [xfer]);
        }

        return true;
    }
}

registerProcessor('vosk-resampler', VoskResamplerProcessor);
