import { AssistantSheet } from "@/components/assistant/assistant-sheet";
import { Backdrop } from "@/components/ui/pitch-lines";
import { TabBar } from "@/components/ui/tab-bar";
import { getViewer } from "./viewer";

export default async function SignedInLayout({ children }: LayoutProps<"/">) {
  await getViewer();
  return (
    <>
      <Backdrop />
      {/* Bottom padding clears the tab bar and the floating "Ask Bibs" button. */}
      <div className="mx-auto w-full max-w-md px-4 pb-40 pt-[max(1rem,env(safe-area-inset-top))]">{children}</div>
      <AssistantSheet />
      <TabBar />
    </>
  );
}
