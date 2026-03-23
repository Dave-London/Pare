import { select, checkbox } from "@inquirer/prompts";
import { getClients, type ClientEntry } from "./clients.js";
import { PRESETS } from "./presets.js";
import { SERVERS, type ServerEntry } from "./servers.js";
import { detectClients, detectProjectType } from "./detect.js";

/** Prompt user to select a target client. Pre-selects detected ones. */
export async function promptClient(): Promise<ClientEntry> {
  const detected = detectClients();
  const detectedIds = new Set(detected.map((c) => c.id));
  const allClients = getClients();

  const choices = allClients.map((c) => ({
    name: detectedIds.has(c.id) ? `${c.name} (detected)` : c.name,
    value: c.id,
  }));

  // Default to first detected client, or first in list
  const defaultClient = detected[0]?.id ?? allClients[0].id;

  const clientId = await select({
    message: "Which AI client do you want to configure?",
    choices,
    default: defaultClient,
  });

  return allClients.find((c) => c.id === clientId)!;
}

/** Prompt user to select a preset or custom server set. */
export async function promptServers(projectDir?: string): Promise<ServerEntry[]> {
  const detection = detectProjectType(projectDir);

  if (detection.suggestedPreset && detection.ecosystems.length > 0) {
    const presetLabel =
      PRESETS.find((p) => p.id === detection.suggestedPreset)?.label ?? detection.suggestedPreset;
    const ecosystemNames = detection.ecosystems.join(", ");
    // eslint-disable-next-line no-console
    console.log(`Detected: ${ecosystemNames} project. Suggested preset: ${presetLabel}`);
  }

  const defaultPreset = detection.suggestedPreset ?? "web";

  const presetChoices = PRESETS.map((p) => ({
    name:
      p.id === detection.suggestedPreset
        ? `${p.label} — ${p.description} (detected)`
        : `${p.label} — ${p.description}`,
    value: p.id,
  }));
  presetChoices.push({ name: "Custom — pick individual servers", value: "custom" });

  const selection = await select({
    message: "Which servers do you want to install?",
    choices: presetChoices,
    default: defaultPreset,
  });

  if (selection === "custom") {
    const serverIds = await checkbox({
      message: "Select servers to install:",
      choices: SERVERS.map((s) => ({
        name: `${s.label} (${s.pkg})`,
        value: s.id,
        checked: s.id === "pare-git",
      })),
    });

    if (serverIds.length === 0) {
      console.error("No servers selected. Exiting.");
      process.exit(1);
    }

    return SERVERS.filter((s) => serverIds.includes(s.id));
  }

  const preset = PRESETS.find((p) => p.id === selection)!;
  return SERVERS.filter((s) => preset.serverIds.includes(s.id));
}
