"""Shared helpers: parse skill payloads + compute per-student competency vectors."""

from __future__ import annotations

import ast
import json
import re
from typing import Iterable

import numpy as np
import pandas as pd

# Role normalisation. Activities are stored as separate docs per role with the
# role appended in parentheses, e.g. "X (ผู้เข้าร่วม)", "X (Staff)", "X (ผู้จัดงาน)".
ROLE_PARTICIPANT = "participant"
ROLE_STAFF = "staff"
ROLE_ORGANIZER = "organizer"
ROLES = [ROLE_PARTICIPANT, ROLE_STAFF, ROLE_ORGANIZER]

_ROLE_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"ทีม\s*ผู้\s*จัด|ผู้\s*จัด\s*งาน|ผู้\s*จัด\s*กิจกรรม|ผู้\s*จัด"), ROLE_ORGANIZER),
    (re.compile(r"\borganiz(?:er|ers)\b", re.I), ROLE_ORGANIZER),
    (re.compile(r"ผู้\s*เข้\s*า\s*ร่\s*วม"), ROLE_PARTICIPANT),
    (re.compile(r"\bparticipant\b", re.I), ROLE_PARTICIPANT),
    (re.compile(r"\bstaff\b", re.I), ROLE_STAFF),
    (re.compile(r"\bกรรมการ\b"), ROLE_STAFF),
]

_PAREN_TAIL = re.compile(r"\s*[\(\[]([^\(\)\[\]]+)[\)\]]\s*$")


def parse_role(name: str | None) -> tuple[str, str]:
    """Return (base_name_stripped, role) for an activity title.

    role is one of {participant, staff, organizer}; defaults to participant
    when no marker found. The base name strips a trailing parenthesised role
    tag when present.
    """
    if not isinstance(name, str):
        return "", ROLE_PARTICIPANT
    n = name.strip()
    role: str | None = None

    m = _PAREN_TAIL.search(n)
    if m:
        tail = m.group(1)
        for pat, label in _ROLE_PATTERNS:
            if pat.search(tail):
                role = label
                n = n[: m.start()].strip()
                break

    if role is None:
        for pat, label in _ROLE_PATTERNS:
            if pat.search(n):
                role = label
                break

    return n, role or ROLE_PARTICIPANT

# 6 domains x 3 sub-criteria = 18 skills
DOMAINS: dict[str, list[str]] = {
    "D1_Knowledge": ["1.1", "1.2", "1.3"],
    "D2_Skill": ["2.1", "2.2", "2.3"],
    "D3_Attitude": ["3.1", "3.2", "3.3"],
    "D4_Ethics": ["4.1", "4.2", "4.3"],
    "D5_Leadership": ["5.1", "5.2", "5.3"],
    "D6_Innovation": ["6.1", "6.2", "6.3"],
}
SKILL_CODES: list[str] = [code for codes in DOMAINS.values() for code in codes]


def _parse_obj(value):
    if isinstance(value, (list, dict)):
        return value
    if isinstance(value, str):
        for parser in (json.loads, ast.literal_eval):
            try:
                return parser(value)
            except Exception:
                continue
    return None


def extract_skill_levels(row: pd.Series) -> dict[str, int]:
    """Return {code: level} for one activity / submission row.

    Supports three storage formats seen in the app:
      - skills array: [{"code": "1.1", "level": 2}, ...]
      - flat fields:  criteria_1_1 = 2
      - direct keys:  "1.1": 2
    """
    out: dict[str, int] = {}

    skills_obj = _parse_obj(row.get("skills"))
    if isinstance(skills_obj, list):
        for item in skills_obj:
            if isinstance(item, dict):
                code = str(item.get("code") or item.get("id") or "").strip()
                lvl = item.get("level")
                if code in SKILL_CODES and isinstance(lvl, (int, float)) and lvl > 0:
                    out[code] = max(out.get(code, 0), int(lvl))

    for code in SKILL_CODES:
        field = f"criteria_{code.replace('.', '_')}"
        if field in row and pd.notna(row[field]):
            lvl = row[field]
            if isinstance(lvl, (int, float)) and lvl > 0:
                out[code] = max(out.get(code, 0), int(lvl))
        if code in row and pd.notna(row[code]):
            lvl = row[code]
            if isinstance(lvl, (int, float)) and lvl > 0:
                out[code] = max(out.get(code, 0), int(lvl))

    return out


def activity_skill_matrix(activities: pd.DataFrame) -> pd.DataFrame:
    """activities x 18 skills matrix of declared levels (0 if absent)."""
    matrix = pd.DataFrame(0, index=activities["_id"], columns=SKILL_CODES, dtype=int)
    for _, row in activities.iterrows():
        for code, lvl in extract_skill_levels(row).items():
            matrix.at[row["_id"], code] = lvl
    return matrix


def student_competency(
    participation: pd.DataFrame,
    activity_matrix: pd.DataFrame,
    activities: pd.DataFrame | None = None,
    approved_only: bool = True,
) -> pd.DataFrame:
    """Return (sid_hash x 18 skill) MAX-level matrix from approved participation.

    Joins participation with activity skill matrix preferring activityId, falling
    back to a name -> id lookup built from activities when activityId is missing.
    """
    p = participation.copy()
    print(f"  [debug] participation cols: {sorted(p.columns.tolist())[:25]}")
    print(f"  [debug] participation rows: {len(p)}")

    if approved_only and "status" in p.columns:
        status_counts = p["status"].astype(str).str.lower().value_counts().head()
        print(f"  [debug] status counts: {dict(status_counts)}")
        p = p[p["status"].astype(str).str.lower().eq("approved")]
        print(f"  [debug] after approved filter: {len(p)}")

    if "sid_hash" not in p.columns:
        print("  [debug] sid_hash MISSING in participation -> cannot group by student")
        return pd.DataFrame(columns=SKILL_CODES)

    activity_ids = set(activity_matrix.index.astype(str))
    skill_lookup = activity_matrix.reset_index().rename(columns={"_id": "activityId"})
    skill_lookup["activityId"] = skill_lookup["activityId"].astype(str)

    # Try 1: direct activityId join
    p1 = p.copy()
    p1["activityId"] = p1.get("activityId", pd.Series(dtype=str)).astype(str)
    id_hits = p1["activityId"].isin(activity_ids).sum() if "activityId" in p1.columns else 0
    print(f"  [debug] direct activityId hits: {id_hits} / {len(p1)}")

    merged = p1.merge(skill_lookup, on="activityId", how="inner") if id_hits > 0 else pd.DataFrame()

    # Try 2: activityName -> _id fallback
    if merged.empty and "activityName" in p.columns and activities is not None and not activities.empty:
        name_col = next((c for c in ("name", "activityName", "title") if c in activities.columns), None)
        print(f"  [debug] name_col on activities: {name_col}")
        if name_col:
            name_to_id = dict(
                zip(activities[name_col].astype(str).str.strip(),
                    activities["_id"].astype(str))
            )
            p2 = p.copy()
            p2["activityId"] = p2["activityName"].astype(str).str.strip().map(name_to_id)
            matched = p2["activityId"].notna().sum()
            print(f"  [debug] name->id mapped: {matched} / {len(p2)}")
            sample_unmatched = p2.loc[p2["activityId"].isna(), "activityName"].dropna().head(3).tolist()
            if sample_unmatched:
                print(f"  [debug] sample unmatched names: {sample_unmatched}")
            sample_activity_names = activities[name_col].dropna().astype(str).head(3).tolist()
            print(f"  [debug] sample activity names: {sample_activity_names}")
            merged = p2.dropna(subset=["activityId"]).merge(skill_lookup, on="activityId", how="inner")

    print(f"  [debug] merged rows: {len(merged)}")

    if merged.empty:
        # diagnostics: peek at what participation.activityId looks like vs activity._id
        if "activityId" in p.columns:
            p_ids = p["activityId"].dropna().astype(str).head(3).tolist()
            print(f"  [debug] sample participation.activityId: {p_ids}")
        a_ids = list(activity_matrix.index.astype(str)[:3])
        print(f"  [debug] sample activity._id: {a_ids}")
        return pd.DataFrame(columns=SKILL_CODES)

    student_matrix = merged.groupby("sid_hash")[SKILL_CODES].max().fillna(0).astype(int)
    return student_matrix


def domain_scores(student_matrix: pd.DataFrame) -> pd.DataFrame:
    """Domain score = max of sub-skill levels."""
    out = pd.DataFrame(index=student_matrix.index)
    for domain, codes in DOMAINS.items():
        cols = [c for c in codes if c in student_matrix.columns]
        out[domain] = student_matrix[cols].max(axis=1) if cols else 0
    return out
