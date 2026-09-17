const chart = document.querySelector("#chart");
const sortButton = document.querySelector("#sort-button");
const dialog = document.querySelector("#model-dialog");
let dataset;
let models = [];
let descending = true;
let view = "bars";

const round = (value, places = 1) => Number(value.toFixed(places));

function providerIcon(mark) {
  const icons = {
    deepseek: `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M6 21c3-8 10-12 19-9 3 1 5 3 7 6l4-2c0 5-3 8-8 8-3 6-9 9-16 6-4-2-6-5-6-9Z" fill="currentColor"/><circle cx="23.5" cy="17" r="1.7" fill="#fff"/><path d="M9 24c6 2 12 2 18-1" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`,
    zai: `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 10h23L16 30h16" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="square" stroke-linejoin="bevel"/><circle cx="8" cy="30" r="3" fill="currentColor"/></svg>`,
    kimi: `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="14" fill="currentColor"/><path d="M14 11v18m1-9 11-9m-11 9 12 10" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    openai: `<svg viewBox="0 0 40 40" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="3.3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7a7 7 0 0 1 7 7v13L16 33a7 7 0 0 1-7-12l11-6"/><path d="M31 14a7 7 0 0 1 0 12L20 32 9 26a7 7 0 0 1 0-12l11 6"/><path d="M9 14A7 7 0 0 1 20 8l11 6v12a7 7 0 0 1-11 6V20"/></g></svg>`,
  };
  return icons[mark] || `<span aria-hidden="true">AI</span>`;
}

function calculateScore(model) {
  const values = dataset.method.benchmarkIds.map((id) => model.scores[id]);
  if (values.some((value) => typeof value !== "number")) return null;
  return round(values.reduce((sum, value) => sum + value * 100, 0) / values.length);
}

function measuredCount(model) {
  return dataset.method.benchmarkIds.filter((id) => typeof model.scores[id] === "number").length;
}

// Cost axis. Capability per dollar is a different question from capability, and
// the one this fleet actually answers with: the blended rate is Artificial
// Analysis's 7:2:1 cache-hit/input/output ratio, and value is score per $/M.
const money = (value) => `$${value.toFixed(2)}`;

function blended(model) {
  const price = model.pricing && model.pricing.blended7To2To1;
  return typeof price === "number" && price > 0 ? price : null;
}

function valueOf(model) {
  const price = blended(model);
  if (price === null || typeof model.score !== "number") return null;
  return model.score / price;
}

function render() {
  // Ranked first. A model whose basket cannot be completed is still shown, with
  // its score withheld rather than the whole page refused: the method says the
  // aggregate is withheld when a value is missing, and until now the code threw
  // instead of doing that.
  const byValue = view === "value";
  const ranked = models.filter((model) => typeof model.score === "number");
  const unranked = models.filter((model) => typeof model.score !== "number");
  const priced = ranked.filter((model) => !byValue || valueOf(model) !== null);
  const unpriced = ranked.filter((model) => byValue && valueOf(model) === null);
  const order = byValue
    ? (a, b) => (descending ? valueOf(b) - valueOf(a) : valueOf(a) - valueOf(b))
    : (a, b) => (descending ? b.score - a.score : a.score - b.score);
  const ordered = [
    ...priced.sort(order),
    ...unpriced,
    ...unranked.sort((a, b) => a.name.localeCompare(b.name)),
  ];
  const total = dataset.method.benchmarkIds.length;
  const maxValue = Math.max(1, ...models.map((model) => valueOf(model) || 0));

  chart.innerHTML = ordered.map((model, index) => {
    const scored = typeof model.score === "number";
    const price = blended(model);
    const value = valueOf(model);
    const got = measuredCount(model);
    const rank = scored ? String(index + 1).padStart(2, "0") : "\u2014";
    const width = byValue
      ? (value ? (value / maxValue) * 100 : 0)
      : (scored ? model.score : 0);
    const bar = `data-width="${width}%"`;
    const score = scored ? model.score.toFixed(1) : "\u2014";
    const note = !scored
      ? `${got} of ${total} evals<br>not ranked`
      : byValue
        ? `${value ? Math.round(value) + " pts per $" : "no price listed"}<br>${price ? money(price) + "/M blended" : ""}`
        : `mean · ${total} evals<br>${price ? money(price) + "/M blended" : "price not listed"}`;
    return `
    <div class="chart-row${scored ? "" : " is-unranked"}" style="--model-color:${model.color}" role="listitem" tabindex="0" data-model="${model.id}" aria-label="${model.name}, ${scored ? "fleet score " + model.score : "not ranked"}">
      <div class="model-label">
        <span class="rank">${rank}</span>
        <span class="provider-mark">${providerIcon(model.mark)}</span>
        <span class="model-name">${model.name}<small class="provider">${model.provider}</small></span>
      </div>
      <div class="bar-track"><div class="bar" ${bar}></div></div>
      <div class="score-wrap"><div class="score">${score}</div><small>${note}</small></div>
    </div>`;
  }).join("");

  // The axis has to mean something in each view, so the scale follows the view.
  const scale = document.querySelector("#scale");
  if (scale) {
    scale.innerHTML = byValue
      ? [0, 1, 2, 3, 4, 5].map((step) => `<span>${Math.round((maxValue * step) / 5)}</span>`).join("")
      : [0, 20, 40, 60, 80, 100].map((tick) => `<span>${tick}</span>`).join("");
  }
  const hint = document.querySelector("#chart-hint");
  if (hint) {
    hint.textContent = byValue
      ? "Value is the fleet score divided by the blended price per million tokens. Same measurements, priced."
      : "Select any model to inspect its benchmark receipt.";
  }

  requestAnimationFrame(() => {
    document.querySelectorAll(".bar").forEach((bar) => { bar.style.width = bar.dataset.width; });
  });
}

function renderSummary() {
  const ranked = models.filter((model) => typeof model.score === "number");
  if (!ranked.length) return;
  const values = ranked.map((model) => model.score);
  const leader = [...ranked].sort((a, b) => b.score - a.score)[0];
  document.querySelector("#fleet-average").textContent = round(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
  document.querySelector("#score-spread").textContent = `${round(Math.max(...values) - Math.min(...values)).toFixed(1)} points`;
  document.querySelector("#fleet-leader").textContent = `${leader.name} (${leader.score.toFixed(1)})`;
}

function openModel(id) {
  const model = models.find((item) => item.id === id);
  if (!model) return;
  dialog.style.setProperty("--model-color", model.color);
  document.querySelector("#dialog-provider").innerHTML = `<span class="dialog-mark">${providerIcon(model.mark)}</span><span>${model.provider}<small>receipt ${dataset.datasetVersion}</small></span>`;
  document.querySelector("#dialog-title").textContent = model.fullName;
  const scored = typeof model.score === "number";
  document.querySelector("#dialog-score").textContent = scored ? model.score.toFixed(1) : "Not ranked";
  document.querySelector("#dialog-grid").innerHTML = `
    <div><span>Aggregation</span><strong>Equal mean</strong></div>
    <div><span>Weight / eval</span><strong>20%</strong></div>
    <div><span>Blended price</span><strong>${blended(model) ? money(blended(model)) + "/M" : "not listed"}</strong></div>
    <div><span>Cache-hit price</span><strong>${model.pricing && typeof model.pricing.cacheHit === "number" ? money(model.pricing.cacheHit) + "/M" : "not listed"}</strong></div>
    <div><span>Value</span><strong>${valueOf(model) ? Math.round(valueOf(model)) + " pts/$" : "withheld"}</strong></div>
    <div><span>Snapshot</span><strong>${model.snapshotAt}</strong></div>
  `;
  document.querySelector("#dialog-receipt").innerHTML = `
    <div class="receipt-head"><span>Benchmark</span><span>Raw</span><span>Normalized</span></div>
    ${dataset.method.benchmarkIds.map((benchmarkId) => {
      const benchmark = dataset.benchmarks[benchmarkId];
      const raw = model.scores[benchmarkId];
      const trials = benchmark.tasks && benchmark.repeatsPerTask
        ? benchmark.tasks * benchmark.repeatsPerTask
        : null;
      const missing = typeof raw !== "number";
      const evidence = missing
        ? "not measured by Artificial Analysis for this model"
        : trials
          ? `${Math.round(raw * trials)}/${trials} passes · ${benchmark.tasks} tasks × ${benchmark.repeatsPerTask}`
          : benchmark.domain;
      return `<a href="${benchmark.source}" target="_blank" rel="noreferrer"${missing ? ' class="is-missing"' : ""}>
        <span><strong>${benchmark.name}</strong><small>${evidence}</small></span>
        <span>${missing ? "\u2014" : raw.toFixed(4)}</span>
        <span>${missing ? "\u2014" : (raw * 100).toFixed(1)}</span>
      </a>`;
    }).join("")}
    <div class="receipt-total"><span>Arithmetic mean</span><span>${typeof model.score === "number" ? model.score.toFixed(1) : "withheld"}</span></div>
    ${model.unmeasured ? `<p class="receipt-note">${model.unmeasured}</p>` : ""}
  `;
  document.querySelector("#dialog-note").innerHTML = `Source snapshot: <a href="${model.source}" target="_blank" rel="noreferrer">Artificial Analysis</a>, retrieved ${dataset.retrievedAt}. Formula: Σ(normalized scores × 0.20). Prices are Artificial Analysis list rates per 1M tokens, blended 7 cache-hit : 2 input : 1 output, and the cache-hit rate is the one this fleet mostly pays.`;
  dialog.showModal();
}

chart.addEventListener("click", (event) => {
  const row = event.target.closest(".chart-row");
  if (row) openModel(row.dataset.model);
});
chart.addEventListener("keydown", (event) => {
  if ((event.key === "Enter" || event.key === " ") && event.target.matches(".chart-row")) {
    event.preventDefault();
    openModel(event.target.dataset.model);
  }
});

function labelSort() {
  sortButton.textContent = `${view === "value" ? "Value" : "Score"} ${descending ? "↓" : "↑"}`;
}

sortButton.addEventListener("click", () => {
  descending = !descending;
  labelSort();
  render();
});

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-view]").forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
    view = button.dataset.view;
    chart.classList.toggle("dots", view === "dots");
    labelSort();
    render();
  });
});

document.querySelector("#theme-toggle").addEventListener("click", () => {
  document.documentElement.classList.toggle("dark");
});
document.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });

async function initialize() {
  try {
    // no-store on purpose. A cached dataset next to freshly deployed code is the
    // worst possible state: the page shows new labels over old numbers and looks
    // like the update failed. The file is a few KB and only changes when we
    // commit it, so freshness costs nothing.
    const response = await fetch("data/benchmarks.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    dataset = await response.json();
    models = dataset.models.map((model) => ({ ...model, ...dataset.providers[model.provider], score: calculateScore(model) }));
    const stamp = document.querySelector("#dataset-stamp");
    if (stamp) stamp.textContent = `dataset ${dataset.datasetVersion}`;
    renderSummary();
    render();
  } catch (error) {
    chart.innerHTML = `<p class="data-error">Benchmark data could not be loaded. Run this site through the local server described in README.md.<br><small>${error.message}</small></p>`;
  }
}

initialize();
