# M4Y0U Model Index

A dependency-free, local interactive dashboard for five frequently used AI models.

## Run locally

```bash
cd /home/m4/Work/model-index
python -m http.server 8080
```

Then open <http://localhost:8080>.

The local server is required because browsers block `fetch()` from `file://` pages. Edit `data/benchmarks.json` to update source results or model metadata; the JavaScript calculates every aggregate at load time.

## Data note

The M4Y0U Fleet Score v1 is the unweighted arithmetic mean of five evaluations: Terminal-Bench v2.1, SciCode, Humanity's Last Exam, GPQA Diamond, and AA-LCR. Source proportions are multiplied by 100, then each receives 20% weight. An aggregate is withheld if any value is missing.

The underlying results are a manually maintained, point-in-time snapshot of independently measured Artificial Analysis results, retrieved on 2026-08-23. Each model and benchmark has its source URL in the JSON. This project is not affiliated with Artificial Analysis.

**Suite change, September 2026.** Artificial Analysis moved to Intelligence Index v4.3, which replaced Terminal-Bench 2.1 with Terminal-Bench 4.0 and removed GPQA Diamond entirely. Two of this index's five evaluations therefore stop being measured for newly released models. The basket is deliberately left unchanged, because changing it would break comparability with every existing row; the consequence is that a model released after the change shows its measured evaluations with the aggregate **withheld**, and is displayed unranked rather than being given a number it has not earned. This is visible rather than silent: the unranked row says how many of five it has, and the receipt lists the missing evaluations as not measured.

Terminal-Bench v2.1 contains 89 tasks and is run three times per task. Its scores are therefore discrete pass counts over 267 trials; separate models can legitimately have identical values. The receipt displays the pass-count denominator so ties are explicit rather than hidden behind long decimal values.
