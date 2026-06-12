"""Shared helpers: parse skill payloads + compute per-student competency vectors."""

from __future__ import annotations

import ast
import json
import re
from typing import Iterable

import numpy as np
import pandas as pd

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
    approved_only: bool = True,
) -> pd.DataFrame:
    """Return (sid_hash x 18 skill) MAX-level matrix from approved participation.

    Joins participation with activity skill matrix via activityId / activityName.
    """
    p = participation.copy()
    if approved_only and "status" in p.columns:
        p = p[p["status"].str.lower().eq("approved")]

    if "activityId" in p.columns and p["activityId"].notna().any():
        join_key = "activityId"
        skill_lookup = activity_matrix
    elif "activityName" in p.columns:
        # fallback: map name -> matrix row
        name_to_id = {}
        # caller must provide activities df separately to map name; here best-effort skip
        join_key = "activityName"
        skill_lookup = activity_matrix
    else:
        return pd.DataFrame(columns=SKILL_CODES)

    merged = p.merge(
        skill_lookup.reset_index().rename(columns={"_id": join_key}),
        on=join_key,
        how="inner",
    )
    if merged.empty or "sid_hash" not in merged.columns:
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
