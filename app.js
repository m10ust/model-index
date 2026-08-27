const chart = document.querySelector("#chart");
const sortButton = document.querySelector("#sort-button");
const dialog = document.querySelector("#model-dialog");
let dataset;
let models = [];
let descending = true;

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

function render() {
  const ordered = [...models].sort((a, b) => descending ? b.score - a.score : a.score - b.score);
  chart.innerHTML = ordered.map((model, index) => `
    <div class="chart-row" style="--model-color:${model.color}" role="listitem" tabindex="0" data-model="${model.id}" aria-label="${model.name}, fleet score ${model.score}">
      <div class="model-label">
        <span class="rank">${String(index + 1).padStart(2, "0")}</span>
        <span class="provider-mark">${providerIcon(model.mark)}</span>
        <span class="model-name">${model.name}<small class="provider">${model.provider}</small></span>
      </div>
      <div class="bar-track"><div class="bar" data-width="${model.score}%"></div></div>
      <div class="score-wrap"><div class="score">${model.score.toFixed(1)}</div><small>mean · 5 evals<br>snapshot ${model.snapshotAt}</small></div>
    </div>
  `).join("");

  requestAnimationFrame(() => {
    document.querySelectorAll(".bar").forEach((bar) => { bar.style.width = bar.dataset.width; });
  });
}

function renderSummary() {
  const values = models.map((model) => model.score);
  const leader = [...models].sort((a, b) => b.score - a.score)[0];
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
  document.querySelector("#dialog-score").textContent = model.score.toFixed(1);
  document.querySelector("#dialog-grid").innerHTML = `
    <div><span>Aggregation</span><strong>Equal mean</strong></div>
    <div><span>Weight / eval</span><strong>20%</strong></div>
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
      const evidence = trials
        ? `${Math.round(raw * trials)}/${trials} passes · ${benchmark.tasks} tasks × ${benchmark.repeatsPerTask}`
        : benchmark.domain;
      return `<a href="${benchmark.source}" target="_blank" rel="noreferrer">
        <span><strong>${benchmark.name}</strong><small>${evidence}</small></span>
        <span>${raw.toFixed(4)}</span>
        <span>${(raw * 100).toFixed(1)}</span>
      </a>`;
    }).join("")}
    <div class="receipt-total"><span>Arithmetic mean</span><span>${model.score.toFixed(1)}</span></div>
  `;
  document.querySelector("#dialog-note").innerHTML = `Source snapshot: <a href="${model.source}" target="_blank" rel="noreferrer">Artificial Analysis</a>, retrieved ${dataset.retrievedAt}. Formula: Σ(normalized scores × 0.20).`;
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

sortButton.addEventListener("click", () => {
  descending = !descending;
  sortButton.textContent = descending ? "Score ↓" : "Score ↑";
  render();
});

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-view]").forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
    chart.classList.toggle("dots", button.dataset.view === "dots");
  });
});

document.querySelector("#theme-toggle").addEventListener("click", () => {
  document.documentElement.classList.toggle("dark");
});
document.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });

async function initialize() {
  try {
    const response = await fetch("data/benchmarks.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    dataset = await response.json();
    models = dataset.models.map((model) => ({ ...model, ...dataset.providers[model.provider], score: calculateScore(model) }));
    if (models.some((model) => model.score === null)) throw new Error("Incomplete benchmark basket");
    renderSummary();
    render();
  } catch (error) {
    chart.innerHTML = `<p class="data-error">Benchmark data could not be loaded. Run this site through the local server described in README.md.<br><small>${error.message}</small></p>`;
  }
}

initialize();
