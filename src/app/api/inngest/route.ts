import { serve } from "inngest/next";

import { inngest } from "@/lib/inngest/client";
import { cortexInitialAnalysis } from "@/lib/inngest/functions/cortex-initial-analysis";
import { runLabsExperiment } from "@/lib/inngest/functions/run-labs-experiment";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [runLabsExperiment, cortexInitialAnalysis]
});
