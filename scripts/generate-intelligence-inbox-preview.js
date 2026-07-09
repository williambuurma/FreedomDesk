/**
 * Generate Intelligence Inbox mock payload for the dashboard module.
 */
import fs from "node:fs";
import path from "node:path";
import { buildMockInboxPayload } from "../src/actions/mockData.ts";

const outPath = path.resolve(import.meta.dirname, "../data/intelligence-inbox-preview.json");
const payload = buildMockInboxPayload();
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n");
console.log(`Wrote ${payload.actions.length} inbox actions → ${outPath}`);
