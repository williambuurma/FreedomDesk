# Prototype Archive

These are non-shipping, historical prototype/demo pipeline artifacts. They are kept for reference only and should not be treated as active product architecture.

Nothing in this folder is imported by the application, the API, or the test suite. Do not wire product code to these files.

## Contents

| File | Origin | Notes |
|------|--------|-------|
| `new-patient-alignment.json` | Demo audio alignment | Contains a prepended instruction note; not valid standalone JSON |
| `clean-new-patient-alignment.json` | Demo audio alignment | Cleaned start-time values snapshot |
| `new-patient-starts.json` | Demo audio alignment | Intermediate Whisper alignment output |
| `transcription-raw.json` | Demo audio transcription | Raw Whisper transcript dump (was `audio/transcription-raw.json`) |

These were produced while timing the New Patient demo call for `demo-player.js`. The shipped demo player and audio assets remain at the repo root and in `audio/`; regenerate timing data with `scripts/align_new_patient.py` if needed.
