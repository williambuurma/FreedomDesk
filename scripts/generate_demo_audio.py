#!/usr/bin/env python3
"""Generate FreedomDesk demo call audio segments.

NOTE: macOS `say` produces robotic output — suitable for dev timing tests only.
For the public site, use recorded audio or a natural voice provider (ElevenLabs,
PlayHT, etc.) and set `"audioAvailable": true` in manifest.json.

Voice direction: Aly — calm dental front desk, early 30s, Midwest-friendly,
conversational, professional. Not robotic, not overly cheerful.
"""

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIO_DIR = ROOT / "audio"
MANIFEST_PATH = AUDIO_DIR / "manifest.json"

AGENT_VOICE = "Samantha"
PATIENT_VOICE = "Alex"
AGENT_RATE = 154
PATIENT_RATE = 168
SEGMENT_GAP = 0.45

SCENARIOS = {
    "new-patient-exam": {
        "title": "New Patient Exam",
        "lines": [
            ("agent", "Thank you for calling Buurma Family Dentistry. This is Aly. How can I help you today?"),
            ("patient", "Hi, I'd like to schedule a new patient exam. I just moved to the area."),
            ("agent", "We'd love to welcome you. Have you been to our office before?"),
            ("patient", "No, this would be my first visit."),
            ("agent", "Perfect. Can I start with your full name?"),
            ("patient", "Finn Leo."),
            ("agent", "Thanks, Finn Leo. And what's the best phone number to reach you?"),
            ("patient", "616-555-0142."),
            ("agent", "Great. Do you have dental insurance you'd like us to have on file before your visit?"),
            ("patient", "Yes, I have Delta Dental PPO."),
            (
                "agent",
                "Perfect. For a new patient exam, we set aside about an hour. I have Thursday at 9 AM or next Tuesday at 2 PM — would either work?",
            ),
            ("patient", "Thursday at 9 works for me."),
            (
                "agent",
                "You're all set for Thursday at 9 AM. We'll send a confirmation text, and if you could arrive about 15 minutes early for your paperwork, that would be great.",
            ),
            ("patient", "Sounds good. Thank you so much."),
            ("agent", "We're looking forward to meeting you, Finn Leo. Have a wonderful day."),
        ],
    },
    "toothache": {
        "title": "After-Hours Toothache Emergency",
        "lines": [
            (
                "agent",
                "Thank you for calling Buurma Family Dentistry. You've reached our after-hours line. This is Aly. How can I help you?",
            ),
            (
                "patient",
                "Hi, my name is Finn Leo. I've had a really bad toothache since last night and it's getting worse.",
            ),
            ("agent", "I'm so sorry you're dealing with that. Are you having any swelling or fever with the pain?"),
            ("patient", "No fever, but it's a sharp pain on my lower left side."),
            (
                "agent",
                "Okay, thank you for letting me know. I'm going to flag this as urgent for our on-call team right away.",
            ),
            ("agent", "Can I get the best phone number to reach you in case we get disconnected?"),
            ("patient", "Yes, it's 616-555-0198."),
            (
                "agent",
                "Got it. Someone from our team will call you back as soon as possible. If the pain becomes severe, you develop swelling or a fever, please seek urgent care or your dentist's emergency line right away.",
            ),
            ("patient", "Okay, I understand. Thank you."),
            ("agent", "Hang in there, Finn Leo. We'll be in touch soon."),
        ],
    },
}


def run(cmd):
    subprocess.run(cmd, check=True)


def get_duration(path: Path) -> float:
    out = subprocess.check_output(["afinfo", str(path)], text=True)
    match = re.search(r"estimated duration: ([0-9.]+) sec", out)
    if not match:
        raise RuntimeError(f"Could not read duration for {path}")
    return float(match.group(1))


def synthesize_line(text: str, speaker: str, dest_aiff: Path):
    voice = AGENT_VOICE if speaker == "agent" else PATIENT_VOICE
    rate = str(AGENT_RATE if speaker == "agent" else PATIENT_RATE)
    run(["say", "-v", voice, "-r", rate, "-o", str(dest_aiff), text])


def convert_to_m4a(src_aiff: Path, dest_m4a: Path):
    run(["afconvert", "-f", "m4af", "-d", "aac", str(src_aiff), str(dest_m4a)])


def build_scenario(key: str, data: dict) -> dict:
    scenario_dir = AUDIO_DIR / key
    scenario_dir.mkdir(parents=True, exist_ok=True)

    segments = []
    cursor = 0.0

    for index, (speaker, text) in enumerate(data["lines"]):
        aiff = scenario_dir / f"{index:02d}.aiff"
        m4a = scenario_dir / f"{index:02d}.m4a"
        synthesize_line(text, speaker, aiff)
        convert_to_m4a(aiff, m4a)
        duration = get_duration(m4a)
        aiff.unlink(missing_ok=True)

        segments.append(
            {
                "index": index,
                "speaker": speaker,
                "text": text,
                "file": f"audio/{key}/{index:02d}.m4a",
                "duration": round(duration, 3),
                "start": round(cursor, 3),
            }
        )
        cursor += duration + SEGMENT_GAP

    return {
        "title": data["title"],
        "duration": round(cursor - SEGMENT_GAP, 3),
        "segments": segments,
    }


def main():
    if sys.platform != "darwin":
        print("Audio generation requires macOS `say` and `afconvert`.")
        sys.exit(1)

    manifest = {"audioAvailable": True}
    for key, data in SCENARIOS.items():
        print(f"Generating {key}…")
        manifest[key] = build_scenario(key, data)
        print(f"  → {manifest[key]['duration']}s, {len(manifest[key]['segments'])} segments")

    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2))
    print(f"Wrote {MANIFEST_PATH}")


if __name__ == "__main__":
    main()
