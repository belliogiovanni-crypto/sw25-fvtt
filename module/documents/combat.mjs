import { effectInitPC } from "../sw25.mjs";

/**
 * Faction of a combatant: player characters (and friendly tokens) against everyone else.
 * @param {Combatant} c
 * @returns {"pc"|"enemy"}
 */
function factionOf(c) {
  if (c.actor?.type === "character") return "pc";
  if (c.token?.disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY) return "pc";
  return "enemy";
}

function factionMode() {
  try {
    return game.settings.get("sw25", "factionInitiative");
  } catch (e) {
    return false;
  }
}

/**
 * Turn order. With faction initiative (Core Rulebook I p. 121-123) the whole faction that won the
 * Initiative check acts before the other one; inside each faction combatants keep their own value.
 * Written without `this` because Foundry may call the comparator unbound.
 */
function sortCombatants(a, b) {
  if (factionMode()) {
    const pcFirst = a.parent?.getFlag?.("sw25", "pcFirst");
    if (pcFirst === true || pcFirst === false) {
      const rank = (c) => ((factionOf(c) === "pc") === pcFirst ? 0 : 1);
      const d = rank(a) - rank(b);
      if (d) return d;
    }
  }
  const ia = Number.isNumeric(a.initiative) ? a.initiative : -Infinity;
  const ib = Number.isNumeric(b.initiative) ? b.initiative : -Infinity;
  return ib - ia || (a.name > b.name ? 1 : a.name < b.name ? -1 : 0) || (a.id > b.id ? 1 : -1);
}

/**
 * Extend the basic Combat with some very simple modifications.
 * @extends {Combat}
 */
export class SW25Combat extends Combat {
  /** @override */
  static _sortCombatants(a, b) {
    return sortCombatants(a, b);
  }

  /** @override */
  _sortCombatants(a, b) {
    return sortCombatants(a, b);
  }

  /**
   * Override rollInitiative to customize initiative rolling.
   * @param {Array|string} ids - The combatant IDs for which to roll initiative.
   */
  async rollInitiative(ids, options = {}) {
    ids = typeof ids === "string" ? [ids] : Array.from(ids ?? []);
    if (!factionMode()) return this._rollIndividualInitiative(ids);

    // Faction initiative (CR I p. 105, 121-123, 390): only the PCs roll. Monsters use their fixed
    // Initiative value. The best PC result is compared with the highest enemy value; ties go to the PCs.
    // Double 6 counts only as 12 (no automatic success); double 1 is an automatic failure.
    const updates = [];
    const rolled = new Map();
    for (const id of ids) {
      const combatant = this.combatants.get(id);
      const actor = combatant?.actor;
      if (!actor) continue;
      if (factionOf(combatant) === "pc") {
        const roll = new Roll(actor.system.initiativeFormula || "2d6", actor.getRollData());
        await roll.evaluate();
        const dice = roll.dice?.[0]?.results?.map((r) => r.result) ?? [];
        const fumble = dice.length === 2 && dice.every((r) => r === 1);
        rolled.set(id, { initiative: roll.total, fumble });
        updates.push({ _id: id, initiative: roll.total, "flags.sw25.fumble": fumble });
        const flavor = `${actor.name} - ${effectInitPC}${fumble ? ` (${game.i18n.localize("SW25.FactionInitiative.Fumble")})` : ""}`;
        await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor, token: combatant.token }), flavor });
      } else {
        const value = Number(actor.system.preemptive) || 0;
        rolled.set(id, { initiative: value, fumble: false });
        updates.push({ _id: id, initiative: value, "flags.sw25.fumble": false });
      }
    }

    // Decide which faction acts first, using every combatant in the encounter.
    const valueOf = (c) => rolled.get(c.id) ?? { initiative: c.initiative, fumble: !!c.getFlag("sw25", "fumble") };
    let bestPc = null;
    let bestEnemy = null;
    for (const c of this.combatants) {
      if (!c.actor) continue;
      if (factionOf(c) === "pc") {
        const v = valueOf(c);
        if (!Number.isNumeric(v.initiative)) continue;
        const score = v.fumble ? -Infinity : v.initiative;
        if (!bestPc || score > bestPc.score) bestPc = { c, score, shown: v.initiative, fumble: v.fumble };
      } else {
        const value = Number(c.actor.system.preemptive) || 0;
        if (!bestEnemy || value > bestEnemy.score) bestEnemy = { c, score: value };
      }
    }

    if (bestPc) {
      const pcFirst = !bestEnemy || bestPc.score >= bestEnemy.score;
      if (this.getFlag("sw25", "pcFirst") !== pcFirst) await this.setFlag("sw25", "pcFirst", pcFirst);
      const L = (k) => game.i18n.localize(k);
      const pcTxt = `${bestPc.c.name} ${bestPc.shown}${bestPc.fumble ? ` (${L("SW25.FactionInitiative.Fumble")})` : ""}`;
      const enTxt = bestEnemy ? `${bestEnemy.c.name} ${bestEnemy.score}` : "-";
      const result = pcFirst ? L("SW25.FactionInitiative.PcFirst") : L("SW25.FactionInitiative.EnemyFirst");
      await ChatMessage.create({
        speaker: { alias: L("SW25.FactionInitiative.Title") },
        content: `<p><b>${L("SW25.FactionInitiative.Title")}</b></p><p>${L("SW25.FactionInitiative.BestPc")}: ${pcTxt}<br>${L("SW25.FactionInitiative.BestEnemy")}: ${enTxt}</p><p><b>${result}</b></p>`,
      });
    }

    if (updates.length > 0) await this.updateEmbeddedDocuments("Combatant", updates);
    if (this.started && options.updateTurn !== false) {
      const current = this.combatant?.id;
      this.setupTurns();
      const idx = this.turns.findIndex((t) => t.id === current);
      if (idx >= 0 && idx !== this.turn) await this.update({ turn: idx });
    }
    return this;
  }

  /** The original behaviour: every combatant rolls its own initiative and acts in that order. */
  async _rollIndividualInitiative(ids) {
    const combatants = ids.map((id) => this.combatants.get(id));
    const updates = [];
    for (const combatant of combatants) {
      const actor = combatant?.actor;
      if (!actor) continue;
      const actorData = actor.system;

      let initiativeFormula = actorData.initiativeFormula;

      // Initiative roll
      const roll = new Roll(initiativeFormula, actor.getRollData());
      await roll.evaluate();
      updates.push({
        _id: combatant.id,
        initiative: roll.total,
      });

      // Chat message
      let flavor =
        `${actor.name}` + " - " + game.i18n.localize("SW25.Monster.Preemptive");
      if (actor.type == "character")
        flavor = `${actor.name}` + " - " + effectInitPC;
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: actor }),
        flavor: flavor,
      });
    }

    // Update combat tracker
    if (updates.length > 0) {
      await this.updateEmbeddedDocuments("Combatant", updates);
    }
    return this;
  }

  /** A new encounter starts without a decided faction order. */
  async resetAll(options) {
    if (this.getFlag("sw25", "pcFirst") !== undefined) await this.unsetFlag("sw25", "pcFirst");
    return super.resetAll(options);
  }
}
