// Typed UI messages for useChat: tool parts are typed from the real tool definitions, so the client
// renders cards from `part.output` with full type safety. Import this file with `import type` only.
import type { InferUITools, UIDataTypes, UIMessage } from "ai";
import type { BibsTools } from "./tools";

export type BibsUITools = InferUITools<BibsTools>;
export type BibsUIMessage = UIMessage<unknown, UIDataTypes, BibsUITools>;
export type SearchOutput = BibsUITools["search_games"]["output"];
export type ProposeOutput = BibsUITools["propose_booking"]["output"];
