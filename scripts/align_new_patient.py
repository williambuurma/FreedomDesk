#!/usr/bin/env python3
"""Align New Patient demo transcript turns to whisper segment starts."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / "audio" / "New Patient" / "New Patient.flac"
LEAD = 0.35

TURNS = [
    "Thank you for calling Buurma Family Dentistry. This is Aly. How can I help you today?",
    "Hey, I just moved to the Grand Rapids area and I need a new dentist. I read your reviews and figured I'd call to see if I can book an appointment.",
    "Absolutely. We can definitely help you out. And welcome to Grand Rapids.",
    "Our front desk team is busy helping patients in the office right now, but I can get everything started for you and send your appointment request over for review.",
    "Can I start with your first and last name and date of birth?",
    "My name is Finn Leo and my birthday is May 11, 1995.",
    "Got it. What's the best phone number and email address to contact you?",
    "My phone number is 616-555-0198 and my email is finn123@gmail.com.",
    "And what are you hoping to do during this appointment? Just a routine exam and cleaning?",
    "Or is there anything specific you'd like the doctor to take a look at?",
    "Mostly a cleaning and check-up. I'm also wondering if there's anything we can do to make my smile better because I'm a sales rep and first impressions are everything for my job.",
    "Got it. I'll make a note for the doctor. Our doctors take pride in creating beautiful smiles for our patient family.",
    "Do you have dental insurance?",
    "I have Delta Dental.",
    "Can I get your member ID?",
    "DD48291.",
    "Got it. We'll verify your benefits before your appointment so everything is ready when you arrive.",
    "Give me just a moment while I check availability.",
    "I have an opening this Friday June 7th at 3pm with Dr. Buurma. Would that time work for you?",
    "Ah, I can't make that time.",
    "What about Monday?",
    "Let me take a look. I have an opening at 4pm on Monday June 10th with Dr. Buurma and we will be able to move you over to Hygiene right after. Would you like me to request 4pm?",
    "Yes, that would be great.",
    "Perfect. I've submitted your request.",
    "Our front desk team will review it shortly and send a confirmation email.",
    "If any adjustments need to be made, someone from the office will reach out to you directly.",
    "Great. Thank you.",
    "Please plan to arrive about 10 minutes early and bring your photo ID, insurance card, and a form of payment.",
    "One more thing. Once your request is reviewed, you'll receive new patient forms electronically. Please fill it out 24 hours ahead of time for our staff to update your patient chart.",
    "Okay, no problem.",
    "Is there anything else I can help you with today?",
    "No, I think that's everything.",
    "Great. Welcome to the practice, Finn. We're looking forward to meeting you.",
    "Thank you. Oh, one more question. What was your name again?",
    "My name is Aly. Have a wonderful day. Bye.",
    "Same to you, Aly. Bye.",
]


def normalize(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def token_set(text: str) -> set[str]:
    return {t for t in normalize(text).split() if len(t) > 2}


def overlap_score(a: str, b: str) -> float:
    ta, tb = token_set(a), token_set(b)
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def main() -> int:
    if not AUDIO.exists():
        print(f"Missing audio: {AUDIO}", file=sys.stderr)
        return 1

    try:
        import whisper
    except ImportError:
        print("openai-whisper is required", file=sys.stderr)
        return 2

    model = whisper.load_model("base")
    result = model.transcribe(str(AUDIO), word_timestamps=False, verbose=False)
    segments = result.get("segments", [])
    if not segments:
        print("No whisper segments", file=sys.stderr)
        return 3

    seg_idx = 0
    starts: list[float] = []

    for i, turn in enumerate(TURNS):
        if i == 0:
            starts.append(0.0)
            continue

        best_start = None
        best_score = 0.0
        search_from = seg_idx

        for j in range(search_from, min(search_from + 12, len(segments))):
            seg_text = segments[j].get("text", "").strip()
            score = overlap_score(turn, seg_text)
            if score > best_score:
                best_score = score
                best_start = float(segments[j]["start"])
                seg_idx = j

        if best_start is None:
            best_start = float(segments[min(seg_idx, len(segments) - 1)]["start"])

        cue = max(0.0, round(best_start - LEAD, 2))
        starts.append(cue)

    print(json.dumps({"duration": result.get("duration"), "starts": starts}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
