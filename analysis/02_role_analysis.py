"""Role-aware analysis: split each activity by participant / staff / organizer
and re-compute student competency vectors per role.

Faculty rule under test: each student must reach level >= 3 on at least
3 of the 18 skills.

Run after export_firestore.py.

Outputs to analysis/out/role/:
    T_role_counts.csv
    T_multirole_activities.csv
    T_role_skill_means.csv         (per role: mean level per skill)
    T_compliance_overall.csv       (>= 3 skills at level >= 3)
    T_compliance_by_topRole.csv
    F_role_radar.png
    F_compliance_bar.png
    F_skills_meeting_threshold.png
"""

from __future__ import annotations

from pathlib import Path

import matplotlib.pyplot as plt
import matplotlib as mpl
from matplotlib import font_manager
import numpy as np
import pandas as pd
import seaborn as sns

from competency import (
    DOMAINS,
    ROLES,
    SKILL_CODES,
    activity_skill_matrix,
    domain_scores,
    parse_role,
)

HERE = Path(__file__).parent
DATA = HERE / "data"
OUT = HERE / "out" / "role"
OUT.mkdir(parents=True, exist_ok=True)


def _pick_thai_font() -> str:
    candidates = [
        "Sarabun", "TH Sarabun New", "Noto Sans Thai", "Noto Sans Thai Looped",
        "Thonburi", "Ayuthaya", "Sathu", "Silom", "Krungthep",
        "Tahoma", "Lucida Grande",
    ]
    installed = {f.name for f in font_manager.fontManager.ttflist}
    for name in candidates:
        if name in installed:
            return name
    return "DejaVu Sans"


THAI_FONT = _pick_thai_font()
mpl.rcParams["font.family"] = [THAI_FONT, "DejaVu Sans"]
mpl.rcParams["axes.unicode_minus"] = False
sns.set_theme(style="whitegrid", context="paper", font_scale=1.0, font=THAI_FONT)
print(f"[font] using '{THAI_FONT}'")


def load():
    activities = pd.read_csv(DATA / "activities.csv")
    participation = pd.read_csv(DATA / "participation.csv")
    return activities, participation


def tag_role(df: pd.DataFrame, name_col: str) -> pd.DataFrame:
    out = df.copy()
    parsed = out[name_col].fillna("").astype(str).map(parse_role)
    out["base_name"] = parsed.map(lambda x: x[0])
    out["role"] = parsed.map(lambda x: x[1])
    return out


def role_counts_table(activities: pd.DataFrame) -> pd.DataFrame:
    counts = activities["role"].value_counts(dropna=False).rename_axis("role").reset_index(name="n_activities")
    counts.to_csv(OUT / "T_role_counts.csv", index=False)
    print(f"  -> T_role_counts.csv\n{counts.to_string(index=False)}")
    return counts


def multirole_table(activities: pd.DataFrame) -> pd.DataFrame:
    """Activities (by base_name) that exist in >=2 distinct roles."""
    by_base = activities.groupby("base_name")["role"].agg(lambda s: sorted(set(s)))
    multi = by_base[by_base.map(len) >= 2]
    rows = []
    for base, roles in multi.items():
        rows.append({"base_name": base, "n_roles": len(roles), "roles": ", ".join(roles)})
    df = pd.DataFrame(rows).sort_values(["n_roles", "base_name"], ascending=[False, True])
    df.to_csv(OUT / "T_multirole_activities.csv", index=False)
    print(f"  -> T_multirole_activities.csv ({len(df)} base activities with >=2 roles)")
    return df


def per_role_student_matrix(activities: pd.DataFrame, participation: pd.DataFrame) -> dict[str, pd.DataFrame]:
    """For each role, compute student x 18-skill MAX matrix from participation."""
    name_to_id = dict(zip(activities["name"].astype(str).str.strip(), activities["_id"].astype(str)))
    activity_matrix = activity_skill_matrix(activities)

    p = participation.copy()
    if "status" in p.columns:
        p = p[p["status"].astype(str).str.lower().eq("approved")]
    p["activityId_resolved"] = p["activityId"].astype(str)
    direct_hit = p["activityId_resolved"].isin(set(activity_matrix.index.astype(str)))
    print(f"  participation rows: {len(p)}  | direct id hits: {direct_hit.sum()}")

    # Fall back to name-based mapping for the rest
    if "activityName" in p.columns:
        mapped = p["activityName"].astype(str).str.strip().map(name_to_id)
        p["activityId_resolved"] = p["activityId_resolved"].where(direct_hit, mapped)

    resolved = p["activityId_resolved"].notna().sum()
    print(f"  participation resolved (id or name): {resolved} / {len(p)}")

    # Attach role from activity table to each participation row.
    # Activities without a role marker are treated as participant by default.
    id_to_role = dict(zip(activities["_id"].astype(str), activities["role"]))
    p["role"] = p["activityId_resolved"].astype(str).map(id_to_role).fillna("participant")

    out: dict[str, pd.DataFrame] = {}
    for r in ROLES:
        sub = p[p["role"].eq(r)]
        if sub.empty or "sid_hash" not in sub.columns:
            continue
        merged = sub.merge(
            activity_matrix.reset_index().rename(columns={"_id": "activityId_resolved"}),
            on="activityId_resolved",
            how="inner",
        )
        if merged.empty:
            continue
        mat = merged.groupby("sid_hash")[SKILL_CODES].max().fillna(0).astype(int)
        out[r] = mat
        print(f"  role={r}: {len(mat)} students, {len(merged)} records")
    return out


def role_skill_means(role_matrices: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """Per-role mean level for each of 18 skills."""
    rows = {r: m[SKILL_CODES].mean() for r, m in role_matrices.items()}
    df = pd.DataFrame(rows).T
    df.index.name = "role"
    df.to_csv(OUT / "T_role_skill_means.csv")
    print(f"  -> T_role_skill_means.csv")
    return df


def f_role_radar(role_means: pd.DataFrame):
    """Radar of mean domain-level score per role."""
    if role_means.empty:
        return
    domain_means = pd.DataFrame(index=role_means.index)
    for domain, codes in DOMAINS.items():
        cols = [c for c in codes if c in role_means.columns]
        # mean of the sub-criteria means (NOT max here, since this is a population mean)
        domain_means[domain] = role_means[cols].mean(axis=1) if cols else 0

    domains = list(DOMAINS.keys())
    labels = [d.split("_", 1)[1] for d in domains]
    angles = np.linspace(0, 2 * np.pi, len(domains), endpoint=False).tolist()
    angles += angles[:1]

    fig, ax = plt.subplots(figsize=(7, 6), subplot_kw=dict(polar=True))
    palette = {"participant": "#667eea", "staff": "#27ae60", "organizer": "#e67e22"}
    for role in domain_means.index:
        vals = domain_means.loc[role, domains].tolist() + [domain_means.loc[role, domains[0]]]
        color = palette.get(role, "#888")
        ax.plot(angles, vals, label=role, color=color, linewidth=2)
        ax.fill(angles, vals, alpha=0.10, color=color)
    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(labels, fontsize=9)
    ax.set_ylim(0, 4)
    ax.set_yticks([1, 2, 3, 4])
    ax.set_title("Mean per-skill level by role (averaged within domain)")
    ax.legend(loc="upper right", bbox_to_anchor=(1.30, 1.05), fontsize=8)
    fig.tight_layout()
    fig.savefig(OUT / "F_role_radar.png", dpi=200)
    plt.close(fig)
    print("  -> F_role_radar.png")


def compliance(role_matrices: dict[str, pd.DataFrame], min_skills: int = 3, min_level: int = 3) -> pd.DataFrame:
    """For each student (max across all roles), count skills meeting threshold."""
    if not role_matrices:
        return pd.DataFrame()

    # Combine roles: per-student MAX across role-specific matrices
    combined = pd.concat(list(role_matrices.values())).groupby(level=0)[SKILL_CODES].max()
    n_meeting = (combined >= min_level).sum(axis=1)
    flag = n_meeting >= min_skills

    summary = pd.DataFrame({
        "n_students": [len(combined)],
        "n_compliant": [int(flag.sum())],
        "pct_compliant": [round(flag.mean() * 100, 2)],
        "rule": [f">= {min_skills} skills at level >= {min_level}"],
    })
    summary.to_csv(OUT / "T_compliance_overall.csv", index=False)
    print(f"  -> T_compliance_overall.csv: {int(flag.sum())} / {len(combined)} ({summary['pct_compliant'].iat[0]}%)")

    # Distribution of skills meeting threshold
    dist = n_meeting.value_counts().sort_index().rename_axis("n_skills_at_threshold").reset_index(name="n_students")
    dist["pct"] = (dist["n_students"] / dist["n_students"].sum() * 100).round(2)
    dist.to_csv(OUT / "T_compliance_distribution.csv", index=False)

    # Plot
    fig, ax = plt.subplots(figsize=(8, 4))
    ax.bar(dist["n_skills_at_threshold"], dist["n_students"], color="#667eea")
    ax.axvline(min_skills - 0.5, color="#e74c3c", linestyle="--", label=f"threshold = {min_skills}")
    ax.set_xlabel(f"# skills at level >= {min_level}")
    ax.set_ylabel("# students")
    ax.set_title(f"Compliance distribution (rule: >={min_skills} skills at level >={min_level})")
    ax.legend()
    fig.tight_layout()
    fig.savefig(OUT / "F_compliance_bar.png", dpi=200)
    plt.close(fig)
    print("  -> F_compliance_bar.png")

    # Also: % students meeting level threshold per skill
    pct_per_skill = (combined >= min_level).mean() * 100
    pct_per_skill = pct_per_skill.reindex(SKILL_CODES)
    fig, ax = plt.subplots(figsize=(10, 4))
    ax.bar(range(len(SKILL_CODES)), pct_per_skill.values, color="#27ae60")
    ax.set_xticks(range(len(SKILL_CODES)))
    ax.set_xticklabels(SKILL_CODES, rotation=45, ha="right")
    ax.set_ylabel(f"% students at level >= {min_level}")
    ax.set_title(f"Per-skill attainment (level >= {min_level})")
    ax.set_ylim(0, 100)
    fig.tight_layout()
    fig.savefig(OUT / "F_skills_meeting_threshold.png", dpi=200)
    plt.close(fig)
    print("  -> F_skills_meeting_threshold.png")
    pct_per_skill.rename("pct_students_at_or_above_level").to_csv(OUT / "T_per_skill_attainment.csv")

    return summary


def compliance_by_top_role(role_matrices: dict[str, pd.DataFrame], min_skills: int = 3, min_level: int = 3) -> pd.DataFrame:
    """Compliance segmented by the role from which the student got most of their levels."""
    if not role_matrices:
        return pd.DataFrame()
    # tag each student with the role that gives them the most non-zero skills
    role_skill_counts = {r: (m > 0).sum(axis=1) for r, m in role_matrices.items()}
    counts_df = pd.DataFrame(role_skill_counts).fillna(0)
    top_role = counts_df.idxmax(axis=1)

    combined = pd.concat(list(role_matrices.values())).groupby(level=0)[SKILL_CODES].max()
    combined = combined.loc[top_role.index]
    n_meeting = (combined >= min_level).sum(axis=1)
    flag = n_meeting >= min_skills

    df = pd.DataFrame({"top_role": top_role, "compliant": flag})
    out = df.groupby("top_role")["compliant"].agg(["count", "sum"]).rename(columns={"count": "n_students", "sum": "n_compliant"})
    out["pct_compliant"] = (out["n_compliant"] / out["n_students"] * 100).round(2)
    out.to_csv(OUT / "T_compliance_by_topRole.csv")
    print(f"  -> T_compliance_by_topRole.csv\n{out}")
    return out


def main():
    print("Loading ...")
    activities, participation = load()
    print(f"  activities: {len(activities)}, participation: {len(participation)}")

    print("\nTagging roles ...")
    activities = tag_role(activities, "name")

    print("\nRole counts ...")
    role_counts_table(activities)

    print("\nMulti-role activities (>=2 roles per base name) ...")
    multirole_table(activities)

    print("\nPer-role student vectors ...")
    role_matrices = per_role_student_matrix(activities, participation)

    print("\nPer-role skill means + radar ...")
    if role_matrices:
        means = role_skill_means(role_matrices)
        f_role_radar(means)

    print("\nCompliance: >=3 skills at level >=3 (overall + by top role) ...")
    compliance(role_matrices, min_skills=3, min_level=3)
    compliance_by_top_role(role_matrices, min_skills=3, min_level=3)

    print(f"\nDone -> {OUT}")


if __name__ == "__main__":
    main()
