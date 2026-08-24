import { requireAppShellContext } from "@/lib/api-auth";
import { CreativeVideoView } from "@/components/creative-studio/CreativeVideoView";

export default async function CreativeVideoPage() {
  await requireAppShellContext();
  return <CreativeVideoView />;
}
