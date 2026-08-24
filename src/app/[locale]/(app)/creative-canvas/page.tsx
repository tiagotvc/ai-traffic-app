import { requireAppShellContext } from "@/lib/api-auth";
import { CreativeCanvasView } from "@/components/creative-studio/CreativeCanvasView";

export default async function CreativeCanvasPage() {
  await requireAppShellContext();
  return <CreativeCanvasView />;
}
