/**
 * Simplified Combat battle board (Core Rulebook I p. 120-130, 145-146, 160-164).
 *
 * A scene becomes a battle board when it has the flag `flags.sw25.areas.enabled = true`. The scene is split
 * into three equal horizontal bands: by default the enemy rearguard on top, the front line in the middle and
 * the PC rearguard at the bottom (`flags.sw25.areas.enemySide = "bottom"` swaps the two rearguards).
 *
 * The combat tracker shows the area of every combatant, and rolls with targets add the target's area and
 * a warning when the target is out of reach or the shot may stray. Warnings never block the roll.
 */

export const AREA_KEYS = ["enemyRear", "front", "pcRear"];

/** @returns {{enabled: boolean, enemySide: "top"|"bottom"}|null} */
export function boardConfig(scene) {
  const cfg = scene?.getFlag?.("sw25", "areas");
  if (!cfg?.enabled) return null;
  return { enabled: true, enemySide: cfg.enemySide === "bottom" ? "bottom" : "top" };
}

/** "pc" for player characters and friendly tokens, "enemy" for everyone else. */
export function factionOfToken(tokenDoc) {
  if (!tokenDoc) return null;
  if (tokenDoc.actor?.type === "character") return "pc";
  if (tokenDoc.disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY) return "pc";
  return "enemy";
}

/**
 * Area of a token on a battle board.
 * @param {TokenDocument} tokenDoc
 * @returns {"enemyRear"|"front"|"pcRear"|null}
 */
export function areaOf(tokenDoc) {
  const scene = tokenDoc?.parent;
  const cfg = boardConfig(scene);
  if (!cfg) return null;
  const d = scene.dimensions;
  if (!d) return null;
  const size = d.size ?? 100;
  const cy = Number(tokenDoc.y) + (Number(tokenDoc.height ?? 1) * size) / 2;
  const rel = (cy - d.sceneY) / d.sceneHeight;
  let band = Math.max(0, Math.min(2, Math.floor(rel * 3)));
  if (cfg.enemySide === "bottom") band = 2 - band;
  return AREA_KEYS[band];
}

export function areaLabel(area) {
  return area ? game.i18n.localize(`SW25.Areas.${area}`) : "";
}

/** Distance in areas between two area keys. */
function distance(a, b) {
  return Math.abs(AREA_KEYS.indexOf(a) - AREA_KEYS.indexOf(b));
}

/** Tokens of both factions in an area of the scene → it is a skirmish area. */
function isSkirmish(scene, area) {
  const factions = new Set();
  for (const t of scene.tokens) {
    if (t.hidden || !t.actor) continue;
    if (areaOf(t) === area) factions.add(factionOfToken(t));
  }
  return factions.size > 1;
}

function enemiesInFront(scene, myFaction) {
  for (const t of scene.tokens) {
    if (t.hidden || !t.actor) continue;
    if (areaOf(t) === "front" && factionOfToken(t) !== myFaction) return true;
  }
  return false;
}

function hasFeat(actor, name) {
  const n = name.toLowerCase();
  return !!actor?.items?.some((i) => i.type === "combatability" && String(i.name).trim().toLowerCase() === n);
}

/**
 * Reach of an item in Simplified Combat.
 * Accepts the raw book notation ("2(30m)/Shot", "Touch") and the Italian text used by the private library
 * ("Fino a 2 aree di distanza · Tiro", "Stessa area (contatto)").
 * @returns {{kind: "melee"|"touch"|"range"|"self"|null, areas: number, shot: boolean, line: boolean}}
 */
export function reachOf(item) {
  const none = { kind: null, areas: 0, shot: false, line: false };
  if (!item) return none;
  let text = "";
  if (item.type === "weapon") text = String(item.system.range ?? "").trim();
  else text = String(item.system.rangeshape ?? item.system.range ?? "").trim();
  const shot = /Shot|Tiro/i.test(text);
  const line = /Line|Linea/i.test(text);
  if (item.type === "weapon") {
    const n = text.match(/(\d)/);
    if (n) return { kind: "range", areas: Number(n[1]), shot: true, line };
    // Thrown-type stances without a range are left undetermined.
    if (/T$/.test(String(item.system.usage ?? ""))) return none;
    return { kind: "melee", areas: 0, shot: false, line: false };
  }
  if (!text) return none;
  if (/^(Caster|Su di te|Centrata su di te)/i.test(text)) return { kind: "self", areas: 0, shot, line };
  if (/Touch|contatto/i.test(text)) return { kind: "touch", areas: 0, shot, line };
  const n = text.match(/^(\d)|Fino a (\d)/i);
  if (n) return { kind: "range", areas: Number(n[1] ?? n[2]), shot, line };
  return none;
}

function attackerToken(actor) {
  if (!actor) return null;
  const scene = canvas?.scene;
  const controlled = canvas?.tokens?.controlled?.find((t) => t.actor?.id === actor.id);
  if (controlled) return controlled.document;
  const active = actor.getActiveTokens?.(false, true)?.find((t) => t.parent?.id === scene?.id);
  return active ?? null;
}

/**
 * Text added after a target's name in roll chat cards: its area and, if the attacker's item is known,
 * a warning when it is out of reach or the shot may stray.
 * @param {Actor} actor  the acting actor
 * @param {Item|null} item  the item used, if any
 * @param {Token} target  a target (canvas Token or TokenDocument)
 */
export function areaNote(actor, item, target) {
  try {
    const tDoc = target?.document ?? target;
    const tArea = areaOf(tDoc);
    if (!tArea) return "";
    const L = (k) => game.i18n.localize(`SW25.Areas.${k}`);
    let note = ` <span class="sw25-area-tag">[${areaLabel(tArea)}]</span>`;
    const me = attackerToken(actor);
    const myArea = me ? areaOf(me) : null;
    const reach = reachOf(item);
    if (!myArea || !reach.kind || reach.kind === "self") return note;
    const dist = distance(myArea, tArea);
    const warn = [];
    if ((reach.kind === "melee" || reach.kind === "touch") && dist > 0) warn.push(L("OutMelee"));
    if (reach.kind === "range") {
      if (dist > reach.areas) warn.push(L("OutRange").replaceAll("{n}", reach.areas));
      else if (dist === 2 && enemiesInFront(tDoc.parent, factionOfToken(me)) && !hasFeat(actor, "Hawk Eye")) warn.push(L("HawkEye"));
      if (reach.line && dist === 0) warn.push(L("LineSame"));
    }
    if ((reach.shot || (reach.kind === "range" && item?.type === "weapon")) && dist > 0 && isSkirmish(tDoc.parent, tArea) && !hasFeat(actor, "Targeting"))
      warn.push(L("Stray"));
    if (warn.length) note += ` <span class="sw25-area-warn">⚠ ${warn.join(" ")}</span>`;
    return note;
  } catch (e) {
    console.warn("sw25 | areaNote", e);
    return "";
  }
}

/** Combat tracker: show the area next to each combatant's name. */
export function decorateCombatTracker(app, html) {
  const root = html instanceof HTMLElement ? html : html?.[0];
  const combat = game.combats?.viewed;
  if (!root || !combat || !boardConfig(combat.scene ?? canvas?.scene)) return;
  for (const li of root.querySelectorAll("[data-combatant-id]")) {
    const c = combat.combatants.get(li.dataset.combatantId);
    const area = c?.token ? areaOf(c.token) : null;
    if (!area) continue;
    const target = li.querySelector(".token-name") ?? li.querySelector(".name") ?? li;
    if (target.querySelector(".sw25-area-tag")) continue;
    const tag = document.createElement("span");
    tag.className = `sw25-area-tag sw25-area-${area}`;
    tag.textContent = areaLabel(area);
    target.appendChild(tag);
  }
}
