/**
 * Named skill checks (Core Rulebook I p. 102-113, II p. 38-40, III p. 81-82, Magus Arts p. 18 and 54,
 * Barbarous Rage p. 9 and 58-60), computed from the character's classes.
 *
 * Every check lists the classes that may be used for its Standard Value. When a character has more than
 * one of them, the highest Standard Value is used (CR I p. 102: "any of the indicated classes may be used").
 * A character without any of them may still attempt the check as a straight roll: Standard Value 0
 * (CR I p. 91). Adventurer Checks use Adventurer Level + ability modifier (CR I p. 111).
 */

// Class names are matched against the names of the character's class (skill) items.
export const CLASS_ALIASES = {
  scout: ["Scout", "スカウト"],
  ranger: ["Ranger", "レンジャー"],
  sage: ["Sage", "セージ"],
  rider: ["Rider", "ライダー"],
  alchemist: ["Alchemist", "アルケミスト"],
  geomancer: ["Geomancer", "ジオマンサー"],
  tactician: ["Tactician", "ウォーリーダー"],
  heritor: ["Heritor"],
};

// Check packages used by the "package" effects (CR I p. 114): fine = Technique, move = Movement,
// obse = Observation, know = Knowledge.
const PACKAGE = {
  scout: { dex: "fine", agi: "move", int: "obse" },
  ranger: { dex: "fine", agi: "move", int: "obse" },
  sage: { int: "know" },
  rider: { agi: "move", int: "know" },
  alchemist: { int: "know" },
  geomancer: { int: "obse" },
};

const NAT = "Ranger: only in a natural environment.";
const T = { inst: "Instant", r1: "10 seconds (1 round)", m1: "1 minute (6 rounds)", m10: "10 minutes (60 rounds)", h1: "1 hour" };

// key, ability, classes ("adv" = Adventurer Check), time, source, note, options
const C = (name, abi, classes, time, source, note = "", opts = {}) => ({ name, abi, classes, time, source, note, ...opts });
export const PACKAGE_CHECKS = [
  // Dexterity
  C("Conceal", "dex", ["scout", "ranger"], T.m1, "CR I p. 102"),
  C("First Aid", "dex", ["ranger"], T.m10, "CR I p. 102"),
  C("Disable Device", "dex", ["scout", "ranger"], T.m1, "CR I p. 102", "Ranger: only traps made of natural objects in a natural environment."),
  C("Pickpocket", "dex", ["scout"], T.r1, "CR I p. 103"),
  C("Disguise", "dex", ["scout"], T.m10, "CR I p. 103"),
  C("Set Trap", "dex", ["scout", "ranger"], T.m10, "CR I p. 103", "Ranger: only natural objects in a natural environment."),
  // Agility
  C("Tumble", "agi", ["scout", "ranger", "rider"], T.inst, "CR I p. 104, CR III p. 82"),
  C("Hide", "agi", ["scout", "ranger"], T.m1, "CR I p. 104"),
  C("Acrobatics", "agi", ["scout", "ranger"], T.m1, "CR I p. 104"),
  C("Climb", "agi", ["scout", "ranger"], T.m1, "CR I p. 105", "Anyone can also climb with an Adventurer Check (Adventurer Level + Strength)."),
  C("Follow", "agi", ["scout", "ranger"], T.m10, "CR I p. 105"),
  C("Riding", "agi", ["rider"], T.m1, "CR III p. 81", "", { classOnly: true }),
  // Intelligence
  C("Track", "int", ["scout", "ranger", "rider*"], T.m1, "CR I p. 106"),
  C("Notice", "int", ["scout", "ranger", "rider*"], T.inst, "CR I p. 106", NAT),
  C("Listen", "int", ["scout", "ranger"], T.r1, "CR I p. 106"),
  C("Danger Sense", "int", ["scout", "ranger", "rider*"], T.inst, "CR I p. 106"),
  C("Insight", "int", ["sage", "alchemist"], T.inst, "CR I p. 106, CR III p. 82"),
  C("Search", "int", ["scout", "ranger", "geomancer", "rider*"], T.m10, "CR I p. 107, MA p. 18", `Only if you can really spend 10 minutes. ${NAT}`),
  C("Cartography", "int", ["scout", "ranger", "sage", "rider"], T.m10, "CR I p. 107, CR III p. 82", "Ranger: only maps of natural environments."),
  C("Meteorology", "int", ["scout", "ranger", "geomancer"], T.m1, "CR I p. 107, MA p. 18"),
  C("Pathology", "int", ["ranger", "sage"], T.m10, "CR I p. 107"),
  C("Literature", "int", ["sage", "alchemist"], T.m10, "CR I p. 107, CR III p. 82"),
  C("Engineering", "int", ["sage"], T.m10, "CR I p. 108"),
  C("Appraise", "int", ["scout", "sage"], T.m10, "CR I p. 108"),
  C("Monster Knowledge", "int", ["sage", "rider", "heritor:Experienced Heritor"], T.inst, "CR I p. 108, 382; CR III p. 82",
    "Only a Sage can learn the weak point (CR I p. 382). With Rider or Heritor you learn only the monster's data."),
  C("Herbology", "int", ["ranger", "sage", "alchemist"], T.m1, "CR I p. 108, CR III p. 82"),
  C("Spot Trap", "int", ["scout", "ranger", "rider*"], T.inst, "CR I p. 109", "Ranger: only in a natural environment."),
  C("Weakness (Mount)", "int", ["rider"], T.inst, "CR III p. 85", "Hides the weak point of your mount.", { classOnly: true }),
  C("Investigation", "int", ["any"], T.h1, "CR II p. 40", "The GM decides which class fits the way you question the contact."),
  // Initiative (Agility; Tactician and Heritor alternatives)
  C("Initiative", "agi", ["scout", "tactician", "heritor:Heritor's Eyes"], T.inst, "CR I p. 105, MA p. 54, BR p. 58",
    "Double 6 is not an automatic success for Initiative (CR I p. 105)."),
  // Adventurer Checks
  C("Detect", "int", ["adv"], T.r1, "CR I p. 111", "Requested by the GM."),
  C("Jump", "agi", ["adv"], T.r1, "CR I p. 112"),
  C("Climb (Adventurer)", "str", ["adv"], T.m1, "CR I p. 113"),
  C("Strength Check", "str", ["adv"], T.r1, "CR I p. 113"),
  C("Swim", "agi", ["adv"], "1 minute (6 rounds) or 10 seconds (1 round)", "CR II p. 38"),
  C("Death Check", "vit", ["adv"], T.inst, "CR I p. 110", "Target Number: current HP as a positive number."),
  C("Weakness", "int", ["adv"], T.inst, "BR p. 9", "Barbarous PCs: hides your weak point from the enemy at the start of combat.", { barbarous: true }),
];

const BARBAROUS_RACES = ["Diablo", "Drake", "Basilisk", "Dark Troll", "Arbor", "Baba Yaga", "Centaur", "Scissorscorpion", "Dawn", "Kobold", "Broken Drake", "Lamia", "Dhampir"];

const ABI_KEYS = ["dex", "agi", "str", "vit", "int", "mnd"];

function findClass(actor, key) {
  const names = CLASS_ALIASES[key] ?? [];
  let best = null;
  for (const item of actor.items) {
    if (item.type !== "skill") continue;
    if (!names.some((n) => n.toLowerCase() === String(item.name).trim().toLowerCase())) continue;
    if (!best || Number(item.system.skilllevel) > Number(best.system.skilllevel)) best = item;
  }
  return best && Number(best.system.skilllevel) > 0 ? best : null;
}

function hasItem(actor, name) {
  const n = name.toLowerCase();
  return actor.items.some((i) => String(i.name).trim().toLowerCase() === n);
}

function isBarbarous(actor) {
  const race = String(actor.system.race ?? "").trim().toLowerCase();
  if (race && (BARBAROUS_RACES.some((r) => r.toLowerCase() === race) || race.startsWith("weakling"))) return true;
  return actor.items.some((i) => i.type === "raceability" && /^Barbarous (PC|Body)$/i.test(String(i.name).trim()));
}

/**
 * @param {Actor} actor  a character actor (prepared)
 * @returns {{ available: object[], straight: object[] }}
 */
export function preparePackageChecks(actor) {
  const sys = actor.system;
  const eff = sys.effect ?? {};
  const allck = Number(eff.allck ?? 0) || 0;
  const available = [];
  const straight = [];
  const barbarous = isBarbarous(actor);
  const searchCommand = hasItem(actor, "Search Command");

  for (const c of PACKAGE_CHECKS) {
    if (c.barbarous && !barbarous) continue;
    const options = [];
    for (const raw of c.classes) {
      if (raw === "adv") {
        options.push({ label: game.i18n.localize("SW25.Attributes.Advlevel"), value: Number(sys.abilities?.[c.abi]?.advbase ?? 0), pkg: null });
        continue;
      }
      if (raw === "any") {
        for (const item of actor.items) {
          if (item.type !== "skill" || !(Number(item.system.skilllevel) > 0)) continue;
          options.push({ label: item.name, value: Number(item.system.skillbase?.[c.abi] ?? 0), pkg: null });
        }
        continue;
      }
      let key = raw, needs = null;
      if (raw.endsWith("*")) { key = raw.slice(0, -1); needs = "Search Command"; }
      if (raw.includes(":")) [key, needs] = raw.split(":");
      if (needs && !hasItem(actor, needs) && !(needs === "Search Command" && searchCommand)) continue;
      const item = findClass(actor, key);
      if (!item) continue;
      const pkg = needs === "Search Command" ? "obse" : PACKAGE[key]?.[c.abi] ?? null;
      options.push({ label: needs ? `${item.name} [${needs}]` : item.name, value: Number(item.system.skillbase?.[c.abi] ?? 0), pkg });
    }

    // Tactician Maneuver [Strategic Ingenuity] (MA p. 54): Initiative with Tactician + Intelligence + 1
    if (c.name === "Initiative" && hasItem(actor, "Strategic Ingenuity")) {
      const item = findClass(actor, "tactician");
      if (item) options.push({ label: `${item.name} + Int +1 [Strategic Ingenuity]`, value: Number(item.system.skillbase?.int ?? 0) + 1, pkg: null });
    }

    const bonus = (o) => {
      let b = allck;
      if (o.pkg) b += Number(eff.package?.[o.pkg] ?? 0) || 0;
      if (c.name === "Initiative") b += Number(eff.init ?? 0) || 0;
      if (c.name === "Monster Knowledge") b += Number(eff.mknow ?? 0) || 0;
      b += Number(eff.checkinputmod?.[c.name] ?? 0) || 0;
      return b;
    };
    const abiLabel = game.i18n.localize(CONFIG.SW25.abilities?.[c.abi] ?? c.abi);
    const abiShort = game.i18n.localize(`SW25.Ability.${c.abi[0].toUpperCase()}${c.abi.slice(1)}.abbr`);
    if (options.length) {
      options.forEach((o) => { o.total = o.value + bonus(o); });
      options.sort((a, b) => b.total - a.total);
      const best = options[0];
      const tip = [`${best.label} + ${abiLabel}`, options.length > 1 ? `Other options: ${options.slice(1).map((o) => `${o.label} ${o.total}`).join(", ")}` : "",
        `Time: ${c.time}`, c.note, c.source].filter(Boolean).join("\n");
      available.push({ name: c.name, abi: c.abi, abiShort, value: best.total, via: best.label, tip, formula: `2d6+${best.total}`, label: `${c.name} (${best.label})` });
    } else if (!c.classOnly) {
      const v = allck + (Number(eff.checkinputmod?.[c.name] ?? 0) || 0);
      const tip = [`Straight roll: no class for this check, Standard Value 0 (CR I p. 91).`, `Classes: ${c.classes.map((k) => k.replace(/\*$/, "").split(":")[0]).join(", ")}`,
        `Time: ${c.time}`, c.note, c.source].filter(Boolean).join("\n");
      straight.push({ name: c.name, abi: c.abi, abiShort, value: v, tip, formula: `2d6+${v}`, label: `${c.name} (straight roll)` });
    }
  }
  const order = (a, b) => ABI_KEYS.indexOf(a.abi) - ABI_KEYS.indexOf(b.abi);
  available.sort(order);
  straight.sort(order);
  return { available, straight };
}

/** Default classes for the automatic Initiative / Monster Knowledge check items when none is chosen. */
export function defaultCheckClass(actor, kind) {
  const keys = kind === "init" ? ["scout", "tactician"] : ["sage", "rider"];
  const abi = kind === "init" ? "agi" : "int";
  let best = null;
  for (const k of keys) {
    const item = findClass(actor, k);
    if (item && (!best || Number(item.system.skilllevel) > Number(best.system.skilllevel))) best = item;
  }
  return best ? { skill: best.name, abi } : { skill: "", abi };
}
