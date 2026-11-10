#!/usr/bin/env python3
"""Convert a trusted Wrangler D1 SQL export into an insert-only PostgreSQL import."""
import argparse
import json
import os
from pathlib import Path
import sqlite3
import sys

TABLES = (
    "products",
    "orders",
    "order_items",
    "order_log",
)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("d1_export", type=Path)
    parser.add_argument("pg_import", type=Path)
    args = parser.parse_args()

    with sqlite3.connect(":memory:") as database:
        database.row_factory = sqlite3.Row
        database.executescript(args.d1_export.read_text(encoding="utf-8"))
        records = {
            table: [dict(row) for row in database.execute(f"SELECT * FROM {table}")]
            for table in TABLES
        }
    encoded = {
        table: json.dumps(rows, ensure_ascii=True, allow_nan=False).encode().hex()
        for table, rows in records.items()
    }
    counts = {table: len(rows) for table, rows in records.items()}
    # Refuse to overwrite a local import, and restrict the order data to this user.
    fd = os.open(args.pg_import, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as output:
        output.write("BEGIN;\nSET LOCAL TIME ZONE 'UTC';\n")
        output.write("LOCK TABLE " + ", ".join(f"geargrid.{table}" for table in TABLES) + " IN ACCESS EXCLUSIVE MODE;\n")
        output.write("DO $$ BEGIN\n")
        for table in TABLES:
            output.write(f"  IF EXISTS (SELECT 1 FROM geargrid.{table}) THEN RAISE EXCEPTION 'Target {table} is not empty'; END IF;\n")
        output.write("END $$;\n")
        for table, payload in encoded.items():
            output.write(
                f"INSERT INTO geargrid.{table} SELECT * FROM jsonb_populate_recordset("
                f"NULL::geargrid.{table}, convert_from(decode('{payload}', 'hex'), 'UTF8')::jsonb);\n"
            )
        output.write("DO $$ BEGIN\n")
        for table, count in counts.items():
            output.write(
                f"  IF (SELECT count(*) FROM geargrid.{table}) <> {count} THEN "
                f"RAISE EXCEPTION 'Import count mismatch for {table}'; END IF;\n"
            )
        output.write("END $$;\nCOMMIT;\n")
    print(json.dumps(counts), file=sys.stderr)


if __name__ == "__main__":
    main()
