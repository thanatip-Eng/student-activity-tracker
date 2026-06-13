"""Descriptive analysis + paper figures.

Run after export_firestore.py. Outputs CSVs and PNG figs to analysis/out/.

Usage:
    python 01_descriptives.py
"""

from __future__ import annotations

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns

from competency import (
    DOMAINS,
    SKILL_CODES,
    activity_skill_matrix,
    domain_scores,
    student_competency,
)

HERE = Path(__file__).parent
DATA = HERE / "data"
OUT = HERE / "out"
OUT.mkdir(exist_ok=True)

sns.set_theme(style="whitegrid", context="paper", font_scale=1.0)


def load():
    files = {
        "students": DATA / "students.csv",
        "activities": DATA / "activities.csv",
        "participation": DATA / "participation.csv",
        "submissions": DATA / "submissions.csv",
    }
    out = {}
    for name, path in files.items():
        out[name] = pd.read_csv(path) if path.exists() else pd.DataFrame()
        print(f"  {name}: {len(out[name])} rows")
    return out


def t1_summary(data: dict[str, pd.DataFrame]) -> pd.DataFrame:
    rows = [
        ["N students", len(data["students"])],
        ["N activities", len(data["activities"])],
        ["N participation records", len(data["participation"])],
        ["N submissions", len(data["submissions"])],
    ]
    if "status" in data["participation"].columns:
        rows.append(
            ["N approved participation", int(data["participation"]["status"].str.lower().eq("approved").sum())]
        )
    df = pd.DataFrame(rows, columns=["metric", "value"])
    df.to_csv(OUT / "T1_dataset_summary.csv", index=False)
    print("  -> T1_dataset_summary.csv")
    return df


def t2_activity_skill_heatmap(activities: pd.DataFrame) -> pd.DataFrame:
    if activities.empty:
        return pd.DataFrame()
    M = activity_skill_matrix(activities)
    M.to_csv(OUT / "T2_activity_skill_matrix.csv")

    # top-15 activities by total skill coverage
    top = M.assign(_total=M.sum(axis=1)).nlargest(15, "_total").drop(columns="_total")
    top.index = top.index.astype(str).str[:8]
    fig, ax = plt.subplots(figsize=(10, 6))
    sns.heatmap(top, annot=True, fmt="d", cmap="YlGnBu", cbar_kws={"label": "Declared level"}, ax=ax)
    ax.set_xlabel("Skill code")
    ax.set_ylabel("Activity (id prefix)")
    ax.set_title("Top-15 activities x 18-skill coverage")
    fig.tight_layout()
    fig.savefig(OUT / "F3_activity_skill_heatmap.png", dpi=200)
    plt.close(fig)
    print("  -> F3_activity_skill_heatmap.png")
    return M


def student_vectors(data: dict[str, pd.DataFrame], activity_matrix: pd.DataFrame) -> pd.DataFrame:
    S = student_competency(data["participation"], activity_matrix, approved_only=True)
    if S.empty:
        print("  (no student vectors - check participation date range / activityId join)")
        return S
    S.to_csv(OUT / "T3_student_skill_matrix.csv")
    print(f"  -> T3_student_skill_matrix.csv ({len(S)} students)")
    return S


def f4_skill_distribution(student_matrix: pd.DataFrame):
    if student_matrix.empty:
        return
    long = student_matrix.melt(var_name="skill", value_name="level")
    fig, ax = plt.subplots(figsize=(10, 5))
    sns.boxplot(data=long, x="skill", y="level", order=SKILL_CODES, ax=ax, color="#667eea")
    ax.set_ylim(-0.2, 4.2)
    ax.set_title("Per-student level distribution by skill")
    ax.set_xlabel("Skill code")
    ax.set_ylabel("Achieved level (max across approved activities)")
    fig.tight_layout()
    fig.savefig(OUT / "F4_skill_level_distribution.png", dpi=200)
    plt.close(fig)
    print("  -> F4_skill_level_distribution.png")


def f5_domain_radar(student_matrix: pd.DataFrame):
    if student_matrix.empty:
        return
    D = domain_scores(student_matrix)
    means = D.mean()
    stds = D.std()

    domains = list(DOMAINS.keys())
    angles = np.linspace(0, 2 * np.pi, len(domains), endpoint=False).tolist()
    angles += angles[:1]
    values = means.tolist() + means.tolist()[:1]
    upper = (means + stds).tolist() + (means + stds).tolist()[:1]
    lower = (means - stds).clip(lower=0).tolist() + (means - stds).clip(lower=0).tolist()[:1]

    fig, ax = plt.subplots(figsize=(6, 6), subplot_kw=dict(polar=True))
    ax.plot(angles, values, color="#667eea", linewidth=2, label="Mean")
    ax.fill_between(angles, lower, upper, color="#667eea", alpha=0.15, label="±1 SD")
    ax.set_xticks(angles[:-1])
    ax.set_xticklabels([d.split("_", 1)[1] for d in domains], fontsize=9)
    ax.set_yticks([1, 2, 3, 4])
    ax.set_ylim(0, 4)
    ax.set_title("Mean domain competency (radar)")
    ax.legend(loc="upper right", bbox_to_anchor=(1.25, 1.05), fontsize=8)
    fig.tight_layout()
    fig.savefig(OUT / "F5_domain_radar.png", dpi=200)
    plt.close(fig)
    print("  -> F5_domain_radar.png")
    D.describe().to_csv(OUT / "T4_domain_summary.csv")


def f6_participation_timeseries(participation: pd.DataFrame):
    if participation.empty:
        return
    date_col = next((c for c in ("date", "approvedAt", "createdAt") if c in participation.columns), None)
    if not date_col:
        return
    p = participation.copy()
    p[date_col] = pd.to_datetime(p[date_col], errors="coerce", utc=True)
    p = p.dropna(subset=[date_col])
    if p.empty:
        return
    monthly = p.set_index(date_col).resample("MS").size()
    labels = [d.strftime("%b %y") for d in monthly.index]
    fig, ax = plt.subplots(figsize=(8, 3.5))
    ax.bar(range(len(monthly)), monthly.values, color="#667eea")
    ax.set_xticks(range(len(monthly)))
    ax.set_xticklabels(labels, rotation=45, ha="right")
    ax.set_ylabel("Participation records")
    ax.set_title("Monthly participation volume (period: Jun 2025 – Apr 2026)")
    fig.tight_layout()
    fig.savefig(OUT / "F6_participation_timeseries.png", dpi=200)
    plt.close(fig)
    print("  -> F6_participation_timeseries.png")


def f7_correlation_matrix(student_matrix: pd.DataFrame):
    if student_matrix.empty or len(student_matrix) < 5:
        return
    corr = student_matrix[SKILL_CODES].corr()
    corr.to_csv(OUT / "T5_skill_correlation.csv")
    fig, ax = plt.subplots(figsize=(7, 6))
    sns.heatmap(corr, cmap="RdBu_r", center=0, vmin=-1, vmax=1, square=True, ax=ax)
    ax.set_title("Inter-skill correlation (per student levels)")
    fig.tight_layout()
    fig.savefig(OUT / "F7_skill_correlation.png", dpi=200)
    plt.close(fig)
    print("  -> F7_skill_correlation.png")


def main():
    print("Loading CSVs ...")
    data = load()
    print("\nT1 summary ...")
    t1_summary(data)

    print("\nActivity x skill matrix + heatmap ...")
    activity_matrix = t2_activity_skill_heatmap(data["activities"])

    print("\nStudent competency vectors ...")
    student_matrix = student_vectors(data, activity_matrix) if not activity_matrix.empty else pd.DataFrame()

    print("\nSkill distribution + radar + correlation ...")
    f4_skill_distribution(student_matrix)
    f5_domain_radar(student_matrix)
    f7_correlation_matrix(student_matrix)

    print("\nParticipation time series ...")
    f6_participation_timeseries(data["participation"])

    print(f"\nAll outputs at {OUT}")


if __name__ == "__main__":
    main()
