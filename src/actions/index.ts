/**
 * Action Model — public API.
 */

export {
  ACTION_SCHEMA_VERSION,
  type Action,
  type ActionLifecycleStatus,
  type InboxStatus,
  type ActionCategory,
  type InboxCard,
} from "./types.ts";

export {
  materializeActionFromEvent,
  type MaterializeActionOptions,
} from "./fromOperationalEvent.ts";

export {
  MOCK_INBOX_PRACTICE_ID,
  MOCK_OPERATIONAL_EVENTS,
  buildMockInboxActions,
  buildMockInboxPayload,
} from "./mockData.ts";

export { actionToInboxCard } from "./inboxCard.ts";
