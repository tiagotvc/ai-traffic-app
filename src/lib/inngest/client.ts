import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "traffic-ai" });

export type LabsExperimentCreatedEvent = {
  name: "labs/experiment.created";
  data: {
    experimentId: string;
    tenantId: string;
    userId: string;
    selectedScientists: string[];
  };
};
