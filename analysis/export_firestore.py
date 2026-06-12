"""
Export Firestore collections to anonymized CSV for analysis.

Usage:
    1. Firebase Console -> Project Settings -> Service Accounts -> Generate new private key
    2. Save the JSON file at analysis/serviceAccount.json (gitignored)
    3. python export_firestore.py

Outputs to analysis/data/ :
    students.csv, activities.csv, participation.csv, submissions.csv, organizers.csv
A SHA-256-based pseudonymous studentId column (sid_hash) is added.
Email + raw studentId are dropped to reduce PII risk.

Date filter: PERIOD_START -> PERIOD_END (academic year 2568 / Jun 2025 - Apr 2026).
Adjust constants below if scope changes.
"""

from __future__ import annotations

import hashlib
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    sys.exit("firebase-admin missing. pip install -r requirements.txt")

# ----- Config -----
HERE = Path(__file__).parent
SA_PATH = HERE / "serviceAccount.json"
OUT_DIR = HERE / "data"
OUT_DIR.mkdir(exist_ok=True)

PERIOD_START = datetime(2025, 6, 1, tzinfo=timezone.utc)
PERIOD_END = datetime(2026, 4, 30, 23, 59, 59, tzinfo=timezone.utc)

HASH_SALT = os.environ.get("HASH_SALT", "cmu-eng-2568")  # set HASH_SALT env to rotate
COLLECTIONS = ["students", "activities", "participation", "submissions", "organizers"]


def hash_sid(value: str) -> str:
    if not value:
        return ""
    h = hashlib.sha256(f"{HASH_SALT}:{value}".encode()).hexdigest()
    return h[:16]


def init_client():
    if not SA_PATH.exists():
        sys.exit(
            f"serviceAccount.json not found at {SA_PATH}\n"
            "Download it from Firebase Console -> Project Settings -> Service Accounts."
        )
    cred = credentials.Certificate(str(SA_PATH))
    firebase_admin.initialize_app(cred)
    return firestore.client()


def doc_to_row(doc) -> dict:
    d = doc.to_dict() or {}
    d["_id"] = doc.id
    return d


def dump_collection(db, name: str) -> pd.DataFrame:
    print(f"  fetching {name} ...", end=" ", flush=True)
    rows = [doc_to_row(d) for d in db.collection(name).stream()]
    df = pd.DataFrame(rows)
    print(f"{len(df)} docs")
    return df


def coerce_date(series: pd.Series) -> pd.Series:
    return pd.to_datetime(series, errors="coerce", utc=True)


def main():
    db = init_client()
    raw = {name: dump_collection(db, name) for name in COLLECTIONS}

    # ---- Students ----
    if not raw["students"].empty:
        s = raw["students"].copy()
        s["sid_hash"] = s.get("studentId", "").map(hash_sid)
        keep = [c for c in ["_id", "sid_hash", "faculty", "department", "year", "major"] if c in s.columns]
        s[keep].to_csv(OUT_DIR / "students.csv", index=False)
        print(f"  -> students.csv ({len(s)})")

    # ---- Activities (no PII; keep full) ----
    if not raw["activities"].empty:
        a = raw["activities"].copy()
        for c in ("createdAt", "updatedAt"):
            if c in a.columns:
                a[c] = coerce_date(a[c])
        a.to_csv(OUT_DIR / "activities.csv", index=False)
        print(f"  -> activities.csv ({len(a)})")

    # ---- Participation ----
    if not raw["participation"].empty:
        p = raw["participation"].copy()
        if "studentId" in p.columns:
            p["sid_hash"] = p["studentId"].map(hash_sid)
        for c in ("date", "approvedAt", "createdAt"):
            if c in p.columns:
                p[c] = coerce_date(p[c])
        # period filter on best available date field
        date_col = next((c for c in ("date", "approvedAt", "createdAt") if c in p.columns), None)
        if date_col:
            p = p[(p[date_col] >= PERIOD_START) & (p[date_col] <= PERIOD_END)]
        drop = [c for c in ("studentId", "email", "studentEmail") if c in p.columns]
        p.drop(columns=drop).to_csv(OUT_DIR / "participation.csv", index=False)
        print(f"  -> participation.csv ({len(p)})")

    # ---- Submissions ----
    if not raw["submissions"].empty:
        sb = raw["submissions"].copy()
        if "studentEmail" in sb.columns:
            sb["sid_hash"] = sb["studentEmail"].map(hash_sid)
        for c in ("createdAt", "reviewedAt", "reviewTimestamp"):
            if c in sb.columns:
                sb[c] = coerce_date(sb[c])
        date_col = next((c for c in ("createdAt", "reviewedAt") if c in sb.columns), None)
        if date_col:
            sb = sb[(sb[date_col] >= PERIOD_START) & (sb[date_col] <= PERIOD_END)]
        drop = [c for c in ("studentEmail", "email") if c in sb.columns]
        sb.drop(columns=drop).to_csv(OUT_DIR / "submissions.csv", index=False)
        print(f"  -> submissions.csv ({len(sb)})")

    # ---- Organizers (drop password fields) ----
    if not raw["organizers"].empty:
        o = raw["organizers"].copy()
        drop = [c for c in ("password", "passwordHash") if c in o.columns]
        o.drop(columns=drop).to_csv(OUT_DIR / "organizers.csv", index=False)
        print(f"  -> organizers.csv ({len(o)})")

    print("\nDone. CSV files written to", OUT_DIR)


if __name__ == "__main__":
    main()
