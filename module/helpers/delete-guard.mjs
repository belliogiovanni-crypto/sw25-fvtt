/**
 * Actor delete guard.
 *
 * World actors are only deleted after the GM confirms a dialog that lists
 * every actor in the batch and where the deletion came from (sidebar, folder,
 * a module, a macro...). Every confirmed or blocked deletion is written to the
 * console and whispered to the GMs, so an unexpected mass deletion can be
 * traced. Compendium actors and token (synthetic) actors are not affected.
 */

const SETTING = "actorDeleteGuard";
const ALLOW = "sw25AllowDelete";

let pending = [];
let pendingOrigin = "";
let flushTimer = null;

/** Best guess of who started the deletion, from the call stack. */
function deletionOrigin() {
  const frames = (new Error().stack ?? "").split("\n").slice(2);
  for (const line of frames) {
    const pkg = line.match(/\/(modules|systems)\/([^/]+)\//);
    if (pkg && pkg[2] !== game.system.id) return `${pkg[1] === "modules" ? "module" : "system"} "${pkg[2]}"`;
    if (/macro|eval|anonymous|VM\d+/i.test(line) && !/foundry|commons/i.test(line)) return "macro / script";
  }
  if (frames.some((l) => /Folder|deleteSubfolders|deleteContents/.test(l))) return "folder deletion";
  return "Foundry (sidebar or manual action)";
}

function report(text) {
  console.warn(`SW25 | ${text}`);
  const gms = game.users.filter((u) => u.isGM).map((u) => u.id);
  ChatMessage.create({
    whisper: gms,
    speaker: { alias: "SW25" },
    content: `<p><strong>${game.i18n.localize("SW25.DeleteGuard.Log")}</strong></p><p>${text}</p>`,
  });
}

async function flush() {
  flushTimer = null;
  const batch = pending;
  const origin = pendingOrigin;
  pending = [];
  pendingOrigin = "";
  const actors = batch.map((id) => game.actors.get(id)).filter(Boolean);
  if (!actors.length) return;

  const names = actors.map((a) => foundry.utils.escapeHTML(a.name));
  const list = names.length > 30 ? [...names.slice(0, 30), `… (+${names.length - 30})`] : names;
  const content =
    `<p>${game.i18n.format("SW25.DeleteGuard.Question", { count: actors.length })}</p>` +
    `<ul>${list.map((n) => `<li>${n}</li>`).join("")}</ul>` +
    `<p><em>${game.i18n.localize("SW25.DeleteGuard.Origin")}: ${origin}</em></p>`;

  const ok = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("SW25.DeleteGuard.Title") },
    content,
    rejectClose: false,
    modal: true,
  });

  const summary = `${actors.length} — ${names.join(", ")} — ${origin} — ${game.user.name}`;
  if (!ok) {
    report(`${game.i18n.localize("SW25.DeleteGuard.Blocked")}: ${summary}`);
    return;
  }
  report(`${game.i18n.localize("SW25.DeleteGuard.Deleted")}: ${summary}`);
  await Actor.implementation.deleteDocuments(
    actors.map((a) => a.id),
    { [ALLOW]: true }
  );
}

export function registerDeleteGuard() {
  game.settings.register("sw25", SETTING, {
    name: game.i18n.localize("SETTING.actorDeleteGuard.name"),
    hint: game.i18n.localize("SETTING.actorDeleteGuard.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  Hooks.on("preDeleteActor", (actor, options, userId) => {
    if (userId !== game.user.id) return;
    if (actor.pack || actor.isToken) return;
    if (options?.[ALLOW]) return;
    if (!game.settings.get("sw25", SETTING)) return;

    if (!pending.includes(actor.id)) pending.push(actor.id);
    if (!pendingOrigin) pendingOrigin = deletionOrigin();
    if (!flushTimer) flushTimer = setTimeout(flush, 0);
    return false;
  });

  // "Delete all" on an actor folder removes its actors on the server, without
  // a preDeleteActor call: guard the folder deletion itself.
  Hooks.on("preDeleteFolder", (folder, options, userId) => {
    if (userId !== game.user.id) return;
    if (folder.pack || folder.type !== "Actor") return;
    if (!options?.deleteContents || options?.[ALLOW]) return;
    if (!game.settings.get("sw25", SETTING)) return;

    const actors = folderActors(folder);
    if (!actors.length) return;
    confirmFolder(folder, actors, options, deletionOrigin());
    return false;
  });
}

function folderActors(folder) {
  const out = [...folder.contents];
  for (const sub of folder.getSubfolders?.(true) ?? folder.children?.map((c) => c.folder) ?? []) {
    out.push(...(sub.contents ?? []));
  }
  return out;
}

async function confirmFolder(folder, actors, options, origin) {
  const names = actors.map((a) => foundry.utils.escapeHTML(a.name));
  const list = names.length > 30 ? [...names.slice(0, 30), `… (+${names.length - 30})`] : names;
  const content =
    `<p>${game.i18n.format("SW25.DeleteGuard.FolderQuestion", {
      folder: foundry.utils.escapeHTML(folder.name),
      count: actors.length,
    })}</p>` +
    `<ul>${list.map((n) => `<li>${n}</li>`).join("")}</ul>` +
    `<p><em>${game.i18n.localize("SW25.DeleteGuard.Origin")}: ${origin}</em></p>`;
  const ok = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("SW25.DeleteGuard.Title") },
    content,
    rejectClose: false,
    modal: true,
  });
  const summary = `${folder.name} (${actors.length}) — ${names.join(", ")} — ${origin} — ${game.user.name}`;
  if (!ok) {
    report(`${game.i18n.localize("SW25.DeleteGuard.Blocked")}: ${summary}`);
    return;
  }
  report(`${game.i18n.localize("SW25.DeleteGuard.Deleted")}: ${summary}`);
  await folder.delete({ ...options, [ALLOW]: true });
}
