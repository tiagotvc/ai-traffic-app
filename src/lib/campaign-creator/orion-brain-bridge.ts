export const ORION_BRAIN_OPEN_EVENT = "orion-creator-brain-open";

export function requestOpenOrionBrainModal() {
  window.dispatchEvent(new CustomEvent(ORION_BRAIN_OPEN_EVENT));
}

export function openOrionBrainBenchmark() {
  const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
  if (isDesktop) {
    const sidebar = document.querySelector(".campaign-creator-sidebar");
    const brainSection = sidebar?.querySelector("[data-orion-brain-tips]");
    if (brainSection) {
      brainSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else {
      sidebar?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }
  requestOpenOrionBrainModal();
}
