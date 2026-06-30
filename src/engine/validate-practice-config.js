"use strict";

const REQUIRED_STRING_FIELDS = ["practiceId", "name", "timezone"];

const REQUIRED_ADDRESS_FIELDS = ["street", "city", "state", "zip"];

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validatePracticeConfig(practiceConfig) {
  const errors = {};

  if (!practiceConfig || typeof practiceConfig !== "object") {
    return { practiceConfig: "Practice config object is required." };
  }

  for (const field of REQUIRED_STRING_FIELDS) {
    if (!isNonEmptyString(practiceConfig[field])) {
      errors[field] = "This field is required.";
    }
  }

  if (!practiceConfig.address || typeof practiceConfig.address !== "object") {
    errors.address = "Address object is required.";
  } else {
    for (const field of REQUIRED_ADDRESS_FIELDS) {
      if (!isNonEmptyString(practiceConfig.address[field])) {
        errors[`address.${field}`] = "This field is required.";
      }
    }
  }

  if (
    !practiceConfig.greeting ||
    typeof practiceConfig.greeting !== "object" ||
    !isNonEmptyString(practiceConfig.greeting.businessHours)
  ) {
    errors["greeting.businessHours"] = "This field is required.";
  }

  return errors;
}

function formatValidationErrors(errors) {
  return Object.entries(errors)
    .map(([field, message]) => `${field}: ${message}`)
    .join("; ");
}

function assertValidPracticeConfig(practiceConfig) {
  const errors = validatePracticeConfig(practiceConfig);
  if (Object.keys(errors).length > 0) {
    throw new Error(
      `Invalid practice config — ${formatValidationErrors(errors)}`
    );
  }
}

module.exports = {
  validatePracticeConfig,
  assertValidPracticeConfig,
  formatValidationErrors,
};
