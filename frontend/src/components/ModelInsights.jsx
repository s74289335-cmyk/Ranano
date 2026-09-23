import { LineChart, BarChart } from "./Charts.jsx";
import PageHero from "./PageHero.jsx";

// Real numbers from actual Colab training runs - not placeholders.
const DIFFUSION_LOSS = [0.1045,0.0267,0.0195,0.017,0.0164,0.0135,0.0118,0.012,0.0123,0.0127,0.0123,0.0123,0.0106,0.0114,0.0117,0.0105,0.0115,0.0102,0.0112,0.0103,0.01,0.011,0.0102,0.0103,0.0092,0.0098,0.0091,0.0099,0.0097,0.0092,0.0094,0.0096,0.0099,0.0093,0.0098,0.0099,0.0088,0.0091,0.0082,0.0091,0.0098,0.01,0.0093,0.0083,0.0094,0.0094,0.0085,0.0079,0.0093,0.0085,0.009,0.0087,0.0082,0.0088,0.0082,0.0085,0.0087,0.0085,0.0082,0.009,0.0088,0.0079,0.0084,0.0083,0.0081,0.0082,0.0081,0.0079,0.0082,0.0084,0.0081,0.0081,0.008,0.0077,0.0072,0.0085,0.0073,0.0078,0.0077,0.0078,0.0081,0.0083,0.0077,0.0071,0.009,0.0078,0.0077,0.0076,0.0077,0.0075,0.0078,0.0072,0.0066,0.0072,0.0079,0.0082,0.0077,0.0069,0.0072,0.0076,0.0073,0.007,0.0078,0.0082,0.0071,0.0077,0.0073,0.0072,0.0072,0.008,0.0064,0.0073,0.007,0.007,0.0072,0.007,0.0077,0.0066,0.0077,0.0071,0.0072,0.0072,0.0075,0.0074,0.007,0.0071,0.0068,0.0069,0.0067,0.0074,0.0062,0.0076,0.0066,0.0065,0.0067,0.0066,0.0066,0.0074,0.007,0.0075,0.0068,0.008,0.0071,0.0068,0.0074,0.0072,0.0065,0.0066,0.0065,0.0076,0.0064,0.0067,0.0066,0.0065,0.0066,0.0063,0.0066,0.0058,0.0063,0.007,0.0059,0.0064,0.0064,0.0065,0.0061,0.006,0.0075,0.0055,0.0065,0.007,0.006,0.0063,0.0069,0.0067,0.0069,0.0069,0.0075,0.0069,0.0065,0.0068,0.0067,0.0068,0.0053,0.0065,0.007,0.0065,0.0064,0.0066,0.0063,0.0063,0.0059,0.0065,0.0065,0.0059,0.0063,0.0067,0.0057,0.0067,0.0057,0.0062];

const INTENT_LOSS = [1.3983,0.2757,0.0093,0.0025,0.0015,0.0011,0.0008,0.0006,0.0007,0.0004,0.0003,0.0005,0.0003,0.0003,0.0003,0.0002,0.0002,0.0002,0.0002,0.0002,0.0001,0.0001,0.0002,0.0001,0.0001,0.0001,0.0001,0.0001,0.0001,0.0001];

const CLASSIFIER_LOSS = [0.1597,0.0099,0.0106,0.0424,0.0020,0.0004,0.0003,0.0001,0.0001,0.0000,0.0000,0.0001,0.0001,0.0000,0.0000,0.0000,0.0000,0.0001,0.0001,0.0000];

const CLASS_COUNTS = [
  { label: "Banana", value: 490 },
  { label: "Apple", value: 492 },
  { label: "Orange", value: 479 },
  { label: "Straw.", value: 492 },
  { label: "Pineap.", value: 490 },
  { label: "Lemon", value: 492 },
  { label: "Mango", value: 490 },
  { label: "Kiwi", value: 466 },
];

export default function ModelInsights() {
  return (
    <div className="panel insights">
      <PageHero
        icon="📊"
        title="Model Insights"
        tagline="The real training story - bugs found, fixed, and the numbers to prove it"
        accent="#ff8c42"
      />
      <p className="hint">
        A behind-the-scenes look at how the diffusion model was actually trained - including a
        real bug that was found and fixed along the way, not just a clean success story.
      </p>

      <section className="insight-section">
        <h3>🐛 The Bug: 7 of 8 Fruits Had Zero Training Data</h3>
        <p>
          Early training runs showed something strange: <strong>Apple</strong> learned a clean,
          recognizable shape within 40 epochs, while <strong>Banana</strong> and{" "}
          <strong>Orange</strong> collapsed to solid color blocks and never recovered - no matter
          how many epochs were added.
        </p>
        <p>
          The root cause turned out to be a dataset folder-naming mismatch. The code expected
          folders named <code>"Banana"</code>, <code>"Orange"</code>, etc., but this Fruits-360
          release actually names them <code>"Banana 1"</code>, <code>"Orange 1"</code>, and so
          on - with dozens of near-duplicate variety folders per fruit (<code>Apple 10</code>,{" "}
          <code>Apple Golden 1</code>, <code>Apple Red Delicious 1</code>...). Only{" "}
          <code>"Apple Red 1"</code> happened to match by coincidence, so 7 of the 8 classes
          silently trained on <strong>zero images</strong> the entire time.
        </p>
        <p className="hint">
          Fix: corrected the class-name list to match the dataset's real folder names exactly.
        </p>
      </section>

      <section className="insight-section">
        <h3>📊 Dataset Balance (after the fix)</h3>
        <p>Once the correct folders were linked, all 8 classes turned out to be well-balanced:</p>
        <BarChart data={CLASS_COUNTS} />
      </section>

      <section className="insight-section">
        <h3>⚠️ A Second Bug: Training Divergence</h3>
        <p>
          A later, longer training run produced a completely different failure: every class
          generated solid white images. Investigation traced this to gradient explosion - without
          gradient clipping, a from-scratch DDPM can occasionally diverge partway through a long
          run, and every checkpoint saved after that point is affected.
        </p>
        <p className="hint">
          Fix: added <code>torch.nn.utils.clip_grad_norm_</code> to the training loop, plus a
          NaN/Inf loss check that stops training early with a clear warning instead of silently
          saving broken checkpoints.
        </p>
      </section>

      <section className="insight-section">
        <h3>📉 Diffusion Model Training Loss (200 epochs, 96×96, with the fixes applied)</h3>
        <p className="hint">
          Clean, steady convergence from 0.10 down to ~0.006 - no divergence, no collapse.
        </p>
        <LineChart values={DIFFUSION_LOSS} />
        <div className="insight-stats-row">
          <span>Start: {DIFFUSION_LOSS[0].toFixed(4)}</span>
          <span>End: {DIFFUSION_LOSS[DIFFUSION_LOSS.length - 1].toFixed(4)}</span>
          <span>Min: {Math.min(...DIFFUSION_LOSS).toFixed(4)}</span>
        </div>
      </section>

      <section className="insight-section">
        <h3>📉 Intent Classifier Training Loss (30 epochs)</h3>
        <p className="hint">Reached 100% validation accuracy by epoch 2, held it for the rest of training.</p>
        <LineChart values={INTENT_LOSS} color="var(--accent-bright)" />
      </section>

      <section className="insight-section">
        <h3>📉 Fruit Classifier Training Loss (20 epochs)</h3>
        <p className="hint">
          The small bump around epoch 3-4 is normal optimizer noise - it recovered immediately
          and finished at 100% test accuracy.
        </p>
        <LineChart values={CLASSIFIER_LOSS} color="var(--accent-bright)" />
      </section>

      <section className="insight-section">
        <h3>⚡ Inference Speed</h3>
        <p>
          Generation uses DDIM sampling (Song et al., 2020) instead of the full 1000-step DDPM
          reverse process - a strided subsequence of ~20 steps produces comparable quality at
          roughly <strong>20x the speed</strong>, taking generation from minutes down to seconds
          on CPU alone.
        </p>
      </section>
    </div>
  );
}