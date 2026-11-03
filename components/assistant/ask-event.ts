// Window event that opens the "Ask Bibs" sheet; dispatched by the tab bar's Ask tab.
export const ASK_EVENT = "bibs:ask";
export const openAssistant = () => window.dispatchEvent(new Event(ASK_EVENT));
