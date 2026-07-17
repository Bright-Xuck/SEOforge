import type { MissionTemplate } from "./types.js";

export const builtinMissionTemplates: MissionTemplate[] = [
  "Weekly Optimization",
  "Homepage Optimization",
  "Content Optimization",
  "Metadata Optimization",
  "Accessibility Audit",
  "Technical Audit",
  "Pre-Launch Audit",
  "Store Optimization",
].map((name) => {
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    id,
    name,
    version: "1.0.0",
    description: `Built-in mission template for ${name.toLowerCase()}.`,
    goal: {
      id: `goal-${id}`,
      title: name,
      description: `Execute the ${name.toLowerCase()} mission.`,
    },
    agentIds: [],
    objectiveKeywords: name.toLowerCase().split(/\s+/),
  };
});
