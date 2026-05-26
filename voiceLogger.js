/**
 * voiceLogger.js — CommonGround Offline Voice Logger
 * ---------------------------------------------------------------------------
 * 100% offline speech-to-text using Vosk-WASM. NO data leaves the device.
 *
 * Why not the browser's built-in Web Speech API?
 *   * Chrome's webkitSpeechRecognition streams audio to Google's servers.
 *   * Safari's SpeechRecognition streams to Apple's servers.
 *   * Both fail entirely without internet — useless on a remote homestead.
 *
 * Setup the operator does ONCE (not bundled because the model is ~40 MB):
 *
 *   1. Download Vosk-browser ESM build:
 *        npm install vosk-browser
 *        cp -r node_modules/vosk-browser/dist  vendor/vosk-browser/
 *      Resulting layout:
 *        vendor/vosk-browser/vosk.js
 *        vendor/vosk-browser/vosk.wasm
 *
 *   2. Download a Vosk model. The "small en-us" model is 40 MB and runs
 *      comfortably on a phone:
 *        https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip
 *      Place it at:
 *        models/vosk-model-small-en-us-0.15.tar.gz
 *      (Vosk-browser accepts .tar.gz directly via fetch; no extraction.)
 *
 *   3. (Optional) For other languages, swap the path. See
 *      https://alphacephei.com/vosk/models  for the catalogue.
 *
 * This file is loaded as a classic script via <script src="voiceLogger.js">.
 * It exposes `window.OfflineVoiceLogger` and a small `cgVoice` namespace.
 *
 * License: MIT
 * ---------------------------------------------------------------------------
 */
(function () {
    'use strict';

    // ---- configurable paths (operator can override on window before loading)
    const VOSK_LIB_URL    = (window.cgVoiceConfig && window.cgVoiceConfig.libUrl)
        || './vendor/vosk-browser/vosk.js';
    const VOSK_MODEL_URL  = (window.cgVoiceConfig && window.cgVoiceConfig.modelUrl)
        || './models/vosk-model-small-en-us-0.15.tar.gz';
    const WORKLET_URL     = (window.cgVoiceConfig && window.cgVoiceConfig.workletUrl)
        || './vosk-resampler-worklet.js';
    const TARGET_RATE     = 16000;                      // Vosk small models expect 16 kHz mono

    // ---- module-scoped cache: the vosk-browser module + parsed model are
    //     heavy; we want to load them at most once per page.
    let voskModulePromise = null;
    let voskModelPromise  = null;

    function loadVoskOnce() {
        if (!voskModulePromise) {
            voskModulePromise = import(VOSK_LIB_URL).catch(err => {
                console.warn('[voiceLogger] vosk-browser library failed to load:', err);
                voskModulePromise = null;        // allow retry on next call
                throw err;
            });
        }
        return voskModulePromise;
    }

    async function loadModelOnce() {
        if (!voskModelPromise) {
            voskModelPromise = (async () => {
                const vosk = await loadVoskOnce();
                if (typeof vosk.createModel !== 'function') {
                    throw new Error('vosk-browser module is missing createModel()');
                }
                return vosk.createModel(VOSK_MODEL_URL);
            })().catch(err => {
                console.warn('[voiceLogger] model failed to load:', err);
                voskModelPromise = null;
                throw err;
            });
        }
        return voskModelPromise;
    }

    /**
     * Quick boolean probe used by app.js to decide whether to surface the
     * offline path or fall through to the deprecated cloud one.
     *
     * Lightweight — issues a HEAD request to each required asset path
     * without instantiating WASM or grabbing a microphone permission.
     */
    async function isOfflineVoiceAvailable() {
        try {
            const checks = await Promise.all([VOSK_LIB_URL, VOSK_MODEL_URL, WORKLET_URL].map(
                url => fetch(url, { method: 'HEAD', cache: 'no-store' })
                    .then(r => r.ok)
                    .catch(() => false)
            ));
            return checks.every(Boolean);
        } catch {
            return false;
        }
    }

    /**
     * OfflineVoiceLogger
     * -----------------------------------------------------------------------
     * Lifecycle:
     *   const logger = new OfflineVoiceLogger({ onPartial, onFinal, onStatus });
     *   await logger.start();           // requests mic permission
     *   ...                              // partials stream live
     *   const finalText = await logger.stop();
     *
     * The class is intentionally single-use per recognition session.
     * Recreate after stop() to start again — keeps state machine simple.
     */
    class OfflineVoiceLogger {
        constructor(opts = {}) {
            this.onPartial = opts.onPartial || (() => {});
            this.onFinal   = opts.onFinal   || (() => {});
            this.onStatus  = opts.onStatus  || (() => {});
            this.sampleRate = opts.sampleRate || TARGET_RATE;

            this._state            = 'idle';     // idle | loading | listening | stopping | stopped | error
            this._mediaStream      = null;
            this._audioContext     = null;
            this._sourceNode       = null;
            this._workletNode      = null;
            this._recognizer       = null;
            this._finalText        = '';
            this._stopResolve      = null;
        }

        get state() { return this._state; }

        /**
         * Acquire microphone, load the model (cached), wire AudioWorklet,
         * and start streaming. Resolves once we are actively listening.
         */
        async start() {
            if (this._state !== 'idle') {
                throw new Error(`OfflineVoiceLogger.start() called in state ${this._state}`);
            }
            this._state = 'loading';
            this.onStatus({ state: this._state, message: 'Loading offline model…' });

            try {
                // 1) Acquire microphone permission first so the failure mode
                //    (denied permission) is fast and obvious to the user.
                this._mediaStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl:  true,
                        channelCount:     1
                    },
                    video: false
                });

                // 2) Load the Vosk model (cached across sessions in browser HTTP cache).
                const model = await loadModelOnce();

                // 3) Build the recognizer pinned to 16 kHz.
                this._recognizer = new model.KaldiRecognizer(this.sampleRate);
                this._recognizer.setWords(true);

                this._recognizer.on('partialresult', (msg) => {
                    const partial = (msg && msg.result && msg.result.partial) || '';
                    if (partial) this.onPartial(partial);
                });
                this._recognizer.on('result', (msg) => {
                    const text = (msg && msg.result && msg.result.text) || '';
                    if (text) {
                        this._finalText = this._finalText
                            ? this._finalText + ' ' + text
                            : text;
                        this.onFinal(this._finalText);
                    }
                });

                // 4) AudioContext + AudioWorklet for the resampler.
                this._audioContext = new (window.AudioContext || window.webkitAudioContext)();
                await this._audioContext.audioWorklet.addModule(WORKLET_URL);

                this._sourceNode  = this._audioContext.createMediaStreamSource(this._mediaStream);
                this._workletNode = new AudioWorkletNode(this._audioContext, 'vosk-resampler', {
                    processorOptions: { targetSampleRate: this.sampleRate }
                });

                // The worklet emits Int16Array PCM frames over its port.
                this._workletNode.port.onmessage = (evt) => {
                    // Feed the recognizer. acceptWaveform takes either a typed array
                    // or an AudioBuffer; we send a Float32Array view since Vosk's
                    // KaldiRecognizer auto-detects the format.
                    if (!this._recognizer || this._state !== 'listening') return;
                    try {
                        this._recognizer.acceptWaveform(evt.data);
                    } catch (e) {
                        // A single chunk error must not tear down the whole session;
                        // log and keep going so a transient WASM hiccup isn't fatal.
                        console.warn('[voiceLogger] acceptWaveform threw:', e);
                    }
                };

                this._sourceNode.connect(this._workletNode);
                // Worklet must connect to a destination for the audio graph to run.
                // We route to a muted GainNode so the user doesn't hear themselves.
                const sink = this._audioContext.createGain();
                sink.gain.value = 0;
                this._workletNode.connect(sink).connect(this._audioContext.destination);

                this._state = 'listening';
                this.onStatus({ state: this._state, message: 'Listening (offline) — speak now.' });
            } catch (err) {
                this._state = 'error';
                this.onStatus({ state: this._state, message: 'Offline voice failed: ' + err.message });
                await this._teardown();
                throw err;
            }
        }

        /**
         * Stop the session and return the final transcript. Resolves after the
         * recognizer has flushed any in-flight buffer.
         */
        async stop() {
            if (this._state === 'stopped' || this._state === 'idle') {
                return this._finalText;
            }
            if (this._state !== 'listening') {
                // Mid-load cancel — tear down what we have.
                await this._teardown();
                return this._finalText;
            }
            this._state = 'stopping';
            this.onStatus({ state: this._state, message: 'Finalising transcript…' });

            // Some Vosk builds expose a final-flush method; call it if present.
            try {
                if (this._recognizer && typeof this._recognizer.retrieveFinalResult === 'function') {
                    const finalMsg = this._recognizer.retrieveFinalResult();
                    const finalText = (finalMsg && finalMsg.result && finalMsg.result.text) || '';
                    if (finalText) {
                        this._finalText = this._finalText
                            ? this._finalText + ' ' + finalText
                            : finalText;
                        this.onFinal(this._finalText);
                    }
                }
            } catch (e) {
                console.warn('[voiceLogger] retrieveFinalResult threw:', e);
            }

            await this._teardown();
            this._state = 'stopped';
            this.onStatus({ state: this._state, message: 'Done.' });
            return this._finalText;
        }

        async _teardown() {
            // Stop microphone tracks first so the user's "in use" indicator
            // turns off promptly even if the AudioContext close is slow.
            if (this._mediaStream) {
                for (const track of this._mediaStream.getTracks()) {
                    try { track.stop(); } catch {}
                }
                this._mediaStream = null;
            }
            if (this._workletNode) {
                try { this._workletNode.port.onmessage = null; } catch {}
                try { this._workletNode.disconnect(); } catch {}
                this._workletNode = null;
            }
            if (this._sourceNode) {
                try { this._sourceNode.disconnect(); } catch {}
                this._sourceNode = null;
            }
            if (this._audioContext) {
                try { await this._audioContext.close(); } catch {}
                this._audioContext = null;
            }
            if (this._recognizer) {
                try { this._recognizer.remove(); } catch {}
                this._recognizer = null;
            }
        }
    }

    // ---- expose to the rest of the app ------------------------------------
    window.cgVoice = {
        OfflineVoiceLogger,
        isOfflineVoiceAvailable,
        config: {
            libUrl:     VOSK_LIB_URL,
            modelUrl:   VOSK_MODEL_URL,
            workletUrl: WORKLET_URL,
            targetRate: TARGET_RATE
        }
    };
})();
