#!/usr/bin/env python3
"""Build the live lecture, complete student and lecturer handouts.

Install the pinned build dependencies with:
    python -m pip install typst==0.15.2 pymupdf==1.26.6

Then run ``python build.py`` from any directory. The source project contains
slides.typ, notes.typ, lecturer.typ, the original scl-beamer template, and
fonts/. Every logical slide must include the following metadata on its body:
    #metadata((kind: "lecture-frame", id: "unique-id")) <lecture-frame>

The live lecture omits frames marked handout-only. Both handouts include
them. The lecturer guide uses each current slide's final reveal and the
next slide's opening reveal from the complete handout-reveals.pdf. Its
previews and separate page map are regenerated on every build. Optional
SOURCE_DATE_EPOCH fixes the PDF creation timestamp.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys
from typing import Any

try:
    import pymupdf
    import typst
except ImportError as error:
    raise SystemExit(
        "Missing build dependency. Run: python -m pip install "
        "typst==0.15.2 pymupdf==1.26.6"
    ) from error


QUERY_LABEL = "<lecture-page-map>"
QUERY_SOURCE = """#include \"../slides.typ\"
#context [
  #metadata(query(<lecture-frame>).map(frame => (
    id: frame.value.id,
    handout_only: frame.value.at("handout_only", default: false),
    page: frame.location().page(),
  ))) <lecture-page-map>
]
"""


def relative_path(path: Path, project: Path) -> str:
    """Return a portable path that stays inside the Typst project root."""
    try:
        return path.resolve().relative_to(project.resolve()).as_posix()
    except ValueError as error:
        raise ValueError(
            f"The build directory must be inside the project: {path}"
        ) from error


def compiler_options(
    project: Path,
    package_cache: Path | None,
) -> dict[str, Any]:
    """Use the project's real fonts and, when supplied, its package cache."""
    options: dict[str, Any] = {
        "root": str(project),
        "font_paths": [str(project / "fonts")],
        "ignore_system_fonts": True,
    }
    cache = package_cache
    if cache is None and (project / "packages").is_dir():
        cache = project / "packages"
    if cache is not None:
        options["package_cache_path"] = str(cache.resolve())
    return options


def compile_pdf(
    source: Path,
    output: Path,
    options: dict[str, Any],
    inputs: dict[str, str],
) -> None:
    """Compile a PDF and retain compiler warnings in the build log."""
    compile_options = dict(options)
    epoch = os.environ.get("SOURCE_DATE_EPOCH")
    if epoch is not None:
        compile_options["timestamp"] = int(epoch)
    data, warnings = typst.compile_with_warnings(
        str(source),
        sys_inputs=inputs,
        **compile_options,
    )
    output.write_bytes(data)
    for warning in warnings:
        print(f"{source.name}: {warning}", file=sys.stderr)


def frame_ranges(
    entries: list[dict[str, Any]],
    page_count: int,
) -> list[dict[str, Any]]:
    """Group physical PDF pages by a unique, contiguous logical frame ID."""
    frames: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    page_ids: dict[int, str] = {}
    reading_flags: dict[str, bool] = {}
    for entry in sorted(entries, key=lambda item: item["page"]):
        frame_id = entry.get("id")
        page = entry.get("page")
        handout_only = entry.get("handout_only", False)
        if not isinstance(frame_id, str) or not frame_id:
            raise ValueError(
                "Every lecture-frame ID must be a nonempty string."
            )
        if not isinstance(page, int) or not 1 <= page <= page_count:
            raise ValueError(f"Invalid physical page for {frame_id!r}: {page}")
        if not isinstance(handout_only, bool):
            raise ValueError(f"Invalid handout-only flag for {frame_id!r}.")
        if frame_id in reading_flags:
            if reading_flags[frame_id] != handout_only:
                raise ValueError(
                    f"Handout-only flag changes within frame {frame_id!r}."
                )
        reading_flags[frame_id] = handout_only
        if page in page_ids:
            if page_ids[page] != frame_id:
                raise ValueError(f"Page {page} has two different frame IDs.")
            continue
        page_ids[page] = frame_id
        if not frames or frames[-1]["id"] != frame_id:
            if frame_id in seen_ids:
                raise ValueError(
                    f"Frame ID {frame_id!r} occurs in separate slide ranges."
                )
            seen_ids.add(frame_id)
            frames.append({
                "id": frame_id,
                "handout_only": handout_only,
                "pages": [],
            })
        frames[-1]["pages"].append(page)

    missing = sorted(set(range(1, page_count + 1)) - set(page_ids))
    if missing:
        raise ValueError(
            "These physical PDF pages lack <lecture-frame> metadata: "
            + ", ".join(map(str, missing))
        )
    if not frames:
        raise ValueError(
            "No <lecture-frame> metadata was found in slides.typ."
        )
    for number, frame in enumerate(frames, start=1):
        frame["number"] = number
        frame["first_page"] = frame["pages"][0]
        frame["last_page"] = frame["pages"][-1]
        frame["overlay_count"] = len(frame["pages"])
    return frames


def write_previews(
    pdf: pymupdf.Document,
    frames: list[dict[str, Any]],
    project: Path,
    build: Path,
) -> None:
    """Render compact previews at about 200 dpi at their printed size."""
    preview_dir = build / "previews"
    preview_dir.mkdir(parents=True, exist_ok=True)
    for pattern in ("*.svg", "frame-*-first.png", "frame-*-final.png"):
        for stale in preview_dir.glob(pattern):
            stale.unlink()
    matrix = pymupdf.Matrix(2.2, 2.2)
    for frame in frames:
        stem = f"frame-{frame['number']:03d}"
        for state, key in (("first", "first_page"), ("final", "last_page")):
            destination = preview_dir / f"{stem}-{state}.png"
            pixmap = pdf[frame[key] - 1].get_pixmap(
                matrix=matrix,
                alpha=False,
            )
            pixmap.save(destination)
            frame[f"{state}_image"] = relative_path(destination, project)
    for index, frame in enumerate(frames):
        following = frames[index + 1] if index + 1 < len(frames) else None
        frame["next_id"] = following["id"] if following else None
        frame["next_image"] = following["first_image"] if following else None


def build_project(
    project: Path,
    build: Path,
    package_cache: Path | None = None,
) -> dict[str, Any]:
    """Build live and full frame maps, then the two complete handouts."""
    project = project.resolve()
    build = build.resolve()
    relative_path(build, project)
    for filename in ("slides.typ", "notes.typ", "lecturer.typ"):
        if not (project / filename).is_file():
            raise FileNotFoundError(project / filename)
    build.mkdir(parents=True, exist_ok=True)
    options = compiler_options(project, package_cache)
    lecture_pdf = build / "lecture.pdf"
    full_pdf = build / "handout-reveals.pdf"
    student_pdf = build / "student-handout.pdf"
    lecturer_pdf = build / "lecturer-handout.pdf"
    frames_path = build / "frames.json"
    handout_frames_path = build / "handout-frames.json"
    live_inputs = {
        "handout": "false",
        "student-handout": "false",
        "show-extensions": "false",
    }
    full_inputs = {**live_inputs, "show-extensions": "true"}

    # Use a query-only wrapper so the authored lecture remains untouched.
    # Absolute Typst paths are resolved relative to --root, not the machine.
    query_source = QUERY_SOURCE.replace('"../slides.typ"', '"/slides.typ"')
    query_path = build / "_frame-query.typ"
    query_path.write_text(query_source, encoding="utf-8")

    manifests: dict[str, dict[str, Any]] = {}
    for view, pdf_path, inputs, map_path in (
        ("live", lecture_pdf, live_inputs, frames_path),
        ("handout", full_pdf, full_inputs, handout_frames_path),
    ):
        print(f"Compiling {view} reveal deck...", flush=True)
        compile_pdf(project / "slides.typ", pdf_path, options, inputs)
        raw = typst.query(
            str(query_path),
            QUERY_LABEL,
            field="value",
            one=True,
            sys_inputs=inputs,
            **options,
        )
        entries = json.loads(raw)
        with pymupdf.open(pdf_path) as pdf:
            frames = frame_ranges(entries, len(pdf))
            page_count = len(pdf)
            if view == "handout":
                write_previews(pdf, frames, project, build)
        manifest = {
            "schema_version": 1,
            "view": view,
            "total_pdf_pages": page_count,
            "frames": frames,
        }
        map_path.write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        manifests[view] = manifest

    live_frames = manifests["live"]["frames"]
    handout_frames = manifests["handout"]["frames"]
    expected_live = [
        frame["id"] for frame in handout_frames if not frame["handout_only"]
    ]
    if [frame["id"] for frame in live_frames] != expected_live:
        raise ValueError(
            "The live deck must match the full deck after removing "
            "exactly its handout-only frames. Check show-extensions gates."
        )
    if any(frame["handout_only"] for frame in live_frames):
        raise ValueError("The default live deck contains handout-only frames.")

    print("Compiling student handout...", flush=True)
    compile_pdf(
        project / "slides.typ",
        student_pdf,
        options,
        {**full_inputs, "student-handout": "true"},
    )
    with pymupdf.open(student_pdf) as pdf:
        if len(pdf) != len(handout_frames):
            raise ValueError(
                "The student handout must have one final state per frame: "
                f"expected {len(handout_frames)} pages, found {len(pdf)}."
            )

    print("Compiling lecturer handout...", flush=True)
    compile_pdf(
        project / "lecturer.typ",
        lecturer_pdf,
        options,
        {"frames": relative_path(handout_frames_path, project)},
    )
    with pymupdf.open(lecturer_pdf) as pdf:
        if len(pdf) != len(handout_frames):
            raise ValueError(
                "The lecturer handout must have one page per frame. "
                f"Expected {len(handout_frames)} pages, found {len(pdf)}; "
                "check note lengths and the handout layout."
            )
    print(
        f"Built {len(live_frames)} live frames and "
        f"{len(handout_frames)} frames in each handout. "
        f"Reveal pages: {manifests['live']['total_pdf_pages']} live / "
        f"{manifests['handout']['total_pdf_pages']} complete."
    )
    for output in (
        lecture_pdf, full_pdf, student_pdf, lecturer_pdf,
        frames_path, handout_frames_path,
    ):
        print(output)
    return manifests["live"]


def main() -> int:
    """Parse command-line options and report useful build failures."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--project",
        type=Path,
        default=Path(__file__).resolve().parent,
        help="Project containing slides.typ, notes.typ, and lecturer.typ.",
    )
    parser.add_argument(
        "--build-dir",
        type=Path,
        default=Path("build"),
        help="Output directory inside the project (default: build).",
    )
    parser.add_argument(
        "--package-cache",
        type=Path,
        help="Typst package cache; a bundled packages/ is used if present.",
    )
    args = parser.parse_args()
    project = args.project.resolve()
    build = args.build_dir
    if not build.is_absolute():
        build = project / build
    try:
        build_project(project, build, args.package_cache)
    except (OSError, RuntimeError, TypeError, ValueError) as error:
        diagnostic = getattr(error, "diagnostic", str(error))
        print(f"Build failed: {diagnostic}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
