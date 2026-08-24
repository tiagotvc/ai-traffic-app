import { requireAppShellContext } from "@/lib/api-auth";
import { CreativeLibraryView } from "@/components/creative-studio/CreativeLibraryView";

export default async function CreativeLibraryPage() {
  await requireAppShellContext();
  return <CreativeLibraryView />;
}
