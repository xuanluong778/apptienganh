import type { ChatPromptVariant } from "./chat";
import type { LearnerLevel } from "./types";

export type GetPromptOptions = {
  /** Override deterministic user split (e.g. manual test). */
  chatVariant?: ChatPromptVariant;
  /** When set with `type: "chat"`, `getPrompt` picks V1/V2 deterministically and logs usage. */
  userId?: number | null;
  /** Calibrates difficulty/tone (chat only); omit for default behavior. */
  learnerLevel?: LearnerLevel | null;
  /** User messages so far in this session (chat only); omit for neutral engagement tone. */
  sessionMessageCount?: number | null;
};
