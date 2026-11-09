#!/usr/bin/env python3
"""Measure equation anchors and text bounds in the compiled lecture.

Run ``python verify_layout.py`` after ``python build.py``. This reads the
existing PDF, frame map, sources, and theme settings without changing them.
It writes validation/layout.json and validation/layout.md. Requires the
same pinned pymupdf==1.26.6 dependency as build.py.

Use ``--view handout`` to check the complete reveal sequence, including
handout-only extension frames, against its separate page map.

The anchor is the native math '=' baseline origin, not a whole equation's
changing bounding box. Prompt, footer, and subscript equals signs are
excluded using the stage region and main math font size. Ambiguous or
missing anchors are reported as unverified, never counted as passes.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
from typing import Any

import pymupdf


MM = 72 / 25.4
TEXPT = 72 / 72.27
STAGE_Y = (65.0, 155.0)


def literal_end(source: str, index: int) -> int | None:
    """Skip strings, raw text, and comments while scanning Typst source."""
    if source.startswith("//", index):
        end = source.find("\n", index)
        return len(source) if end < 0 else end
    if source.startswith("/*", index):
        depth = 1
        cursor = index + 2
        while cursor < len(source) and depth:
            if source.startswith("/*", cursor):
                depth += 1
                cursor += 2
            elif source.startswith("*/", cursor):
                depth -= 1
                cursor += 2
            else:
                cursor += 1
        return cursor
    if source[index] == '"':
        cursor = index + 1
        while cursor < len(source):
            if source[cursor] == "\\":
                cursor += 2
            elif source[cursor] == '"':
                return cursor + 1
            else:
                cursor += 1
        raise ValueError("Unterminated Typst string.")
    if source[index] == "`":
        width = 1
        while source.startswith("`" * (width + 1), index):
            width += 1
        end = source.find("`" * width, index + width)
        return len(source) if end < 0 else end + width
    return None


def balanced_end(source: str, start: int) -> int:
    """Find the end of a balanced Typst argument or content block."""
    pairs = {"(": ")", "[": "]", "{": "}"}
    stack = [pairs[source[start]]]
    cursor = start + 1
    while cursor < len(source):
        skipped = literal_end(source, cursor)
        if skipped is not None:
            cursor = skipped
            continue
        char = source[cursor]
        if char == "\\":
            cursor += 2
            continue
        if char in pairs:
            stack.append(pairs[char])
        elif char in ")]}":
            if not stack or char != stack.pop():
                raise ValueError("Unbalanced Typst source delimiters.")
            if not stack:
                return cursor + 1
        cursor += 1
    raise ValueError("Unclosed Typst argument or content block.")


def split_arguments(source: str) -> list[str]:
    """Split only top-level commas, retaining nested equation content."""
    parts: list[str] = []
    start = 0
    cursor = 0
    while cursor < len(source):
        skipped = literal_end(source, cursor)
        if skipped is not None:
            cursor = skipped
        elif source[cursor] in "([{":
            cursor = balanced_end(source, cursor)
        elif source[cursor] == ",":
            if source[start:cursor].strip():
                parts.append(source[start:cursor].strip())
            start = cursor + 1
            cursor += 1
        else:
            cursor += 1
    if source[start:].strip():
        parts.append(source[start:].strip())
    return parts


def find_calls(source: str, name: str) -> list[dict[str, Any]]:
    """Find real function/marker uses, excluding comments and strings."""
    calls = []
    cursor = 0
    pattern = re.compile(r"#" + re.escape(name) + r"(?![\w-])")
    while cursor < len(source):
        skipped = literal_end(source, cursor)
        if skipped is not None:
            cursor = skipped
            continue
        match = pattern.match(source, cursor)
        if match is None:
            cursor += 1
            continue
        end = match.end()
        while end < len(source) and source[end].isspace():
            end += 1
        args = ""
        if end < len(source) and source[end] == "(":
            stop = balanced_end(source, end)
            args = source[end + 1:stop - 1]
            end = stop
        while end < len(source) and source[end].isspace():
            end += 1
        body_start = body_end = None
        if end < len(source) and source[end] == "[":
            body_start = end + 1
            body_end = balanced_end(source, end) - 1
            end = body_end + 1
        calls.append({
            "start": cursor,
            "end": end,
            "args": args,
            "body_start": body_start,
            "body_end": body_end,
        })
        cursor = max(end, match.end())
    return calls


def array_length(source: str) -> int:
    source = source.strip()
    if not source.startswith("(") or balanced_end(source, 0) != len(source):
        raise ValueError("eq-alt must use an explicit array for this audit.")
    return len(split_arguments(source[1:-1]))


def source_frames(source: str, helpers: str) -> dict[str, dict[str, Any]]:
    """Parse literal frame IDs and the eq-alt/stage calls they contain."""
    default_match = re.search(
        r"#let\s+stage\([^\n]*size:\s*([\d.]+)pt", helpers
    )
    default_size = float(default_match.group(1)) if default_match else 13.0
    result = {}
    for call in find_calls(source, "frame"):
        args = split_arguments(call["args"])
        frame_id = json.loads(args[0])
        if call["body_start"] is None:
            raise ValueError(f"Frame {frame_id!r} has no literal body.")
        body = source[call["body_start"]:call["body_end"]]
        equations = find_calls(body, "eq-alt")
        record: dict[str, Any] = {
            "id": frame_id,
            "line": source.count("\n", 0, call["start"]) + 1,
            "eq_alt_calls": len(equations),
            "handout_only": any(
                re.fullmatch(r"handout-only\s*:\s*true", argument)
                for argument in args[1:]
            ),
        }
        if equations:
            equation = equations[0]
            arguments = split_arguments(equation["args"])
            count = array_length(arguments[0])
            legacy = len(arguments) > 1 and arguments[1].startswith("(")
            states = max(count, array_length(arguments[1])) if legacy else (
                count // 2
            )
            if not legacy and count % 2:
                raise ValueError(f"Odd number of eq-alt entries: {frame_id}")
            stage_size = default_size
            for stage in find_calls(body, "stage"):
                start, end = stage["body_start"], stage["body_end"]
                if start is not None and start <= equation["start"] < end:
                    match = re.search(r"size:\s*([\d.]+)pt", stage["args"])
                    if match:
                        stage_size = float(match.group(1))
                    break
            preceding = body[:equation["start"]]
            pauses = len(find_calls(preceding, "pause"))
            for marker in find_calls(preceding, "pauses"):
                pauses += int(marker["args"].strip())
            record.update({
                "equation_states": states,
                "nominal_font_size": stage_size,
                "first_overlay": pauses + 1,
                "custom_symbol": bool(re.search(
                    r"\bsymbol\s*:", equation["args"]
                )),
            })
        if frame_id in result:
            raise ValueError(f"Duplicate frame ID in source: {frame_id}")
        result[frame_id] = record
    return result


def theme_geometry(settings: str) -> dict[str, float]:
    """Read the actual fixed-canvas dimensions from native theme settings."""

    def value(key: str, unit: str) -> float:
        match = re.search(
            rf"\b{key}:\s*([\d.]+)\s*{re.escape(unit)}", settings
        )
        if match is None:
            raise ValueError(f"Cannot read theme setting: {key}")
        return float(match.group(1))

    width = value("width_mm", "mm") * MM
    height = value("height_mm", "mm") * MM
    sidebar = value("sidebar_width_mm", "mm") * MM
    margin = value("margin_mm", "mm") * MM
    header = value("header_height_pt", "* texpt") * TEXPT
    rail = value("rail_width_pt", "* texpt") * TEXPT
    if not re.search(r"sidebar_side:\s*right", settings):
        raise ValueError("This audit currently requires a right sidebar.")
    return {
        "page_width": width,
        "page_height": height,
        "body_left": margin,
        "body_right": width - sidebar - margin,
        "body_top": header + value("header_gap_mm", "mm") * MM,
        "body_bottom": height - value("bottom_gap_mm", "mm") * MM,
        "header_bottom": header,
        "sidebar_left": width - sidebar,
        "sidebar_rail_left": width - sidebar - rail / 2,
        "sidebar_font_max": value("navigation_pt", "* texpt") * TEXPT,
    }


def page_text(page: pymupdf.Page) -> dict[str, Any]:
    """Extract glyph positions, including text outside the page crop box."""
    chars = []
    lines = []
    flags = pymupdf.TEXTFLAGS_RAWDICT & ~pymupdf.TEXT_PRESERVE_IMAGES
    raw = page.get_text(
        "rawdict", clip=pymupdf.INFINITE_RECT(), flags=flags
    )
    for block in raw["blocks"]:
        for line in block.get("lines", []):
            line_chars = []
            for span in line["spans"]:
                for char in span["chars"]:
                    item = {
                        "text": char["c"],
                        "x": char["origin"][0],
                        "y": char["origin"][1],
                        "bbox": list(char["bbox"]),
                        "font": span["font"],
                        "size": span["size"],
                    }
                    chars.append(item)
                    line_chars.append(item)
            lines.append(line_chars)
    return {"chars": chars, "lines": lines}


def relation_candidates(
    page: dict[str, Any], geometry: dict[str, float]
) -> list[dict[str, Any]]:
    return [
        char for char in page["chars"]
        if char["text"] == "=" and "Math" in char["font"]
        and geometry["body_left"] <= char["x"] <= geometry["body_right"]
        and STAGE_Y[0] <= char["y"] <= STAGE_Y[1]
    ]


def check_alignment(
    frame: dict[str, Any],
    spec: dict[str, Any],
    pages: dict[int, dict[str, Any]],
    geometry: dict[str, float],
    tolerance: float,
) -> dict[str, Any]:
    result = {"id": frame["id"], "source": spec, "issues": []}
    checked = frame["pages"][spec["first_overlay"] - 1:]
    result["checked_pages"] = checked
    if spec["eq_alt_calls"] != 1 or spec["custom_symbol"]:
        result["issues"].append(
            "Multiple eq-alt calls or a custom relation need manual mapping."
        )
    if len(checked) < spec["equation_states"]:
        result["issues"].append(
            "Fewer PDF reveals than authored equation states."
        )
    if not checked:
        result["status"] = "unverified"
        return result
    candidates = relation_candidates(pages[checked[0]], geometry)
    result["first_page_candidates"] = candidates
    if not candidates:
        result["issues"].append(
            "No main math '=' in the stage on its first page."
        )
        result["status"] = "unverified"
        return result
    largest = max(char["size"] for char in candidates)
    primary = [
        char for char in candidates if abs(char["size"] - largest) < 0.1
    ]
    if len(primary) != 1:
        result["issues"].append(
            "Multiple full-size stage relations; anchor identity is ambiguous."
        )
        result["status"] = "unverified"
        return result
    anchor = primary[0]
    result["anchor"] = anchor
    if abs(anchor["size"] - spec["nominal_font_size"]) > 0.3:
        result["issues"].append(
            "Selected font differs from the stage font; verify scaling."
        )
    states = []
    for index, page_number in enumerate(checked):
        matches = [
            char for char in relation_candidates(pages[page_number], geometry)
            if abs(char["size"] - anchor["size"]) < 0.15
            and abs(char["x"] - anchor["x"]) <= 50
            and abs(char["y"] - anchor["y"]) <= 50
        ]
        matches.sort(key=lambda char: (
            (char["x"] - anchor["x"]) ** 2
            + (char["y"] - anchor["y"]) ** 2
        ))
        state = {
            "page": page_number,
            "equation_state": min(index + 1, spec["equation_states"]),
            "after_equation_sequence": index >= spec["equation_states"],
        }
        if not matches:
            result["issues"].append(
                f"Main relation missing on page {page_number}."
            )
            state["origin"] = None
        else:
            match = matches[0]
            if len(matches) > 1:
                distances = [
                    ((char["x"] - anchor["x"]) ** 2
                     + (char["y"] - anchor["y"]) ** 2) ** 0.5
                    for char in matches[:2]
                ]
                if abs(distances[0] - distances[1]) < tolerance:
                    result["issues"].append(
                        f"Ambiguous relation tracking on page {page_number}."
                    )
            state["origin"] = [match["x"], match["y"]]
            state["font_size"] = match["size"]
        states.append(state)
    result["states"] = states
    origins = [state["origin"] for state in states if state["origin"]]
    if origins:
        dx = max(point[0] for point in origins) - min(p[0] for p in origins)
        dy = max(point[1] for point in origins) - min(p[1] for p in origins)
        result["horizontal_drift_pt"] = dx
        result["vertical_drift_pt"] = dy
        if dx > tolerance or dy > tolerance:
            result["issues"].append(
                f"Anchor drift exceeds {tolerance:.3f} pt: "
                f"horizontal {dx:.6f}, vertical {dy:.6f} pt."
            )
    result["status"] = "pass" if not result["issues"] else "fail"
    return result


def text_overflow(
    page: dict[str, Any],
    geometry: dict[str, float],
    tolerance: float = 0.75,
) -> list[dict[str, Any]]:
    """Flag text outside the body, separating margin and page/sidebar risks."""
    issues = []
    for line in page["lines"]:
        body = [
            char for char in line if char["text"].strip()
            and char["y"] > geometry["header_bottom"] + 0.5
            and not (
                char["x"] >= geometry["sidebar_left"] - 6.5
                and char["size"] <= geometry["sidebar_font_max"] + 0.5
            )
        ]
        if not body:
            continue
        bbox = [
            min(char["bbox"][0] for char in body),
            min(char["bbox"][1] for char in body),
            max(char["bbox"][2] for char in body),
            max(char["bbox"][3] for char in body),
        ]
        edges = []
        for name, actual, limit in (
            ("left", -bbox[0], -geometry["body_left"]),
            ("right", bbox[2], geometry["body_right"]),
            ("bottom", bbox[3], geometry["body_bottom"]),
        ):
            if actual > limit + tolerance:
                edges.append(name)
        if not edges:
            continue
        critical = (
            bbox[0] < -tolerance
            or bbox[2] > geometry["sidebar_rail_left"] + tolerance
            or bbox[3] > geometry["page_height"] + tolerance
        )
        issues.append({
            "severity": "page_or_sidebar_overlap" if critical else "margin",
            "edges": edges,
            "bbox": bbox,
            "text": "".join(char["text"] for char in line).strip(),
        })
    return issues


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def markdown_report(report: dict[str, Any]) -> str:
    lines = [
        "# Lecture layout verification",
        "",
        f"**Overall result: {report['status'].upper()}**",
        "",
        f"Checked {report['pdf_pages']} physical PDF pages and "
        f"{len(report['equations'])} frames containing `eq-alt`.",
        "The relation origin is its left baseline point. Its full range "
        "is measured across every equation reveal and all following reveals.",
        "",
        "## Equation anchors",
        "",
        "| Frame | Pages | States | Horizontal drift (pt) "
        "| Vertical drift (pt) "
        "| Result |",
        "|---|---|---:|---:|---:|---|",
    ]
    for equation in report["equations"]:
        pages = equation["checked_pages"]
        page_range = f"{pages[0]}-{pages[-1]}" if pages else "none"
        dx = equation.get("horizontal_drift_pt")
        dy = equation.get("vertical_drift_pt")
        dx_text = f"{dx:.6f}" if dx is not None else "unverified"
        dy_text = f"{dy:.6f}" if dy is not None else "unverified"
        lines.append(
            f"| {equation['id']} | {page_range} | "
            f"{equation['source']['equation_states']} | {dx_text} | "
            f"{dy_text} | {equation['status']} |"
        )
    for equation in report["equations"]:
        if equation["issues"]:
            lines.extend(["", f"### {equation['id']}", ""])
            lines.extend(f"- {issue}" for issue in equation["issues"])
    geometry = report["geometry_pt"]
    lines.extend([
        "",
        "## Text bounds",
        "",
        f"Body x = {geometry['body_left']:.3f} to "
        f"{geometry['body_right']:.3f} pt; body bottom = "
        f"{geometry['body_bottom']:.3f} pt. Sidebar begins at "
        f"{geometry['sidebar_left']:.3f} pt.",
        "Header text and the template's small sidebar navigation/badges are "
        "excluded. A 0.75 pt allowance avoids font-metric overhang noise.",
        "",
    ])
    if not report["overflow"]:
        lines.append("No extracted body text extends beyond those bounds.")
    for issue in report["overflow"]:
        bbox = ", ".join(f"{value:.3f}" for value in issue["bbox"])
        lines.append(
            f"- **{issue['frame']}**, pages {issue['pages']}: "
            f"{issue['severity']}; {', '.join(issue['edges'])}; "
            f"bbox [{bbox}]. Text: {issue['text']}"
        )
    lines.extend(["", "## Source/build consistency", ""])
    lines.extend(f"- {issue}" for issue in report["consistency_issues"])
    if not report["consistency_issues"]:
        lines.append("Source frame IDs, PDF page count, and frame map agree.")
    lines.extend([
        "",
        "## Scope and limits",
        "",
        "- Stage search band: baseline y = 65-155 pt. The first reveal must "
        "have one full-size math relation in this band. Smaller summation "
        "subscripts and prompt/footer relations cannot become the anchor.",
        "- Alignment tolerance: 0.3 pt in each direction by default. Missing, "
        "ambiguous, custom-symbol, or multiple-derivation frames fail review.",
        "- These checks measure PDF glyph positions and text bounding boxes. "
        "They do not prove that all vector artwork, images, or clipping paths "
        "are correct. Visual slide inspection remains necessary.",
        "- The JSON records candidate glyphs, every selected state, file "
        "hashes, and exact tolerances so the result is auditable.",
        "",
    ])
    return "\n".join(lines)


def verify(
    project: Path,
    tolerance: float,
    view: str = "lecture",
) -> dict[str, Any]:
    source_path = project / "slides.typ"
    is_handout = view == "handout"
    pdf_name = "handout-reveals.pdf" if is_handout else "lecture.pdf"
    map_name = "handout-frames.json" if is_handout else "frames.json"
    pdf_path = project / "build" / pdf_name
    map_path = project / "build" / map_name
    source = source_frames(
        source_path.read_text(encoding="utf-8"),
        (project / "slide-tools.typ").read_text(encoding="utf-8"),
    )
    settings = project / "scl-beamer/core/settings.typ"
    geometry = theme_geometry(settings.read_text(encoding="utf-8"))
    manifest = json.loads(map_path.read_text(encoding="utf-8"))
    consistency = []
    frame_ids = [frame["id"] for frame in manifest["frames"]]
    expected_ids = [
        key for key, item in source.items()
        if is_handout or not item["handout_only"]
    ]
    if expected_ids != frame_ids:
        consistency.append(
            f"Source frame order/IDs differ from {map_name} for {view}."
        )
    if source_path.stat().st_mtime > pdf_path.stat().st_mtime:
        consistency.append(
            f"slides.typ is newer than {pdf_name}; rebuild first."
        )
    if map_path.stat().st_mtime < pdf_path.stat().st_mtime:
        consistency.append(
            f"{map_name} is older than {pdf_name}; rebuild first."
        )
    report: dict[str, Any] = {
        "view": view,
        "alignment_tolerance_pt": tolerance,
        "overflow_tolerance_pt": 0.75,
        "stage_y_pt": STAGE_Y,
        "geometry_pt": geometry,
        "consistency_issues": consistency,
        "equations": [],
        "overflow": [],
        "sha256": {
            path.name: digest(path) for path in (
                source_path, pdf_path, map_path, settings
            )
        },
    }
    with pymupdf.open(pdf_path) as pdf:
        report["pdf_pages"] = len(pdf)
        if len(pdf) != manifest["total_pdf_pages"]:
            consistency.append("PDF page count differs from frames.json.")
        if abs(pdf[0].rect.width - geometry["page_width"]) > 0.1:
            consistency.append("PDF page width differs from theme settings.")
        if abs(pdf[0].rect.height - geometry["page_height"]) > 0.1:
            consistency.append("PDF page height differs from theme settings.")
        pages = {
            number + 1: page_text(page) for number, page in enumerate(pdf)
        }
    grouped: dict[tuple[Any, ...], dict[str, Any]] = {}
    for frame in manifest["frames"]:
        spec = source.get(frame["id"])
        if spec and spec["eq_alt_calls"]:
            report["equations"].append(
                check_alignment(frame, spec, pages, geometry, tolerance)
            )
        for page_number in frame["pages"]:
            if page_number not in pages:
                consistency.append(f"Mapped page {page_number} is missing.")
                continue
            for issue in text_overflow(pages[page_number], geometry):
                key = (
                    frame["id"], issue["text"], issue["severity"],
                    tuple(round(value, 2) for value in issue["bbox"]),
                )
                if key not in grouped:
                    grouped[key] = {**issue, "frame": frame["id"], "pages": []}
                grouped[key]["pages"].append(page_number)
    report["overflow"] = list(grouped.values())
    passed = all(item["status"] == "pass" for item in report["equations"])
    report["status"] = (
        "pass" if passed and not consistency and not grouped else "review"
    )
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--project", type=Path, default=Path(__file__).resolve().parent
    )
    parser.add_argument("--tolerance", type=float, default=0.3)
    parser.add_argument(
        "--view", choices=("lecture", "handout"), default="lecture"
    )
    args = parser.parse_args()
    try:
        report = verify(args.project.resolve(), args.tolerance, args.view)
    except (OSError, RuntimeError, ValueError, KeyError, IndexError) as error:
        print(f"Layout audit could not complete: {error}", file=sys.stderr)
        return 2
    output = args.project.resolve() / "validation"
    output.mkdir(parents=True, exist_ok=True)
    stem = "layout-handout" if args.view == "handout" else "layout"
    (output / f"{stem}.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    (output / f"{stem}.md").write_text(
        markdown_report(report), encoding="utf-8"
    )
    failed = [item["id"] for item in report["equations"] if item["issues"]]
    print(
        f"Layout ({args.view}): {report['status']}; "
        f"{len(report['equations'])} eq-alt "
        f"frames, {len(failed)} anchor issues, "
        f"{len(report['overflow'])} text-bound findings."
    )
    if failed:
        print("Anchor review:", ", ".join(failed))
    print(output / f"{stem}.md")
    print(output / f"{stem}.json")
    return 0 if report["status"] == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())
