export class Util {
  static hexToRgb(hex) {
    hex = hex.replace(/^#/, "");

    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((char) => char + char)
        .join("");
    }

    if (hex.length !== 6) {
      throw new Error("Invalid hex color format");
    }

    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);

    return { r, g, b };
  }

  static getValue(target, keyB = null) {
    if (!keyB) return target;

    return keyB.split(".").reduce((o, k) => (o ? o[k] : undefined), target);
  }

  static setValue(target, keyB = null, value) {
    if (!keyB) return value;

    const keys = keyB.split(".");
    const lastKey = keys.pop();
    const container = keys.reduce((o, k) => (o[k] ??= {}), target);
    container[lastKey] = value;
  }

  /**
   * Get Controlled Actor or This Actor
   */
  static async getControlledActor(actor) {
    let selectedTokens = canvas.tokens.controlled;
    if (actor && selectedTokens.length === 0) {
      selectedTokens = canvas.tokens.placeables.filter(
        (t) => t.actor?.id === actor.id
      );
    }
    return selectedTokens;
  }

  /**
   * Find who pays an MP/HP cost, without requiring a token on the canvas.
   * One controlled token wins; more than one is an error. With no
   * selection, the first owned fallback actor pays (e.g. the caster of the
   * chat card), then the user's own character.
   * @param {...Actor} fallbacks  Actors to try, in order, when nothing is selected.
   * @returns {{payer?: Token|Actor, warn?: string}}
   */
  static resolveCostPayer(...fallbacks) {
    const controlled = canvas?.tokens?.controlled ?? [];
    if (controlled.length > 1) return { warn: "SW25.Multiselectwarn" };
    if (controlled.length === 1) return { payer: controlled[0] };
    for (const actor of [...fallbacks, game.user.character]) {
      if (actor?.isOwner) return { payer: actor };
    }
    return { warn: "SW25.Noselectwarn" };
  }

  /**
   * Actor that paid a cost recorded on an MP/HP chat card.
   * Uses the stored actor UUID first (works on any scene), then the old
   * token id, then the given fallback.
   */
  static costPayerFromFlags(flags, fallback = null) {
    const byUuid = flags?.actorUuid ? fromUuidSync(flags.actorUuid) : null;
    if (byUuid) return byUuid;
    const token = flags?.tokenId ? canvas?.tokens?.get(flags.tokenId) : null;
    return token ?? fallback;
  }

  /**
   * Get Controlled Actor or User's Actor
   */
  static async getControlledActorFromUser() {
    let selectedTokens = canvas.tokens.controlled;
    if (
      game.settings.get("sw25", "defaultCharaAction") &&
      game.user.character &&
      selectedTokens.length === 0
    ) {
      const userActor = game.user.character;
      if (userActor) {
        selectedTokens = canvas.tokens.placeables.filter(
          (t) => t.actor?.id === userActor.id
        );
      }
    }
    return selectedTokens;
  }
}
