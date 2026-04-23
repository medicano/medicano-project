#!/usr/bin/env python3
"""
Run all prompts from a sprint JSON file through the MedicanoDevFlow.

Usage:
    python run_sprint.py [sprint-json] [--from ID] [--only ID] [--dry-run]

Examples:
    python run_sprint.py                                   # runs sprint-01-prompts.json
    python run_sprint.py docs/specs/sprint-01-prompts.json
    python run_sprint.py --from 4                         # resume from prompt #4
    python run_sprint.py --only 6                         # run only prompt #6
    python run_sprint.py --dry-run                        # print prompts without executing
"""

import argparse
import json
import sys
import time
from datetime import datetime
from pathlib import Path

CREW_DIR = Path(__file__).parent
DEFAULT_PROMPTS_FILE = CREW_DIR / "docs" / "specs" / "sprint-01-prompts.json"
STATE_DIR = CREW_DIR / "output" / "phase_state"
LOGS_DIR = CREW_DIR / "output" / "phase_logs"


def load_prompts(path: Path) -> dict:
    with open(path) as f:
        return json.load(f)


def state_file(sprint: str, prompt_id: int) -> Path:
    return STATE_DIR / f"{sprint}-{prompt_id:02d}.done"


def mark_done(sprint: str, prompt_id: int, run_id: str):
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    state_file(sprint, prompt_id).write_text(run_id)


def is_done(sprint: str, prompt_id: int) -> bool:
    return state_file(sprint, prompt_id).exists()


def run_prompt(sprint: str, prompt: dict, dry_run: bool) -> bool:
    pid = prompt["id"]
    name = prompt["name"]
    request = prompt["request"]
    run_id = datetime.now().strftime("%Y%m%d_%H%M%S")

    print(f"\n{'=' * 70}")
    print(f"  [{pid}/{name}] {prompt['description']}")
    print(f"{'=' * 70}")

    if dry_run:
        print(f"\n[DRY RUN] Request:\n{request}\n")
        return True

    # Inline the flow execution to avoid subprocess overhead and keep the
    # same Python environment / env vars already loaded.
    sys.argv = ["run_sprint.py", request]

    try:
        from medicano_crew.main import kickoff
        kickoff()
        mark_done(sprint, pid, run_id)
        return True
    except Exception as exc:
        print(f"\n[ERROR] Prompt {pid} failed: {exc}", file=sys.stderr)
        LOGS_DIR.mkdir(parents=True, exist_ok=True)
        log_path = LOGS_DIR / f"{sprint}-{pid:02d}-error.log"
        log_path.write_text(f"{run_id}\n{exc}\n")
        return False


def main():
    parser = argparse.ArgumentParser(description="Run sprint prompts through MedicanoDevFlow")
    parser.add_argument(
        "prompts_file",
        nargs="?",
        default=str(DEFAULT_PROMPTS_FILE),
        help="Path to the sprint prompts JSON file",
    )
    parser.add_argument(
        "--from",
        dest="from_id",
        type=int,
        default=1,
        help="Start from this prompt ID (skip earlier ones)",
    )
    parser.add_argument(
        "--only",
        dest="only_id",
        type=int,
        default=None,
        help="Run only this single prompt ID",
    )
    parser.add_argument(
        "--skip-done",
        action="store_true",
        default=False,
        help="Skip prompts already marked as done (idempotent re-run)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        help="Print prompts without executing them",
    )
    parser.add_argument(
        "--delay",
        type=int,
        default=5,
        help="Seconds to wait between prompts (default: 5)",
    )
    args = parser.parse_args()

    prompts_path = Path(args.prompts_file)
    if not prompts_path.is_absolute():
        prompts_path = CREW_DIR / prompts_path

    if not prompts_path.exists():
        print(f"[ERROR] Prompts file not found: {prompts_path}", file=sys.stderr)
        sys.exit(1)

    data = load_prompts(prompts_path)
    sprint = data["sprint"]
    prompts = data["prompts"]

    print(f"\n{'#' * 70}")
    print(f"  Sprint : {sprint}")
    print(f"  Goal   : {data['description']}")
    print(f"  Prompts: {len(prompts)}")
    if args.dry_run:
        print("  Mode   : DRY RUN")
    print(f"{'#' * 70}")

    failed = []
    skipped = []

    for prompt in prompts:
        pid = prompt["id"]

        if args.only_id is not None and pid != args.only_id:
            continue

        if args.only_id is None and pid < args.from_id:
            skipped.append(pid)
            continue

        if args.skip_done and is_done(sprint, pid):
            print(f"\n[SKIP] Prompt {pid}/{prompt['name']} already done.")
            skipped.append(pid)
            continue

        ok = run_prompt(sprint, prompt, args.dry_run)

        if not ok:
            failed.append(pid)
            print(f"\n[ABORT] Prompt {pid} failed. Fix errors then resume with --from {pid}")
            break

        if not args.dry_run and pid != prompts[-1]["id"]:
            print(f"\nWaiting {args.delay}s before next prompt...")
            time.sleep(args.delay)

    print(f"\n{'#' * 70}")
    if failed:
        print(f"  FAILED  : prompts {failed}")
        print(f"  Resume  : python run_sprint.py --from {failed[0]}")
    else:
        done_count = len(prompts) - len(skipped) - len(failed)
        print(f"  Done    : {done_count} prompts executed")
        if skipped:
            print(f"  Skipped : {skipped}")
        print("  Status  : ALL OK")
    print(f"{'#' * 70}\n")

    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
