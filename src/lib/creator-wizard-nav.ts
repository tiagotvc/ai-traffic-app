import type { CreatorNode } from "@/lib/campaign-draft";
import { CREATOR_NODE_ORDER } from "@/lib/campaign-draft";

/** Footer / wizard back: sub-section back uses subflow.goPrev(); first sub-section falls through to prevNode(). */
export function resolveCreatorBackNav(options: {
  addAdMode: boolean;
  addAdsetMode?: boolean;
  activeNode: CreatorNode;
  campaignIsFirst?: boolean;
}): { showBack: boolean; backEnabled: boolean } {
  if (options.addAdMode) {
    const onAd = options.activeNode === "ad";
    return { showBack: !onAd, backEnabled: !onAd };
  }
  if (options.addAdsetMode && options.activeNode === "adset") {
    return { showBack: false, backEnabled: false };
  }
  // Campaign objective is the first wizard step — no previous main node.
  if (options.activeNode === "campaign" && options.campaignIsFirst) {
    return { showBack: true, backEnabled: false };
  }
  return { showBack: true, backEnabled: true };
}

export function inferWizardActiveNode(visitedNodes: CreatorNode[]): CreatorNode {
  let last: CreatorNode = "campaign";
  for (const node of CREATOR_NODE_ORDER) {
    if (visitedNodes.includes(node)) last = node;
  }
  return last;
}
