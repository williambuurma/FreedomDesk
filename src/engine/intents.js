"use strict";

const INTENTS = Object.freeze({
  NEW_PATIENT: "NEW_PATIENT",
  EMERGENCY: "EMERGENCY",
  SCHEDULE_EXISTING: "SCHEDULE_EXISTING",
});

const KNOWN_INTENTS = new Set(Object.values(INTENTS));

function isKnownIntent(intent) {
  return KNOWN_INTENTS.has(intent);
}

module.exports = {
  INTENTS,
  KNOWN_INTENTS,
  isKnownIntent,
};
