/**
 * Write an MP/HP value on the actor that pays a cost.
 * Owners write directly (no GM needed, no token needed); others ask the GM
 * through the socket, identifying the actor by UUID.
 * @param {Actor} actor
 * @param {string|null} tokenId
 * @param {"mp"|"hp"} field
 * @param {number} value
 */
export function applyCostValue(actor, tokenId, field, value) {
  if (!actor) return;
  if (game.user.isGM || actor.isOwner) {
    return actor.update({ [`system.${field}.value`]: value });
  }
  game.socket.emit("system.sw25", {
    method: field === "mp" ? "applyMp" : "applyHp",
    targetToken: tokenId,
    actorUuid: actor.uuid,
    [field === "mp" ? "resultMP" : "resultHP"]: value,
  });
}

/**
 * Token placeable or Actor -> { actor, tokenId }.
 */
function payerParts(payer) {
  const actor = payer?.actor ?? payer;
  const tokenId = payer?.actor ? payer.id : null;
  return { actor, tokenId };
}

/**
 * Execute  MP cost event and return the result.
 * @param {Token|Actor} token  The payer: a token placeable or an actor.
 */
export async function mpCost(
  token,
  cost,
  name,
  type,
  meta,
  chat,
  base,
  fluc = null
) {
  const { actor, tokenId: targetTokenId } = payerParts(token);
  if (!actor) {
    ui.notifications.warn(game.i18n.localize("SW25.Noselectwarn"));
    return;
  }
  let targetMP = base ?? actor.system.mp.value;
  let resultMP = targetMP;
  let chatResult = 0;
  let metaB = false;
  let multi = meta ?? 1;
  let add = fluc ?? 0;
  let flucMes = fluc ? (add < 0 ? `${add}` : `+${add}`) : null;
  let costValue = cost * multi + add;
  if (type == "spell") metaB = true;
  if (type == "action") metaB = true;
  let isView = false;
  if (CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER <= actor.ownership.default)
    isView = true;

  // Calculate MP
  if (targetMP - costValue >= 0) {
    resultMP = targetMP - costValue;
    chatResult = resultMP;
  } else {
    resultMP = 0;
    chatResult = game.i18n.localize("SW25.Shortage");
  }

  // Apply MP cost
  applyCostValue(actor, targetTokenId, "mp", resultMP);

  // Cost Message.
  let costMes =
    cost +
    (meta && meta > 1 ? ` x ${meta}` : "") +
    (flucMes ? ` ${flucMes}` : "") +
    (((meta && meta > 1) || flucMes) ? ` = ${costValue}` : "");

  // Chat message
  if (meta == 1 && fluc == null) {
    const speaker = ChatMessage.getSpeaker({ actor: actor });
    const rollMode = game.settings.get("core", "rollMode");
    let label =
      name +
      " (" +
      game.i18n.localize("SW25.Mp") +
      cost +
      (flucMes ?? "") +
      ")";
    let baseMP = targetMP;

    let chatData = {
      speaker: speaker,
      flavor: label,
      rollMode: rollMode,
    };

    chatData.content = await foundry.applications.handlebars.renderTemplate(
      "systems/sw25/templates/roll/mp-apply.hbs",
      {
        cost: costValue,
        targetMP: targetMP,
        resultMP: chatResult,
        fluc: flucMes,
        metaB: metaB,
        isView: isView,
      }
    );

    chatData.flags = {
      sw25: {
        tokenId: targetTokenId,
        actorUuid: actor.uuid,
        cost: cost,
        name: name,
        type: type,
        meta: 1,
        base: baseMP,
        fluc: fluc,
      },
    };

    ChatMessage.create(chatData);
  } else {
    let label =
      name +
      " (" +
      game.i18n.localize("SW25.Mp") +
      cost +
      " x" +
      meta +
      (flucMes ?? "") +
      ")";
    let metaB = false;
    if (type == "spell") metaB = true;
    if (type == "action") metaB = true;

    let chatData = {
      flavor: label,
      flags: {
        sw25: {
          meta: meta,
          type: type,
          fluc: fluc,
        },
      },
    };
    chatData.content = await foundry.applications.handlebars.renderTemplate(
      "systems/sw25/templates/roll/mp-apply.hbs",
      {
        cost: costMes,
        targetMP: base,
        resultMP: chatResult,
        metaB: metaB,
        isView: isView,
      }
    );
    await chat.update(chatData);
  }
}

/**
 * Execute  HP cost event and return the result.
 */
export async function hpCost(token, cost, max, name, type) {
  const { actor, tokenId: targetTokenId } = payerParts(token);
  if (!actor) {
    ui.notifications.warn(game.i18n.localize("SW25.Noselectwarn"));
    return;
  }
  let targetHP = actor.system.hp.value;

  let resultHP = targetHP;
  let chatResult = 0;
  let costLabel = cost;
  if (max) costLabel = `${cost}(${max})`;
  let isView = false;
  if (CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER <= actor.ownership.default)
    isView = true;

  // roll &  Calculate HP cost
  let result = new Roll(cost);
  await result.evaluate();
  let totalValue = Number(result.result);
  let resultValue = totalValue;
  let limit = false;
  let nofix = false;
  if (result.terms[0].results) {
    nofix = true;
    if (result.terms[0].results.length >= 2) {
      let fumble = true;
      for (let i = 0; i < result.terms[0].results.length; i++) {
        if (result.terms[0].results[i].result != 1) fumble = false;
      }
      if (fumble) {
        resultValue = 0;
        limit = true;
      }
    }
  }
  if (max) {
    let maxValue = Number(max);
    if (resultValue >= maxValue) {
      resultValue = maxValue;
      limit = true;
    }
  }

  // Calculate HP
  resultHP = targetHP - resultValue;
  chatResult = resultHP;
  if (chatResult <= 0) {
    chatResult = chatResult + " (" + game.i18n.localize("SW25.UnderZero") + ")";
  }
  if (resultValue == 0) {
    chatResult = game.i18n.localize("SW25.NoCost");
  }

  // Apply HP cost
  applyCostValue(actor, targetTokenId, "hp", resultHP);

  // Chat message
  const speaker = ChatMessage.getSpeaker({ actor: actor });
  const rollMode = game.settings.get("core", "rollMode");
  let label = name + " (" + game.i18n.localize("SW25.Hp") + ` ${costLabel})`;
  let baseHP = targetHP;

  let chatData = {
    speaker: speaker,
    flavor: label,
    rollMode: rollMode,
    rolls: [result],
  };

  chatData.content = await foundry.applications.handlebars.renderTemplate(
    "systems/sw25/templates/roll/hp-apply.hbs",
    {
      nofix: nofix,
      formula: costLabel,
      resultValue: resultValue,
      totalValue: totalValue,
      limit: limit,
      tooltip: await result.getTooltip(),
      targetHP: targetHP,
      resultHP: chatResult,
      isView: isView,
    }
  );

  chatData.flags = {
    sw25: {
      tokenId: targetTokenId,
      actorUuid: actor.uuid,
      cost: resultValue,
      name: name,
      type: type,
      base: baseHP,
    },
  };

  ChatMessage.create(chatData);
}
