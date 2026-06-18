import { serve } from "inngest/next";

import { inngest } from "@/lib/inngest/client";
import { runLabsExperiment } from "@/lib/inngest/functions/run-labs-experiment";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [runLabsExperiment]
});
