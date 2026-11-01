"""Convert a Knitout file to experimental Shima Seiki DAT with explicit guards.

Run this in the isolated, version-pinned environment documented in the folder
README. The published converter currently conflicts with current interpreter
releases, hence the separate compatibility environment.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from tempfile import TemporaryDirectory


def knitout_target(path: Path) -> tuple[str | None, int | None]:
    machine = None
    gauge = None
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        if line.startswith(";;Machine:"):
            machine = line.partition(":")[2].strip()
        elif line.startswith(";;Gauge:"):
            match = re.search(r"\d+", line.partition(":")[2])
            gauge = int(match.group()) if match else None
    return machine, gauge


def main() -> int:
    parser = argparse.ArgumentParser(description="Convert Knitout to Shima Seiki DAT (experimental).")
    parser.add_argument("knitout", type=Path, help="Input Knitout .k file")
    parser.add_argument("dat", type=Path, help="Output DAT file")
    parser.add_argument("--expected-machine", required=True, help="Must match the Knitout ;;Machine header")
    parser.add_argument("--expected-gauge", required=True, type=int, help="Must match the Knitout ;;Gauge header")
    args = parser.parse_args()

    if not args.knitout.is_file():
        parser.error(f"Knitout input does not exist: {args.knitout}")
    machine, gauge = knitout_target(args.knitout)
    if machine != args.expected_machine or gauge != args.expected_gauge:
        print(
            f"Machine/gauge mismatch: Knitout says {machine!r} / {gauge!r}; "
            f"you confirmed {args.expected_machine!r} / {args.expected_gauge!r}.",
            file=sys.stderr,
        )
        return 2

    try:
        from knitout_to_dat_python.knitout_to_dat import knitout_to_dat
    except ImportError as error:
        print(
            "Cannot load knitout-to-dat-python. Use the pinned DAT conversion environment in machine_export/README.md. "
            f"Import error: {error}",
            file=sys.stderr,
        )
        return 2

    args.dat.parent.mkdir(parents=True, exist_ok=True)
    try:
        with TemporaryDirectory(prefix="soft-sensor-dat-", dir=args.dat.parent) as temp_dir:
            temporary_dat = Path(temp_dir) / args.dat.name
            knitout_to_dat(str(args.knitout), str(temporary_dat), knitout_in_file=True)
            if not temporary_dat.is_file() or temporary_dat.stat().st_size == 0:
                raise RuntimeError("Converter returned without writing a DAT file.")
            temporary_dat.replace(args.dat)
    except Exception as error:
        print(f"DAT conversion failed: {error}", file=sys.stderr)
        return 1

    print(f"Wrote experimental DAT: {args.dat} ({args.dat.stat().st_size} bytes)")
    print(f"Knitout target: {machine}, gauge {gauge}")
    print("Not machine-validated. Confirm the exact machine model, gauge, and DAT workflow with SHIMA SEIKI before use.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
