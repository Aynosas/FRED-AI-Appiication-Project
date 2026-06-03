import os
import pandas as pd

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from io import StringIO
from pydantic import BaseModel
from rag_engine import query

def get_dataframe(file_path: str):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"No file at: {file_path}")

    df = pd.read_csv(file_path, na_values=["NULL", "N/A", ""])
    print(f"Loaded {df.shape[0]} rows and {df.shape[1]} columns")
    return df

"""
Takes a dataframe and returns a dictionary describing what's wrong with the data
"""
def audit_quality(df: pd.DataFrame):
    report = {}
    report["null_counts"] = {}
    # Check nulls
    for col in df.columns:
        null_count = df[col].isna().sum()
        if (null_count != 0):
            report["null_counts"][col] = int(null_count)
    # Duplicate count
    report["duplicate_count"] = int(df.duplicated().sum())
    # Total row count
    report["total_rows"] = int(df.shape[0])
    return report

def clean_data(df: pd.DataFrame):
    df = df.drop_duplicates()
    df = df.dropna(subset=["value"])
    df = df.reset_index(drop=True)
    return df

def run_pipeline(df: pd.DataFrame):
    report = audit_quality(df)
    clean_df = clean_data(df)
    clean_row_count = len(clean_df)

    return {
    "quality_report": {
        "row_count_raw": int(df.shape[0]),
        "quality_score_pct": round((len(clean_df) / len(df)) * 100, 1),
        "issues": {
            "total_null_cells": sum(report["null_counts"].values()),
            "duplicate_row_count": report["duplicate_count"]
        }
    },
    "clean_row_count": clean_row_count,
    "rows_removed": int(df.shape[0]) - clean_row_count
}

