/**
 * Ascandir - DnD5e InventoryDoll
 * Ersetzt den Inventar-Reiter des dnd5e-Charakterbogens durch Paperdoll + Behälter.
 */

const ID = "ascandir-dnd5e-inventorydoll";
const HUD_ID = "ascandir-combat-hud";
const LOOT_ID = "ascandir-dnd5e-lootplacement";
const SOCKET = `module.${ID}`;

const L = (key, data) => (data ? game.i18n.format(`AID.${key}`, data) : game.i18n.localize(`AID.${key}`));
const setting = key => game.settings.get(ID, key);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[c]);

/* -------------------------------------------- */
/*  Layout: Ankerpunkte und Slot-Typen          */
/* -------------------------------------------- */

/** Feste Ankerpunkte um das Porträt (Mittelpunkt in % der Figur-Fläche, Seitenverhältnis 4:5). */
const ANCHORS = {
  l0: { x: 11, y: 6 }, l1: { x: 11, y: 19 }, l2: { x: 11, y: 32 }, l3: { x: 11, y: 45 }, l4: { x: 11, y: 58 },
  r0: { x: 89, y: 6 }, r1: { x: 89, y: 19 }, r2: { x: 89, y: 32 }, r3: { x: 89, y: 45 }, r4: { x: 89, y: 58 },
  b0: { x: 30, y: 78 }, b1: { x: 38, y: 78 }, b2: { x: 50, y: 78 }, b3: { x: 62, y: 78 }, b4: { x: 70, y: 78 }
};

/** Slot-Typen mit Stichworten (EN + DE) für Wundersame Gegenstände ohne eigenen Ausrüstungstyp. */
const SLOT_TYPES = {
  head: ["helm", "hat", "circlet", "crown", "cap", "hood", "diadem", "headband", "hut", "reif", "krone", "kapuze", "stirnband", "mütze"],
  eyes: ["goggles", "lenses", "eyes of", "spectacles", "eyepatch", "monocle", "brille", "linsen", "augenklappe", "monokel"],
  neck: ["amulet", "necklace", "periapt", "medallion", "pendant", "scarab", "brooch", "torc", "amulett", "halskette", "kette", "medaillon", "anhänger", "brosche", "skarabäus"],
  shoulders: ["cloak", "cape", "mantle", "robe of", "umhang", "mantel", "cape", "überwurf"],
  armor: [],
  clothing: ["clothes", "robes", "vestments", "kleidung", "gewand", "robe"],
  wrists: ["bracer", "bracelet", "armband", "armschiene", "armreif"],
  hands: ["glove", "gauntlet", "handschuh", "panzerhandschuh"],
  waist: ["belt", "girdle", "sash", "gürtel", "schärpe"],
  feet: ["boots", "slippers", "shoes", "sandals", "stiefel", "schuhe", "pantoffeln", "sandalen"],
  ring: ["ring"],
  trinket: ["trinket", "ioun", "figurine", "stone", "talisman", "stein", "figur"],
  focus: [],
  any: []
};

const LAYOUT_VERSION = 2;

/** Feste Elemente (RK, Haupthand mit Set-Auswahl, Nebenhand) – vom SL verschiebbar. */
const FIXED_DEFAULT = { ac: { x: 50, y: 92 }, main: { x: 14, y: 86 }, off: { x: 86, y: 86 } };
/** Symbole für leere Felder (statt Beschriftung). */
const SLOT_ICONS = {
  head: "fa-hat-wizard", eyes: "fa-glasses", neck: "fa-medal", shoulders: "fa-vest", armor: "fa-user-shield",
  clothing: "fa-shirt", wrists: "fa-hand-back-fist", hands: "fa-mitten", waist: "fa-grip-lines", feet: "fa-shoe-prints",
  ring: "fa-ring", trinket: "fa-gem", focus: "fa-wand-magic-sparkles", any: "fa-star"
};
const slotIcon = (type, cls = "") => `<i class="fa-solid ${SLOT_ICONS[type] ?? "fa-circle"} aid-slot-icon ${cls}" inert></i>`;

const DEFAULT_LAYOUT = {
  v: LAYOUT_VERSION,
  containerSlots: 4,
  slots: [
    { id: "head", anchor: "l0", type: "head", label: "" },
    { id: "neck", anchor: "l1", type: "neck", label: "" },
    { id: "shoulders", anchor: "l2", type: "shoulders", label: "" },
    { id: "armor", anchor: "l3", type: "armor", label: "" },
    { id: "wrists", anchor: "l4", type: "wrists", label: "" },
    { id: "eyes", anchor: "r0", type: "eyes", label: "" },
    { id: "hands", anchor: "r1", type: "hands", label: "" },
    { id: "waist", anchor: "r2", type: "waist", label: "" },
    { id: "feet", anchor: "r3", type: "feet", label: "" },
    { id: "trinket", anchor: "r4", type: "trinket", label: "" },
    { id: "ring1", anchor: "b1", type: "ring", label: "" },
    { id: "ring2", anchor: "b3", type: "ring", label: "" }
  ],
  fixed: {
    ac: { x: 50, y: 92 }, main: { x: 14, y: 86 }, off: { x: 86, y: 86 }
  }
};

/** Position eines Slots in % (frei gesetzt oder über einen Ankerpunkt). */
function withPosition(slot) {
  if ( !Number.isFinite(slot.x) || !Number.isFinite(slot.y) ) {
    const a = ANCHORS[slot.anchor];
    if ( !a ) return null;
    slot.x = a.x;
    slot.y = a.y;
  }
  slot.x = Math.clamp(slot.x, 4, 96);
  slot.y = Math.clamp(slot.y, 4, 96);
  return slot;
}

function getLayout() {
  let l = foundry.utils.deepClone(setting("layout") ?? {});
  if ( !Array.isArray(l.slots) ) l = foundry.utils.deepClone(DEFAULT_LAYOUT);
  // Layouts aus v0.1 (niedrigere Figur) auf die neue, höhere Figur umrechnen
  if ( l.v !== LAYOUT_VERSION ) {
    for ( const sl of l.slots ) {
      if ( Number.isFinite(sl?.x) && Number.isFinite(sl?.y) ) sl.y = sl.y > 80 ? 82 : Math.round(sl.y * 0.62) + 1;
    }
    l.v = LAYOUT_VERSION;
  }
  l.slots = l.slots.filter(s => s && (s.type in SLOT_TYPES)).map(withPosition).filter(Boolean);
  l.containerSlots = Math.clamp(Number(l.containerSlots) || 4, 1, 8);
  l.fixed ??= {};
  for ( const [k, def] of Object.entries(FIXED_DEFAULT) ) {
    const f = l.fixed[k];
    l.fixed[k] = (Number.isFinite(f?.x) && Number.isFinite(f?.y))
      ? { x: Math.clamp(f.x, 4, 96), y: Math.clamp(f.y, 4, 96) } : { ...def };
  }
  return l;
}

const slotTypeLabel = type => L(`Type.${type}`);
const slotLabel = slot => (slot.label?.trim() || slotTypeLabel(slot.type)).toUpperCase();

/* -------------------------------------------- */
/*  Item-Eigenschaften                          */
/* -------------------------------------------- */

const WEARABLE = new Set(["wondrous", "trinket", "ring", "clothing", "", undefined, null]);
const equipType = item => (item.type === "equipment" ? item.system.type?.value : null);
const nameHas = (item, words) => {
  const n = item.name.toLowerCase();
  return words.some(w => n.includes(w));
};
const isTwoHanded = item => (item?.type === "weapon") && !!item.system.properties?.has?.("two");
const isShield = item => equipType(item) === "shield";
const isFocus = item => !!item?.system.properties?.has?.("foc") || ["rod", "wand"].includes(equipType(item));
const isAmmo = item => (item?.type === "consumable") && (item.system.type?.value === "ammo");
const isConsumable = item => item?.type === "consumable";

/** Passt ein Gegenstand in einen Slot-Typ? */
function matchesType(item, type) {
  const forced = item.getFlag(ID, "slotType");
  if ( forced ) return (forced === type) || (type === "any");
  if ( type === "focus" ) return isFocus(item);
  if ( item.type !== "equipment" ) return false;
  const et = equipType(item);
  switch ( type ) {
    case "armor": return ["light", "medium", "heavy", "natural"].includes(et);
    case "clothing": return (et === "clothing") || (WEARABLE.has(et) && nameHas(item, SLOT_TYPES.clothing));
    case "ring": return (et === "ring") || (WEARABLE.has(et) && nameHas(item, SLOT_TYPES.ring));
    case "trinket": return (et === "trinket") || (WEARABLE.has(et) && nameHas(item, SLOT_TYPES.trinket));
    case "any": return WEARABLE.has(et);
    default: return WEARABLE.has(et) && (et !== "ring") && nameHas(item, SLOT_TYPES[type] ?? []);
  }
}

/* -------------------------------------------- */
/*  Daten am Akteur                             */
/* -------------------------------------------- */

/** Paperdoll-Daten: belegte Körper-Slots und angebundene Behälter. */
function getDoll(actor) {
  const f = actor.getFlag(ID, "doll") ?? {};
  const slots = (Array.isArray(f.slots) ? f.slots : []).filter(e => e?.s && actor.items.get(e.i));
  const containers = Array.isArray(f.containers) ? f.containers.map(c => (actor.items.get(c)?.type === "container" ? c : null)) : [];
  return { slots, containers, ammo: f.ammo ?? null };
}

const dollUpdate = d => ({ [`flags.${ID}.doll`]: { slots: d.slots, containers: d.containers, ammo: d.ammo ?? null } });
const slotItemId = (d, slotId) => d.slots.find(e => e.s === slotId)?.i ?? null;

const hudActive = () => !!game.modules.get(HUD_ID)?.active;

/** Waffensets (gemeinsam mit dem Ascandir Combat HUD, sonst eigene Ablage). */
function getSets(actor) {
  const hudApi = hudActive() ? game.modules.get(HUD_ID)?.api : null;
  if ( hudApi?.getWeaponSets ) {
    try {
      const r = hudApi.getWeaponSets(actor);
      return { scope: HUD_ID, active: String(r.active ?? "1"), sets: foundry.utils.deepClone(r.sets) };
    } catch ( err ) { console.warn(`${ID} | Combat HUD Waffensets`, err); }
  }
  const scope = hudActive() ? HUD_ID : ID;
  const f = actor.flags?.[scope]?.weaponSets ?? {};
  // Gleiche Vorbelegung wie das Combat HUD, solange noch nichts gespeichert ist
  const defaults = { 1: {}, 2: {}, 3: {} };
  if ( !f.sets ) {
    const weapons = actor.itemTypes.weapon.slice().sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    const equipped = weapons.filter(w => w.system.equipped);
    const main = equipped[0] ?? weapons[0] ?? null;
    const off = equipped.find(w => (w !== main) && w.system.properties?.has?.("lgt")) ?? null;
    defaults[1] = { primary: main?.id ?? null, secondary: off?.id ?? null };
  }
  const sets = {};
  for ( const n of ["1", "2", "3"] ) {
    const s = f.sets?.[n] ?? defaults[n];
    sets[n] = {
      primary: actor.items.get(s.primary) ? s.primary : null,
      secondary: actor.items.get(s.secondary) ? s.secondary : null
    };
  }
  return { scope, active: String(f.active ?? "1"), sets };
}

const setsUpdate = data => ({ [`flags.${data.scope}.weaponSets`]: { active: data.active, sets: data.sets } });
const setIds = data => new Set(Object.values(data.sets).flatMap(s => [s.primary, s.secondary]).filter(Boolean));
const inActiveSet = (data, id) => [data.sets[data.active]?.primary, data.sets[data.active]?.secondary].includes(id);

function primaryContainer(actor, d, exclude = null) {
  return d.containers.find(c => c && (c !== exclude) && actor.items.get(c)) ?? null;
}

/** Alle Gegenstände, die gerade „am Körper“ sind (Slots, Waffensets, angebundene Behälter). */
function wornIds(actor) {
  const d = getDoll(actor);
  const ids = new Set(d.slots.map(e => e.i));
  for ( const id of setIds(getSets(actor)) ) ids.add(id);
  for ( const c of d.containers ) if ( c ) ids.add(c);
  return ids;
}

/** Update, um einen Gegenstand abzulegen (in einen Behälter oder lose). */
function stowUpdate(item, containerId) {
  const u = { _id: item.id, _aidStow: true, "system.container": (containerId && (containerId !== item.id)) ? containerId : null };
  if ( item.system.equipped !== undefined ) u["system.equipped"] = false;
  return u;
}

function equipUpdate(item, equipped = true) {
  const u = { _id: item.id, "system.container": null };
  if ( equipped ) u._aidEquip = true;
  if ( item.system.equipped !== undefined ) u["system.equipped"] = equipped;
  return u;
}

/** Änderungen gesammelt schreiben (Flags + Gegenstände). */
async function commit(actor, flagUpdate, itemUpdates) {
  const merged = new Map();
  for ( const u of itemUpdates ) merged.set(u._id, { ...(merged.get(u._id) ?? {}), ...u });
  applyAttunement(actor, [...merged.values()]);
  if ( flagUpdate && Object.keys(flagUpdate).length ) await actor.update(flagUpdate);
  if ( merged.size ) await actor.updateEmbeddedDocuments("Item", [...merged.values()], { aid: true });
  refreshHud(actor);
}

/**
 * Einstimmung beim Anlegen/Ablegen: Wer etwas mit Einstimmungspflicht anlegt, stimmt sich ein, solange Plätze frei sind;
 * wird es ganz von der Paperdoll genommen, endet die Einstimmung. Set-Wechsel ändern nichts.
 */
function applyAttunement(actor, updates) {
  const on = setting("autoAttune");
  const att = actor.system.attributes?.attunement ?? {};
  let used = Number(att.value) || 0;
  const max = Number(att.max) || 3;
  const ordered = [...updates].sort((a, b) => (b._aidStow ? 1 : 0) - (a._aidStow ? 1 : 0));
  for ( const u of ordered ) {
    const item = actor.items.get(u._id);
    const req = item?.system.attunement === "required";
    if ( on && req && u._aidStow && item.system.attuned ) {
      u["system.attuned"] = false;
      used--;
    } else if ( on && req && u._aidEquip && !item.system.attuned ) {
      if ( used < max ) {
        u["system.attuned"] = true;
        used++;
      } else ui.notifications.warn(L("Warn.NoAttunement", { item: item.name, max }));
    }
    delete u._aidStow;
    delete u._aidEquip;
  }
}

function attuneBadge(item) {
  if ( item?.system.attunement !== "required" ) return "";
  const on = !!item.system.attuned;
  return `<span class="aid-att ${on ? "on" : "off"}" data-tooltip="${esc(L(on ? "Attune.On" : "Attune.Off"))}"><i class="fa-solid fa-sun" inert></i></span>`;
}

/** Combat HUD sofort neu zeichnen, damit die Waffensets dort gleich stimmen. */
function refreshHud(actor) {
  const hud = game.modules.get(HUD_ID)?.api?.hud;
  try {
    if ( hud?.rendered && (!hud.concerns || hud.concerns(actor)) ) hud.render();
  } catch { /* HUD optional */ }
}

/** Referenzen eines Gegenstands aus Slots, Sets und Behälter-Slots entfernen (verändert d/sets). */
function detach(d, sets, id) {
  d.slots = d.slots.filter(e => e.i !== id);
  d.containers = d.containers.map(c => (c === id ? null : c));
  for ( const s of Object.values(sets.sets) ) {
    if ( s.primary === id ) s.primary = null;
    if ( s.secondary === id ) s.secondary = null;
  }
}

/** Darf ein Gegenstand im Kampf benutzt werden? (Kein Behälter in der Kette ist vom SL gesperrt.) */
function isReachable(item) {
  const actor = item?.parent;
  if ( !(actor instanceof Actor) ) return true;
  let id = item.system?.container;
  const seen = new Set();
  while ( id && !seen.has(id) ) {
    seen.add(id);
    const c = actor.items.get(id);
    if ( !c ) break;
    if ( c.getFlag(ID, "combatUse") === false ) return false;
    id = c.system.container;
  }
  return true;
}

const inCombat = actor => !!game.combat?.started && game.combat.combatants.some(c => c.actor === actor || c.actor?.id === actor.id);

/** Klick auf einen Gegenstand: Aktion auslösen, sonst Bogen öffnen. */
function useItem(item, event) {
  if ( !item ) return;
  if ( event?.ctrlKey || event?.metaKey || !item.system.activities?.size ) return item.sheet.render(true);
  if ( !game.user.isGM && inCombat(item.parent) && !isReachable(item) ) return ui.notifications.warn(L("Warn.NotReachable", { item: item.name }));
  return item.use({ event });
}

/* -------------------------------------------- */
/*  Aktionen                                    */
/* -------------------------------------------- */

function canEdit(actor) {
  if ( !actor.isOwner ) return false;
  return game.user.isGM || setting("playersEquip");
}

async function equipToSlot(actor, item, slotId, { force = false } = {}) {
  const slot = getLayout().slots.find(s => s.id === slotId);
  if ( !slot ) return;
  if ( !matchesType(item, slot.type) ) {
    if ( force && game.user.isGM ) await item.setFlag(ID, "slotType", slot.type);
    else if ( setting("strictSlots") ) return ui.notifications.warn(L("Warn.WrongSlot", { item: item.name, slot: slotLabel(slot) }));
  }
  const d = getDoll(actor);
  const sets = getSets(actor);
  const updates = [];
  const prevId = slotItemId(d, slotId);
  detach(d, sets, item.id);
  if ( prevId && (prevId !== item.id) ) {
    d.slots = d.slots.filter(e => e.s !== slotId);
    updates.push(stowUpdate(actor.items.get(prevId), primaryContainer(actor, d)));
  }
  d.slots = d.slots.filter(e => e.s !== slotId);
  d.slots.push({ s: slotId, i: item.id });
  updates.push(equipUpdate(item, true));
  await commit(actor, { ...dollUpdate(d), ...setsUpdate(sets) }, updates);
}

async function assignContainer(actor, item, index) {
  if ( item.type !== "container" ) return ui.notifications.warn(L("Warn.NotContainer", { item: item.name }));
  const layout = getLayout();
  const d = getDoll(actor);
  const sets = getSets(actor);
  detach(d, sets, item.id);
  while ( d.containers.length < layout.containerSlots ) d.containers.push(null);
  d.containers[index] = item.id;
  const updates = [equipUpdate(item, true)];
  await commit(actor, { ...dollUpdate(d), ...setsUpdate(sets) }, updates);
}

async function assignWeapon(actor, item, set, which) {
  const okMain = item.type === "weapon";
  const okOff = okMain || isShield(item) || isFocus(item);
  if ( (which === "primary") && !okMain && okOff ) which = "secondary";
  if ( (which === "secondary") && !okOff ) return ui.notifications.warn(L("Warn.NotWeapon", { item: item.name }));
  if ( (which === "primary") && !okMain ) return ui.notifications.warn(L("Warn.NotWeapon", { item: item.name }));
  if ( (which === "secondary") && isTwoHanded(item) ) which = "primary";

  const d = getDoll(actor);
  const data = getSets(actor);
  const s = data.sets[set];
  const removed = [];
  d.slots = d.slots.filter(e => e.i !== item.id);
  d.containers = d.containers.map(c => (c === item.id ? null : c));
  // Eine Waffe darf in mehreren Sets liegen. Im selben Set beide Hände nur, wenn man mindestens 2 davon hat.
  const pair = (item.system.quantity ?? 1) >= 2;

  if ( which === "primary" ) {
    if ( s.primary && (s.primary !== item.id) ) removed.push(s.primary);
    if ( (s.secondary === item.id) && !pair ) s.secondary = null;
    s.primary = item.id;
    if ( isTwoHanded(item) && s.secondary ) { removed.push(s.secondary); s.secondary = null; }
  } else {
    if ( s.secondary && (s.secondary !== item.id) ) removed.push(s.secondary);
    if ( (s.primary === item.id) && !pair ) s.primary = null;
    s.secondary = item.id;
    if ( s.primary && isTwoHanded(actor.items.get(s.primary)) ) { removed.push(s.primary); s.primary = null; }
  }

  const updates = [equipUpdate(item, inActiveSet(data, item.id))];
  const still = setIds(data);
  for ( const id of removed ) {
    const it = actor.items.get(id);
    if ( !it ) continue;
    if ( still.has(id) ) updates.push(equipUpdate(it, inActiveSet(data, id)));
    else updates.push(stowUpdate(it, primaryContainer(actor, d)));
  }
  await commit(actor, { ...dollUpdate(d), ...setsUpdate(data) }, updates);
}

/** Eine Waffe aus genau einer Set-Position nehmen. Liegt sie in keinem Set mehr, kommt sie in einen Behälter. */
async function removeFromSet(actor, item, set, which, containerId) {
  const d = getDoll(actor);
  const data = getSets(actor);
  const s = data.sets[set];
  if ( s?.[which] === item.id ) s[which] = null;
  const update = setIds(data).has(item.id)
    ? equipUpdate(item, inActiveSet(data, item.id))
    : stowUpdate(item, containerId === undefined ? primaryContainer(actor, d, item.id) : containerId);
  await commit(actor, setsUpdate(data), [update]);
}

async function switchSet(actor, n) {
  const data = getSets(actor);
  if ( data.active === n ) return;
  data.active = n;
  const updates = [];
  for ( const id of setIds(data) ) {
    const it = actor.items.get(id);
    if ( it && (it.system.equipped !== undefined) ) {
      const eq = inActiveSet(data, id);
      if ( it.system.equipped !== eq ) updates.push({ _id: id, "system.equipped": eq });
    }
  }
  await commit(actor, setsUpdate(data), updates);
}

/** Gegenstand von der Paperdoll lösen und in einen Behälter (Standard: Primär) legen. */
async function unequip(actor, item, containerId) {
  const d = getDoll(actor);
  const sets = getSets(actor);
  detach(d, sets, item.id);
  const target = containerId === undefined ? primaryContainer(actor, d, item.id) : containerId;
  await commit(actor, { ...dollUpdate(d), ...setsUpdate(sets) }, [stowUpdate(item, target)]);
}

async function setAmmo(actor, ammoId) {
  const d = getDoll(actor);
  d.ammo = ammoId || null;
  const updates = [];
  if ( ammoId ) {
    for ( const w of actor.itemTypes.weapon ) {
      if ( !w.system.properties?.has?.("amm") ) continue;
      if ( !w.system.ammunitionOptions?.some(o => o.value === ammoId) ) continue;
      const u = { _id: w.id };
      for ( const act of w.system.activities?.getByType?.("attack") ?? [] ) u[`flags.dnd5e.last.${act.id}.ammunition`] = ammoId;
      if ( Object.keys(u).length > 1 ) updates.push(u);
    }
  }
  await commit(actor, dollUpdate(d), updates);
}

/** Ausgerüstete, noch nicht einsortierte Gegenstände automatisch verteilen. */
async function autoFill(actor) {
  const layout = getLayout();
  const d = getDoll(actor);
  const data = getSets(actor);
  const worn = wornIds(actor);
  const updates = [];
  const free = layout.slots.filter(s => !slotItemId(d, s.id));
  for ( const item of actor.items ) {
    if ( worn.has(item.id) || !item.system.equipped ) continue;
    if ( item.type === "weapon" || isShield(item) ) {
      const s = data.sets[data.active];
      if ( item.type === "weapon" && !s.primary ) { s.primary = item.id; worn.add(item.id); }
      else if ( !s.secondary && !isTwoHanded(actor.items.get(s.primary)) && !isTwoHanded(item) ) { s.secondary = item.id; worn.add(item.id); }
      else continue;
      updates.push(equipUpdate(item, true));
      continue;
    }
    const slot = free.find(s => matchesType(item, s.type));
    if ( !slot ) continue;
    free.splice(free.indexOf(slot), 1);
    d.slots.push({ s: slot.id, i: item.id });
    worn.add(item.id);
    updates.push(equipUpdate(item, true));
  }
  // Zweite Runde: leere Slots mit nicht verstauten, passenden Gegenständen füllen
  // (breite Typen wie Schmuckstück/Wundersam bleiben aus, damit kein Krimskrams angelegt wird)
  for ( const slot of [...free] ) {
    if ( ["trinket", "any"].includes(slot.type) ) continue;
    const item = actor.items.find(i => !worn.has(i.id) && !i.system.container && (i.system.equipped !== undefined)
      && matchesType(i, slot.type));
    if ( !item ) continue;
    free.splice(free.indexOf(slot), 1);
    d.slots.push({ s: slot.id, i: item.id });
    worn.add(item.id);
    updates.push(equipUpdate(item, true));
  }
  // Waffen: leeres aktives Set mit nicht verstauten Waffen füllen
  {
    const s = data.sets[data.active];
    const loose = actor.itemTypes.weapon.filter(w => !worn.has(w.id) && !w.system.container);
    if ( !s.primary && loose.length ) {
      const w = loose.shift();
      s.primary = w.id; worn.add(w.id); updates.push(equipUpdate(w, true));
    }
    if ( !s.secondary && !isTwoHanded(actor.items.get(s.primary)) ) {
      const off = actor.items.find(i => !worn.has(i.id) && !i.system.container && isShield(i))
        ?? loose.find(w => w.system.properties?.has?.("lgt") && !isTwoHanded(w));
      if ( off ) { s.secondary = off.id; worn.add(off.id); updates.push(equipUpdate(off, true)); }
    }
  }
  if ( !d.containers.some(Boolean) ) {
    const packs = actor.itemTypes.container.filter(c => !c.system.container);
    packs.sort((a, b) => (nameHas(b, ["backpack", "rucksack"]) ? 1 : 0) - (nameHas(a, ["backpack", "rucksack"]) ? 1 : 0));
    d.containers = packs.slice(0, layout.containerSlots).map(c => c.id);
    for ( const c of packs.slice(0, layout.containerSlots) ) updates.push(equipUpdate(c, true));
  }
  await commit(actor, { ...dollUpdate(d), ...setsUpdate(data) }, updates);
  ui.notifications.info(L("Info.AutoFilled"));
}

/**
 * Wird ein Gegenstand außerhalb der Paperdoll ausgerüstet (z. B. Schild-Symbol in der Liste),
 * kommt er automatisch auf den passenden Slot bzw. ins aktive Waffenset.
 */
async function autoEquip(actor, item) {
  if ( !setting("autoEquip") || !canEdit(actor) ) return;
  if ( wornIds(actor).has(item.id) ) return;
  if ( item.type === "container" ) return;

  // Waffen und Schilde → aktives Waffenset
  if ( (item.type === "weapon") || isShield(item) ) {
    const data = getSets(actor);
    const s = data.sets[data.active];
    const main = actor.items.get(s.primary);
    let which = "primary";
    if ( isShield(item) ) which = "secondary";
    else if ( main && !isTwoHanded(main) && !isTwoHanded(item) && !s.secondary ) which = "secondary";
    return assignWeapon(actor, item, data.active, which);
  }

  // Sonstige Ausrüstung → passender Körper-Slot (freier zuerst, sonst wird getauscht)
  const d = getDoll(actor);
  const matching = getLayout().slots.filter(sl => matchesType(item, sl.type));
  const slot = matching.find(sl => !slotItemId(d, sl.id)) ?? matching[0];
  if ( slot ) return equipToSlot(actor, item, slot.id);
}


/* -------------------------------------------- */
/*  Geldbörse                                   */
/* -------------------------------------------- */

const DENOMS = () => Object.keys(CONFIG.DND5E.currencies ?? { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 });
const purseActive = () => setting("enabled") && setting("purseEnabled");
const isPurse = item => (item?.type === "container") && !!item.getFlag(ID, "purse");
const pursesOf = actor => actor.itemTypes.container.filter(isPurse).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
const purseCap = purse => Math.max(0, Number(purse.getFlag(ID, "capacity")) || setting("purseCapacity"));
const coinCount = cur => DENOMS().reduce((sum, d) => sum + (Number(cur?.[d]) || 0), 0);
const ownCoins = actor => actor._source.system?.currency ?? {};

/**
 * Im Geldbörsen-Modus zeigt actor.system.currency die Summe aus losen Münzen und allen Geldbörsen.
 * So sehen andere Module (Shops, Belohnungen) das ganze Geld.
 */
function applyPurseTotals(actor) {
  if ( (actor.type !== "character") || !purseActive() ) return;
  const purses = pursesOf(actor);
  if ( !purses.length || !actor.system.currency ) return;
  const own = ownCoins(actor);
  for ( const d of DENOMS() ) {
    actor.system.currency[d] = (Number(own[d]) || 0) + purses.reduce((sum, p) => sum + (Number(p.system.currency?.[d]) || 0), 0);
  }
}

/**
 * Münz-Änderung auf Geldbörsen verteilen. Positive Werte füllen die Geldbörsen bis zur Kapazität
 * (Rest bleibt als lose Münzen am Charakter), negative nehmen zuerst lose Münzen, dann aus den Geldbörsen.
 */
async function applyCoinDelta(actor, delta) {
  const purses = pursesOf(actor);
  const own = foundry.utils.deepClone(ownCoins(actor));
  const pc = new Map(purses.map(p => [p.id, foundry.utils.deepClone(p.system.currency ?? {})]));
  for ( const [d, raw] of Object.entries(delta) ) {
    let amount = Math.trunc(Number(raw) || 0);
    if ( amount > 0 ) {
      for ( const p of purses ) {
        const cur = pc.get(p.id);
        const free = Math.max(0, purseCap(p) - coinCount(cur));
        const put = Math.min(free, amount);
        cur[d] = (Number(cur[d]) || 0) + put;
        amount -= put;
        if ( !amount ) break;
      }
      own[d] = (Number(own[d]) || 0) + amount;
    } else if ( amount < 0 ) {
      let need = -amount;
      const fromOwn = Math.min(need, Number(own[d]) || 0);
      own[d] = (Number(own[d]) || 0) - fromOwn;
      need -= fromOwn;
      for ( const p of purses ) {
        if ( !need ) break;
        const cur = pc.get(p.id);
        const take = Math.min(need, Number(cur[d]) || 0);
        cur[d] = (Number(cur[d]) || 0) - take;
        need -= take;
      }
    }
  }
  const itemUpdates = purses.map(p => ({ _id: p.id, "system.currency": pc.get(p.id) }));
  if ( itemUpdates.length ) await actor.updateEmbeddedDocuments("Item", itemUpdates, { aid: true });
  await actor.update({ "system.currency": own }, { aidPurse: true });
  const loose = coinCount(own);
  if ( loose > 0 && purses.length ) ui.notifications.warn(L("Purse.Overflow", { n: loose }));
}

/** Lose Münzen in die Geldbörsen packen (so viel Platz ist). */
async function stuffPurses(actor) {
  const own = ownCoins(actor);
  const delta = {};
  const reset = {};
  for ( const d of DENOMS() ) {
    if ( Number(own[d]) > 0 ) { delta[d] = Number(own[d]); reset[d] = 0; }
  }
  if ( !Object.keys(delta).length ) return;
  await actor.update({ "system.currency": { ...own, ...reset } }, { aidPurse: true });
  await applyCoinDelta(actor, delta);
}

async function createPurse(actor) {
  const [purse] = await actor.createEmbeddedDocuments("Item", [{
    name: L("Purse.DefaultName"),
    type: "container",
    img: "icons/containers/bags/coinpouch-simple-leather-tan.webp",
    system: { weight: { value: 0.5, units: "lb" }, quantity: 1 },
    flags: { [ID]: { purse: true } }
  }]);
  return purse;
}

/** Alle Charaktere: Münzen in die Geldbörsen bzw. zurück in die normale Währung. */
async function migrateCoins(toPurse) {
  for ( const actor of game.actors.filter(a => a.type === "character") ) {
    if ( toPurse ) {
      if ( !coinCount(ownCoins(actor)) ) continue;
      if ( !pursesOf(actor).length ) await createPurse(actor);
      await stuffPurses(actor);
    } else {
      const purses = actor.itemTypes.container.filter(isPurse);
      if ( !purses.length ) continue;
      const own = foundry.utils.deepClone(actor._source.system?.currency ?? {});
      for ( const p of purses ) for ( const d of DENOMS() ) own[d] = (Number(own[d]) || 0) + (Number(p.system.currency?.[d]) || 0);
      const empty = Object.fromEntries(DENOMS().map(d => [d, 0]));
      await actor.updateEmbeddedDocuments("Item", purses.map(p => ({ _id: p.id, "system.currency": empty })), { aid: true });
      await actor.update({ "system.currency": own }, { aidPurse: true });
    }
  }
}

async function onPurseToggle(enabled) {
  rerenderSheets();
  if ( game.user !== game.users.activeGM ) return;
  const ok = await foundry.applications.api.DialogV2.confirm({
    window: { title: L("Purse.Title") },
    content: `<p>${esc(L(enabled ? "Purse.MigrateIn" : "Purse.MigrateOut"))}</p>`
  }).catch(() => false);
  if ( ok ) {
    await migrateCoins(enabled);
    ui.notifications.info(L("Purse.Migrated"));
  }
}

function coinIcon(d) {
  const icon = CONFIG.DND5E.currencies?.[d]?.icon;
  return icon ? `<img class="aid-coin" src="${esc(icon)}" alt="" draggable="false">` : `<i class="currency ${d}" inert></i>`;
}

function renderPurses(app, actor) {
  const editable = app.isEditable && actor.isOwner;
  const purses = pursesOf(actor);
  const cards = purses.map(p => {
    const cap = purseCap(p);
    const count = coinCount(p.system.currency);
    const pct = cap ? Math.clamp(Math.round((count / cap) * 100), 0, 100) : 100;
    const capField = game.user.isGM
      ? `<label class="aid-purse-cap" data-tooltip="${esc(L("Purse.Capacity"))}"><span>${count} /</span><input type="number" min="0" step="10" value="${cap}" data-aid-purse-cap="${p.id}" aria-label="${esc(L("Purse.Capacity"))}"></label>`
      : `<span class="aid-captext">${count} / ${cap}</span>`;
    const coins = DENOMS().map(d => {
      const label = game.i18n.localize(CONFIG.DND5E.currencies[d]?.label ?? d);
      const v = Number(p.system.currency?.[d]) || 0;
      return `<label class="aid-coin-field" data-tooltip="${esc(label)}">${coinIcon(d)}
          <input type="number" min="0" step="1" value="${v}" data-aid-purse="${p.id}" data-denom="${d}" ${editable ? "" : "disabled"} aria-label="${esc(label)}"></label>`;
    }).join("");
    const unmark = game.user.isGM
      ? `<button type="button" class="aid-combat" data-aid-unpurse="${p.id}" data-tooltip="${esc(L("Purse.Unmark"))}" aria-label="${esc(L("Purse.Unmark"))}"><i class="fa-solid fa-xmark" inert></i></button>` : "";
    return `<div class="aid-purse" data-item-id="${p.id}" data-aid-item="${p.id}">
        <div class="aid-container-header aid-purse-header" ${editable ? "draggable=\"true\"" : ""} data-aid-purse-drag="${p.id}" ${tipAttrs(p, "LEFT")}>
          <i class="fa-solid fa-sack-dollar" inert></i><h3>${esc(p.name)}</h3><span class="aid-spacer"></span>
          <span class="aid-meter ${pct >= 100 ? "full" : ""}"><span style="width:${pct}%"></span></span>${capField}${unmark}
        </div>
        <div class="aid-coins">${coins}</div>
      </div>`;
  });
  const own = ownCoins(actor);
  const loose = coinCount(own);
  if ( loose > 0 ) {
    const text = DENOMS().filter(d => Number(own[d]) > 0)
      .map(d => `${own[d]} ${game.i18n.localize(CONFIG.DND5E.currencies[d]?.abbreviation ?? d)}`).join(" · ");
    cards.push(`<div class="aid-loose"><i class="fa-solid fa-triangle-exclamation" inert></i>
        <span>${esc(L(purses.length ? "Purse.Loose" : "Purse.NoPurse"))}: <strong>${esc(text)}</strong></span>
        ${purses.length && editable ? `<button type="button" data-aid-stuff>${esc(L("Purse.Stuff"))}</button>` : ""}</div>`);
  }
  if ( !purses.length && game.user.isGM ) {
    cards.push(`<button type="button" class="aid-purse-new" data-aid-newpurse><i class="fa-solid fa-plus" inert></i> ${esc(L("Purse.Create"))}</button>`);
  } else if ( !purses.length && !loose ) {
    cards.push(`<p class="aid-empty">${esc(L("Purse.None"))}</p>`);
  }
  return `<div class="aid-purses">${cards.join("")}</div>`;
}

function bindPurses(app, actor, root) {
  const box = root.querySelector(".aid-purses");
  if ( !box ) return;
  box.querySelectorAll("[data-aid-purse]").forEach(inp => inp.addEventListener("change", async ev => {
    ev.stopPropagation();
    const p = actor.items.get(inp.dataset.aidPurse);
    if ( !p ) return;
    const d = inp.dataset.denom;
    let v = Math.max(0, Math.trunc(Number(inp.value) || 0));
    const others = coinCount(p.system.currency) - (Number(p.system.currency?.[d]) || 0);
    const cap = purseCap(p);
    if ( others + v > cap ) {
      v = Math.max(0, cap - others);
      ui.notifications.warn(L("Purse.Full", { purse: p.name, cap }));
    }
    await p.update({ [`system.currency.${d}`]: v }, { aid: true });
  }));
  box.querySelectorAll("[data-aid-purse-cap]").forEach(inp => inp.addEventListener("change", async ev => {
    ev.stopPropagation();
    const p = actor.items.get(inp.dataset.aidPurseCap);
    if ( p && game.user.isGM ) await p.setFlag(ID, "capacity", Math.max(0, Math.trunc(Number(inp.value) || 0)));
  }));
  box.querySelectorAll("[data-aid-unpurse]").forEach(b => b.addEventListener("click", async ev => {
    ev.preventDefault();
    ev.stopPropagation();
    const p = actor.items.get(b.dataset.aidUnpurse);
    if ( p && game.user.isGM ) await p.unsetFlag(ID, "purse");
  }));
  box.querySelectorAll("[data-aid-purse-drag]").forEach(h => h.addEventListener("dragstart", ev => {
    const p = actor.items.get(h.dataset.aidPurseDrag);
    if ( p ) setDragData(ev, p, { from: "container" });
  }));
  box.querySelector("[data-aid-stuff]")?.addEventListener("click", ev => {
    ev.preventDefault();
    stuffPurses(actor);
  });
  box.querySelector("[data-aid-newpurse]")?.addEventListener("click", async ev => {
    ev.preventDefault();
    await createPurse(actor);
    await stuffPurses(actor);
  });
}

/* -------------------------------------------- */
/*  Boden                                       */
/* -------------------------------------------- */

const lootActive = () => !!game.modules.get(LOOT_ID)?.active;
const pilesActive = () => !!game.modules.get("item-piles")?.active && !!game.itempiles?.API;
const groundAvailable = () => setting("allowGround") && (lootActive() || pilesActive());

function groundPoint(actor) {
  const token = actor.getActiveTokens(true, false)[0] ?? actor.getActiveTokens()[0];
  if ( !token || !canvas?.scene ) return null;
  const gs = canvas.scene.grid.size;
  const a = Math.random() * Math.PI * 2;
  const r = (Math.max(token.document.width, 1) * gs / 2) + (gs * 0.5);
  return { x: Math.round(token.center.x + (Math.cos(a) * r)), y: Math.round(token.center.y + (Math.sin(a) * r)) };
}

async function askQuantity(item) {
  const max = item.system.quantity ?? 1;
  if ( max <= 1 ) return 1;
  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title: L("Ground.Title") },
    content: `<p>${esc(L("Ground.HowMany", { item: item.name }))}</p>
      <input type="number" name="qty" value="${max}" min="1" max="${max}" step="1" autofocus>`,
    ok: { label: L("Ground.Drop"), callback: (event, button) => Number(button.form.elements.qty.value) }
  }).catch(() => null);
  if ( !result ) return null;
  return Math.clamp(Math.floor(result), 1, max);
}

async function dropToGround(actor, item) {
  if ( !groundAvailable() ) return;
  if ( (item.type === "container") && item.system.contents?.size ) return ui.notifications.warn(L("Warn.ContainerNotEmpty"));
  const point = groundPoint(actor);
  if ( !point ) return ui.notifications.warn(L("Warn.NoToken"));
  const quantity = await askQuantity(item);
  if ( !quantity ) return;
  const payload = { itemUuid: item.uuid, actorUuid: actor.uuid, sceneId: canvas.scene.id, point, quantity };
  if ( (quantity >= (item.system.quantity ?? 1)) ) {
    const d = getDoll(actor);
    const sets = getSets(actor);
    detach(d, sets, item.id);
    await actor.update({ ...dollUpdate(d), ...setsUpdate(sets) });
  }
  if ( game.user.isGM ) return groundHandler(payload, game.user.id);
  const gm = game.users.activeGM;
  if ( !gm ) return ui.notifications.warn(L("Warn.NoGM"));
  game.socket.emit(SOCKET, { action: "ground", gmId: gm.id, userId: game.user.id, payload });
}

async function groundHandler({ itemUuid, actorUuid, sceneId, point, quantity }, userId) {
  const user = game.users.get(userId);
  const actor = await fromUuid(actorUuid);
  const item = await fromUuid(itemUuid);
  if ( !actor || !item || !user || !actor.testUserPermission(user, "OWNER") ) return;
  if ( lootActive() ) {
    try {
      return await game.modules.get(LOOT_ID).api.place(item, point, { quantity, sceneId });
    } catch ( err ) { console.error(`${ID} | Lootplacement`, err); }
  }
  if ( pilesActive() ) {
    try {
      const data = item.toObject();
      delete data._id;
      data.system.container = null;
      data.system.equipped = false;
      await game.itempiles.API.createItemPile({ position: point, sceneId, items: [{ item: data, quantity }] });
      const left = (item.system.quantity ?? 1) - quantity;
      if ( left > 0 ) await item.update({ "system.quantity": left });
      else await item.delete();
    } catch ( err ) { console.error(`${ID} | Item Piles`, err); }
  }
}

/* -------------------------------------------- */
/*  HTML                                        */
/* -------------------------------------------- */

const img = (src, alt = "") => `<img src="${esc(src)}" alt="${esc(alt)}" draggable="false">`;

/** Reichhaltiger dnd5e-Tooltip für einen Gegenstand (wie im normalen Inventar). */
function tipAttrs(item, direction = "RIGHT") {
  const html = `<section class="loading" data-uuid="${item.uuid}"><i class="fas fa-spinner fa-spin-pulse" inert></i></section>`;
  return `data-tooltip-html="${esc(html)}" data-tooltip-class="dnd5e2 dnd5e-tooltip item-tooltip document-tooltip" data-tooltip-direction="${direction}"`;
}

function renderSlot(actor, slot, d, editable) {
  const a = slot;
  const item = actor.items.get(slotItemId(d, slot.id));
  const label = slotLabel(slot);
  return `<div class="aid-slot ${item ? "filled" : "empty"}" style="left:${a.x}%;top:${a.y}%"
      data-aid-drop="slot" data-slot="${esc(slot.id)}" ${item ? `data-aid-item="${item.id}" ${tipAttrs(item, slot.x > 50 ? "LEFT" : "RIGHT")}` : `data-tooltip="${esc(label)}"`}>
      <div class="aid-tile" ${item && editable ? "draggable=\"true\"" : ""}>${item ? img(item.img, item.name) + attuneBadge(item) : slotIcon(slot.type)}</div>
    </div>`;
}

function renderHands(actor, editable) {
  const fixed = getLayout().fixed;
  const data = getSets(actor);
  const set = data.sets[data.active];
  const main = actor.items.get(set.primary);
  const off = actor.items.get(set.secondary);
  const two = isTwoHanded(main);
  const hand = (which, item, ghost = false, extra = "") => {
    const label = L(which === "primary" ? "Sets.Main" : "Sets.Off");
    const real = item && !ghost;
    const pos = fixed[which === "primary" ? "main" : "off"];
    return `<div class="aid-hand ${which} ${item ? "filled" : "empty"} ${ghost ? "ghost" : ""}" style="left:${pos.x}%;top:${pos.y}%" data-aid-drop="weapon" data-set="${data.active}" data-which="${which}"
        ${real ? `data-aid-item="${item.id}" ${tipAttrs(item, which === "primary" ? "RIGHT" : "LEFT")}` : `data-tooltip="${esc(label)}"`} ${real && editable ? "draggable=\"true\"" : ""}>
        ${extra}
        <div class="aid-tile big">${item ? img(item.img, item.name)
    : `<i class="fa-solid ${which === "primary" ? "fa-khanda" : "fa-shield"} aid-slot-icon" inert></i>`}${ghost ? `<span class="aid-2h">${esc(L("Sets.TwoHandedShort"))}</span>` : ""}${real ? attuneBadge(item) : ""}</div>
      </div>`;
  };
  const nums = { 1: "I", 2: "II", 3: "III" };
  const pills = ["1", "2", "3"].map(n => {
    const st = data.sets[n];
    const names = [actor.items.get(st.primary)?.name, actor.items.get(st.secondary)?.name].filter(Boolean).join(" · ") || L("Sets.Empty");
    return `<button type="button" class="aid-setpill ${data.active === n ? "active" : ""}" data-aid-set="${n}" data-aid-drop="setpill" data-set="${n}"
        data-tooltip="${esc(`${L("Sets.Title")} ${nums[n]}: ${names}`)}">${nums[n]}</button>`;
  }).join("");
  return `${hand("primary", main, false, `<div class="aid-setpills">${pills}</div>`)}${hand("secondary", two ? main : off, two)}`;
}

function ammoSelect(actor, container, d) {
  const ammo = container.system.contents?.filter(isAmmo) ?? [];
  if ( !ammo.length ) return "";
  const current = d.ammo && ammo.some(a => a.id === d.ammo) ? d.ammo : "";
  const opts = [`<option value="">${esc(L("Ammo.None"))}</option>`]
    .concat(ammo.map(a => `<option value="${a.id}" ${a.id === current ? "selected" : ""}>${esc(a.name)} ×${a.system.quantity ?? 0}</option>`));
  return `<select class="aid-ammo" data-aid-ammo aria-label="${esc(L("Ammo.Label"))}">${opts.join("")}</select>`;
}

function renderContainerSlots(actor, d, editable) {
  const layout = getLayout();
  const cells = [];
  for ( let i = 0; i < layout.containerSlots; i++ ) {
    const c = actor.items.get(d.containers[i]);
    const primary = i === 0;
    const tip = primary ? `${L("Containers.Primary")} – ${L("Containers.Hint")}` : L("Containers.Drop");
    cells.push(`<div class="aid-cslot ${c ? "filled" : "empty"} ${primary ? "primary" : ""}" data-aid-drop="container" data-index="${i}"
        ${c ? `data-aid-item="${c.id}" ${tipAttrs(c)}` : `data-tooltip="${esc(tip)}"`}>
        ${primary ? `<span class="aid-ctag" aria-label="${esc(L("Containers.Primary"))}">★</span>` : ""}
        ${c ? `<div class="aid-cbody" ${editable ? "draggable=\"true\"" : ""}>${img(c.img, c.name)}${combatToggle(c)}</div>${ammoSelect(actor, c, d)}`
    : `<span class="aid-cplace" aria-label="${esc(L("Containers.Drop"))}"><i class="fa-solid fa-plus" inert></i></span>`}
      </div>`);
  }
  const collapsed = !!game.user.getFlag(ID, "cbarCollapsed");
  return `<section class="aid-cbar ${collapsed ? "collapsed" : ""} ${editable ? "editable" : ""}">
      <header class="aid-container-header" data-aid-cbar-toggle role="button" aria-expanded="${!collapsed}">
        <i class="fa-solid fa-chevron-right aid-chevron" inert></i><h3>${esc(L("Containers.Title"))}</h3>
        <span class="aid-spacer"></span><span class="aid-captext">${esc(L("Containers.Hint"))}</span>
      </header>
      <div class="aid-cslots">${cells.join("")}</div>
    </section>`;
}

function renderDoll(app, actor) {
  const editable = app.isEditable && canEdit(actor);
  const layout = getLayout();
  const d = getDoll(actor);
  const ac = actor.system.attributes?.ac?.value ?? "–";
  const slots = layout.slots.map(s => renderSlot(actor, s, d, editable)).join("");
  const ground = groundAvailable() && editable
    ? `<div class="aid-ground" data-aid-drop="ground"><i class="fa-solid fa-arrow-down-to-line" inert></i> ${esc(L("Ground.Zone"))}</div>` : "";
  const auto = editable
    ? `<button type="button" class="aid-auto" data-aid-auto data-tooltip="${esc(L("Doll.AutoFillHint"))}" aria-label="${esc(L("Doll.AutoFill"))}"><i class="fa-solid fa-wand-magic-sparkles" inert></i></button>` : "";
  const gear = (game.user.isGM && app.isEditMode)
    ? `<button type="button" class="aid-auto" data-aid-config data-tooltip="${esc(L("Doll.Config"))}" aria-label="${esc(L("Doll.Config"))}"><i class="fa-solid fa-gear" inert></i></button>` : "";
  return `<aside class="aid-doll ${editable ? "editable" : "locked"}">
      <section class="aid-card">
        <header class="aid-header"><h3>${esc(L("Doll.Title"))}</h3>${auto}${gear}</header>
        <div class="aid-figure">
          <div class="aid-portrait">${img(actor.img, actor.name)}</div>
          <div class="aid-ac" style="left:${layout.fixed.ac.x}%;top:${layout.fixed.ac.y}%" data-tooltip="${esc(L("Doll.AC"))}"><span>${esc(L("Doll.ACShort"))}</span><strong>${esc(ac)}</strong></div>
          ${slots}
          ${renderHands(actor, editable)}
        </div>
      </section>
      ${ground}
    </aside>`;
}

function itemSubtitle(item) {
  const type = game.i18n.localize(CONFIG.Item.typeLabels?.[item.type] ?? item.type);
  const sub = item.system.type?.label ?? item.labels?.type ?? "";
  return sub && (sub !== type) ? `${type} · ${sub}` : type;
}

function renderRow(app, item, editable) {
  const qty = item.system.quantity ?? 1;
  const weight = item.system.totalWeight ?? ((item.system.weight?.value ?? 0) * qty);
  const uses = item.system.uses?.max ? `${item.system.uses.value ?? 0}/${item.system.uses.max}` : "";
  const blocked = !game.user.isGM && inCombat(app.actor) && !isReachable(item);
  const useCell = isConsumable(item) && app.actor.isOwner
    ? `<button type="button" class="aid-use-btn" data-aid-act="use" ${blocked ? `disabled data-tooltip="${esc(L("Warn.NotReachableShort"))}"` : ""}>${esc(L("Row.Use"))}</button>${uses ? `<span class="aid-uses">${esc(uses)}</span>` : ""}`
    : (uses ? esc(uses) : "<span class=\"aid-dim\">–</span>");
  const qtyCell = editable
    ? `<a class="aid-adj" data-aid-act="dec" aria-label="−"><i class="fa-solid fa-minus" inert></i></a><span>${qty}</span><a class="aid-adj" data-aid-act="inc" aria-label="+"><i class="fa-solid fa-plus" inert></i></a>`
    : `<span>${qty}</span>`;
  return `<li class="item aid-row" data-item-id="${item.id}" data-uuid="${esc(item.uuid)}" data-aid-item="${item.id}" draggable="true">
      <div class="item-row">
        <div class="item-name aid-name" role="button" data-aid-act="open" ${tipAttrs(item, "LEFT")}>
          ${img(item.img, item.name).replace("<img", "<img class=\"item-image gold-icon\"")}
          <div class="name name-stacked"><span class="title">${esc(item.name)}</span><span class="subtitle">${esc(itemSubtitle(item))}</span></div>
        </div>
        <div class="aid-col aid-col-weight">${weight ? `<i class="fa-solid fa-weight-hanging" inert></i> ${Math.round(weight * 100) / 100}` : "<span class=\"aid-dim\">–</span>"}</div>
        <div class="aid-col aid-col-qty">${qtyCell}</div>
        <div class="aid-col aid-col-use">${useCell}</div>
        <div class="aid-col aid-col-ctl"><a class="aid-ctl" data-context-menu aria-label="${esc(L("Row.More"))}"><i class="fa-solid fa-ellipsis-vertical" inert></i></a></div>
      </div>
    </li>`;
}

function capacityOf(container) {
  const cap = container.system.capacity ?? {};
  try {
    if ( cap.count ) {
      const v = container.system.contentsCount;
      return { value: v, max: cap.count, text: `${v} / ${cap.count}` };
    }
    if ( cap.weight?.value ) {
      const v = Math.round((container.system.contentsWeight ?? 0) * 100) / 100;
      const units = CONFIG.DND5E.weightUnits?.[cap.weight.units]?.abbreviation ?? "";
      return { value: v, max: cap.weight.value, text: `${v} / ${cap.weight.value} ${units}`.trim() };
    }
  } catch ( err ) { /* Kapazität ist optional */ }
  return null;
}

function purseToggle(container) {
  if ( !purseActive() || !game.user.isGM ) return "";
  const tip = esc(L("Purse.Mark"));
  return `<button type="button" class="aid-combat" data-aid-mkpurse="${container.id}" data-tooltip="${tip}" aria-label="${tip}"><i class="fa-solid fa-coins" inert></i></button>`;
}

function combatToggle(container) {
  const ok = container.getFlag(ID, "combatUse") !== false;
  const tip = esc(L(ok ? "Containers.CombatOn" : "Containers.CombatOff"));
  if ( !game.user.isGM ) return ok ? "" : `<span class="aid-combat off" data-tooltip="${tip}"><i class="fa-solid fa-ban" inert></i></span>`;
  return `<button type="button" class="aid-combat ${ok ? "on" : "off"}" data-aid-combat="${container.id}" data-tooltip="${tip}" aria-label="${tip}">
      <i class="fa-solid ${ok ? "fa-hand-fist" : "fa-ban"}" inert></i></button>`;
}

function renderContainerSection(app, container, { primary = false, attached = true, collapsed = false }, editable) {
  const cap = capacityOf(container);
  const pct = cap ? Math.clamp(Math.round((Number(cap.value) / Number(cap.max)) * 100), 0, 100) : 0;
  const items = [...(container.system.contents ?? [])].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  const rows = items.length ? items.map(i => renderRow(app, i, editable)).join("")
    : `<li class="aid-empty">${esc(L("Containers.Empty"))}</li>`;
  return `<div class="aid-container container ${collapsed ? "collapsed" : ""} ${attached ? "" : "detached"}" data-item-id="${container.id}" data-uuid="${esc(container.uuid)}">
      <div class="aid-container-header" data-aid-toggle="${container.id}" role="button" aria-expanded="${!collapsed}" ${editable ? "draggable=\"true\"" : ""} ${tipAttrs(container, "LEFT")}>
        <i class="fa-solid fa-chevron-right aid-chevron" inert></i>
        <h3>${esc(container.name)}</h3>
        ${primary ? `<span class="aid-pill">★ ${esc(L("Containers.Primary"))}</span>` : ""}
        ${attached ? "" : `<span class="aid-pill dim">${esc(L("Containers.Detached"))}</span>`}
        <span class="aid-spacer"></span>
        ${purseToggle(container)}${combatToggle(container)}
        ${cap ? `<span class="aid-meter ${pct >= 100 ? "full" : ""}"><span style="width:${pct}%"></span></span><span class="aid-captext">${esc(cap.text)}</span>` : ""}
      </div>
      <div class="aid-container-body">
        <div class="aid-colheads"><span class="aid-spacer"></span><span class="aid-col-weight">${esc(L("Row.Weight"))}</span><span class="aid-col-qty">${esc(L("Row.Quantity"))}</span><span class="aid-col-use">${esc(L("Row.Uses"))}</span><span class="aid-col-ctl"></span></div>
        <ol class="aid-list unlist">${rows}</ol>
      </div>
    </div>`;
}

function renderContainers(app, actor) {
  const editable = app.isEditable && actor.isOwner;
  const d = getDoll(actor);
  const collapsedSet = new Set(game.user.getFlag(ID, `collapsed.${actor.id}`) ?? []);
  const attached = d.containers.filter(id => id && !(purseActive() && isPurse(actor.items.get(id))));
  const primary = primaryContainer(actor, d);
  const sections = attached.map(id => renderContainerSection(app, actor.items.get(id),
    { primary: id === primary, attached: true, collapsed: collapsedSet.has(id) }, editable));
  const loose = actor.itemTypes.container.filter(c => !attached.includes(c.id) && !c.system.container
    && !(purseActive() && isPurse(c)) && !d.containers.includes(c.id));
  for ( const c of loose ) sections.push(renderContainerSection(app, c, { attached: false, collapsed: collapsedSet.has(c.id) }, editable));
  const title = `<h3 class="aid-unstowed-title">${esc(L("Containers.Unstowed"))}</h3>`;
  return `<div class="aid-containers">${sections.join("")}</div>${title}`;
}

/* -------------------------------------------- */
/*  Einbau in den Bogen                         */
/* -------------------------------------------- */

function parseDrop(event) {
  const dt = event.dataTransfer;
  for ( const type of ["application/json", "text/plain"] ) {
    try {
      const raw = dt?.getData(type);
      if ( raw ) return JSON.parse(raw);
    } catch { /* nächstes Format */ }
  }
  return null;
}

async function resolveDropItem(actor, data) {
  if ( data?.type !== "Item" ) return null;
  const item = await Item.implementation.fromDropData(data).catch(() => null);
  if ( !item ) return null;
  if ( item.parent === actor ) return item;
  if ( !actor.isOwner ) return null;
  const obj = item.toObject();
  delete obj._id;
  foundry.utils.setProperty(obj, "system.container", null);
  const [created] = await actor.createEmbeddedDocuments("Item", [obj]);
  return created ?? null;
}

function setDragData(event, item, extra = {}) {
  const data = { ...item.toDragData(), aidFrom: extra.from ?? null };
  if ( extra.set ) Object.assign(data, { aidSet: extra.set, aidWhich: extra.which });
  const json = JSON.stringify(data);
  event.dataTransfer.setData("text/plain", json);
  event.dataTransfer.setData("application/json", json);
  event.dataTransfer.effectAllowed = "copyMove";
  event.stopPropagation();
}

/** Tooltip des Elements anzeigen und – sobald geladen – als eigenes Fenster festhalten. */
async function lockTooltip(el) {
  const tm = game.tooltip;
  if ( !tm ) return;
  if ( tm.element !== el ) {
    const { tooltipHtml: html, tooltipClass: cssClass, tooltipDirection: direction } = el.dataset;
    const content = document.createElement("div");
    content.innerHTML = html ?? "";
    tm.activate(el, { content: content.firstElementChild ?? content, cssClass, direction });
  }
  for ( let i = 0; i < 40; i++ ) {
    if ( !tm.tooltip?.querySelector(".loading") ) break;
    await new Promise(r => setTimeout(r, 25));
  }
  if ( tm.element === el ) tm.lockTooltip?.();
}

function bindDoll(app, actor, aside) {
  const editable = app.isEditable && canEdit(actor);

  // Ziehen aus der Paperdoll
  aside.querySelectorAll("[data-aid-item] [draggable=\"true\"], [data-aid-item][draggable=\"true\"]").forEach(el => {
    el.addEventListener("dragstart", ev => {
      const host = el.closest("[data-aid-item]");
      const item = actor.items.get(host.dataset.aidItem);
      if ( item ) setDragData(ev, item, { from: "doll", set: host.dataset.set, which: host.dataset.which });
    });
  });

  // Doppelklick öffnet den Gegenstand
  aside.querySelectorAll("[data-aid-item]").forEach(el => {
    el.addEventListener("click", ev => {
      if ( ev.target.closest("select, button, input") ) return;
      ev.preventDefault();
      useItem(actor.items.get(el.dataset.aidItem), ev);
    });
    el.addEventListener("contextmenu", ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const item = actor.items.get(el.dataset.aidItem);
      if ( !item ) return;
      if ( ev.shiftKey && editable ) {
        if ( el.dataset.aidDrop === "weapon" ) return removeFromSet(actor, item, el.dataset.set, el.dataset.which);
        return unequip(actor, item, el.dataset.aidDrop === "container" ? null : undefined);
      }
      lockTooltip(el);
    });
  });

  aside.querySelector("[data-aid-cbar-toggle]")?.addEventListener("click", async ev => {
    if ( ev.target.closest("button, select, input") ) return;
    const bar = aside.closest(".aid-cbar") ?? aside;
    bar.classList.toggle("collapsed");
    await game.user.setFlag(ID, "cbarCollapsed", bar.classList.contains("collapsed"));
  });

  aside.querySelectorAll("[data-aid-combat]").forEach(b => b.addEventListener("click", async ev => {
    ev.preventDefault();
    ev.stopPropagation();
    const c = actor.items.get(b.dataset.aidCombat);
    if ( c && game.user.isGM ) await c.setFlag(ID, "combatUse", c.getFlag(ID, "combatUse") === false);
  }));

  aside.querySelectorAll("[data-aid-set]").forEach(b => b.addEventListener("click", ev => {
    ev.preventDefault();
    ev.stopPropagation();
    if ( editable || actor.isOwner ) switchSet(actor, b.dataset.aidSet);
  }));

  aside.querySelector("[data-aid-config]")?.addEventListener("click", ev => {
    ev.preventDefault();
    ev.stopPropagation();
    if ( game.user.isGM ) new LayoutEditor().render({ force: true });
  });

  aside.querySelector("[data-aid-auto]")?.addEventListener("click", ev => {
    ev.preventDefault();
    autoFill(actor);
  });

  aside.querySelectorAll("[data-aid-ammo]").forEach(s => {
    s.addEventListener("change", ev => {
      ev.stopPropagation();
      setAmmo(actor, s.value);
    });
    s.addEventListener("click", ev => ev.stopPropagation());
  });

  if ( !editable ) return;

  // Ablegen auf der Paperdoll
  aside.addEventListener("dragover", ev => {
    const t = ev.target.closest("[data-aid-drop]");
    if ( !t ) return;
    ev.preventDefault();
    aside.querySelectorAll(".aid-over").forEach(e => e !== t && e.classList.remove("aid-over"));
    t.classList.add("aid-over");
  });
  aside.addEventListener("dragleave", ev => {
    const t = ev.target.closest("[data-aid-drop]");
    if ( t && !t.contains(ev.relatedTarget) ) t.classList.remove("aid-over");
  });
  aside.addEventListener("drop", async ev => {
    const t = ev.target.closest("[data-aid-drop]");
    aside.querySelectorAll(".aid-over").forEach(e => e.classList.remove("aid-over"));
    ev.preventDefault();
    ev.stopPropagation();
    if ( !t ) return;
    const data = parseDrop(ev);
    if ( data?.type !== "Item" ) return;
    const kind = t.dataset.aidDrop;
    if ( kind === "ground" ) {
      const item = await Item.implementation.fromDropData(data).catch(() => null);
      if ( item?.parent === actor ) await dropToGround(actor, item);
      return;
    }
    const item = await resolveDropItem(actor, data);
    if ( !item ) return;
    if ( kind === "slot" ) return equipToSlot(actor, item, t.dataset.slot, { force: ev.shiftKey });
    if ( kind === "weapon" ) return assignWeapon(actor, item, t.dataset.set, t.dataset.which);
    if ( kind === "setpill" ) {
      const st = getSets(actor).sets[t.dataset.set];
      const main = actor.items.get(st.primary);
      let which = "primary";
      if ( isShield(item) || isFocus(item) ) which = "secondary";
      else if ( main && (main.id !== item.id) && !isTwoHanded(main) && !isTwoHanded(item) && !st.secondary ) which = "secondary";
      return assignWeapon(actor, item, t.dataset.set, which);
    }
    if ( kind === "container" ) return assignContainer(actor, item, Number(t.dataset.index));
  });
}

function bindContainers(app, actor, tab) {
  const editable = app.isEditable && actor.isOwner;
  const wrap = tab.querySelector(".aid-containers");
  if ( !wrap ) return;

  wrap.querySelectorAll("[data-aid-mkpurse]").forEach(b => b.addEventListener("click", async ev => {
    ev.preventDefault();
    ev.stopPropagation();
    const c = actor.items.get(b.dataset.aidMkpurse);
    if ( c && game.user.isGM ) await c.setFlag(ID, "purse", true);
  }));

  wrap.querySelectorAll("[data-aid-combat]").forEach(b => b.addEventListener("click", async ev => {
    ev.preventDefault();
    ev.stopPropagation();
    const c = actor.items.get(b.dataset.aidCombat);
    if ( c && game.user.isGM ) await c.setFlag(ID, "combatUse", c.getFlag(ID, "combatUse") === false);
  }));

  wrap.querySelectorAll(".aid-container-header[draggable=\"true\"]").forEach(h => h.addEventListener("dragstart", ev => {
    const c = actor.items.get(h.dataset.aidToggle);
    if ( c ) setDragData(ev, c, { from: "container" });
  }));

  wrap.querySelectorAll("[data-aid-toggle]").forEach(h => h.addEventListener("click", async ev => {
    if ( ev.target.closest("a, button, select, input") ) return;
    const id = h.dataset.aidToggle;
    const box = h.closest(".aid-container");
    box.classList.toggle("collapsed");
    h.setAttribute("aria-expanded", String(!box.classList.contains("collapsed")));
    const key = `collapsed.${actor.id}`;
    const set = new Set(game.user.getFlag(ID, key) ?? []);
    if ( box.classList.contains("collapsed") ) set.add(id);
    else set.delete(id);
    await game.user.setFlag(ID, key, [...set]);
  }));

  wrap.querySelectorAll(".aid-row").forEach(row => {
    const item = actor.items.get(row.dataset.aidItem);
    if ( !item ) return;
    row.addEventListener("dragstart", ev => setDragData(ev, item, { from: "container" }));
    row.querySelector("[data-aid-act=open]")?.addEventListener("click", ev => {
      ev.preventDefault();
      useItem(item, ev);
    });
    row.querySelector("[data-aid-act=use]")?.addEventListener("click", ev => {
      ev.preventDefault();
      ev.stopPropagation();
      if ( !game.user.isGM && inCombat(actor) && !isReachable(item) ) return ui.notifications.warn(L("Warn.NotReachable", { item: item.name }));
      item.use({ event: ev });
    });
    row.querySelectorAll("[data-aid-act=inc], [data-aid-act=dec]").forEach(a => a.addEventListener("click", ev => {
      ev.preventDefault();
      ev.stopPropagation();
      if ( !editable ) return;
      const q = item.system.quantity ?? 0;
      item.update({ "system.quantity": Math.max(0, q + (a.dataset.aidAct === "inc" ? 1 : -1)) });
    }));
    const ctl = row.querySelector("[data-context-menu]");
    const CM = globalThis.dnd5e?.applications?.ContextMenu5e;
    if ( ctl && CM?.triggerEvent ) ctl.addEventListener("click", CM.triggerEvent);
  });
}

/** Zeile oder Behälter aus der rechten Spalte verschieben (statt dnd5e-Kopie). */
async function moveBetweenContainers(actor, data, event) {
  const item = await Item.implementation.fromDropData(data).catch(() => null);
  if ( item?.parent !== actor ) return false;
  if ( !actor.isOwner ) return true;
  const target = event.target.closest(".aid-container[data-item-id]")?.dataset.itemId ?? null;
  if ( target === item.id ) return true;
  // Nicht in sich selbst oder einen eigenen Unterbehälter legen
  let id = target;
  const seen = new Set();
  while ( id && !seen.has(id) ) {
    if ( id === item.id ) return true;
    seen.add(id);
    id = actor.items.get(id)?.system.container;
  }
  if ( (item.system.container ?? null) === target ) return true;
  const d = getDoll(actor);
  if ( d.containers.includes(item.id) || d.slots.some(e => e.i === item.id) ) {
    await unequip(actor, item, target);
    return true;
  }
  await actor.updateEmbeddedDocuments("Item", [{ _id: item.id, "system.container": target }], { aid: true });
  return true;
}

/**
 * Drops auf dem Bogen abfangen: Was von der Paperdoll in die rechte Spalte gezogen wird, wird abgelegt
 * (in den Ziel-Behälter oder den Primär-Behälter). Drops auf der Paperdoll selbst verarbeitet nur die Paperdoll.
 * @returns {Promise<boolean>} true, wenn der Drop erledigt ist.
 */
async function handleSheetDrop(app, event) {
  const actor = app.actor;
  if ( !actor || (actor.type !== "character") ) return false;
  if ( event.target?.closest?.(".aid-doll, .aid-cbar") ) return true;
  if ( !event.target?.closest?.(".tab.aid-tab") ) return false;
  const data = parseDrop(event);
  if ( (data?.type !== "Item") || !["doll", "container"].includes(data.aidFrom) ) return false;
  if ( data.aidFrom === "container" ) return moveBetweenContainers(actor, data, event);
  if ( !canEdit(actor) ) return true;
  const item = await Item.implementation.fromDropData(data).catch(() => null);
  if ( item?.parent !== actor ) return true;
  const target = event.target.closest(".aid-container[data-item-id]")?.dataset.itemId;
  if ( target === item.id ) return true;
  if ( data.aidSet ) await removeFromSet(actor, item, data.aidSet, data.aidWhich, target ?? undefined);
  else await unequip(actor, item, target ?? undefined);
  return true;
}

function hideWornRows(actor, tab) {
  if ( !setting("hideWornInList") ) return;
  const worn = wornIds(actor);
  // Ausgerüstete Gegenstände, die auf die Paperdoll gehören, ebenfalls ausblenden
  const slotTypes = getLayout().slots.map(s => s.type);
  for ( const item of actor.items ) {
    if ( !item.system.equipped || (item.type === "container") ) continue;
    if ( (item.type === "weapon") || isShield(item) || slotTypes.some(t => matchesType(item, t)) ) worn.add(item.id);
  }
  const list = tab.querySelector(".inventory-element .items-list");
  if ( !list ) return;
  for ( const li of list.querySelectorAll("li.item[data-item-id]") ) {
    li.classList.toggle("aid-hidden", worn.has(li.dataset.itemId));
  }
  for ( const section of list.querySelectorAll(":scope > .items-section") ) {
    const visible = section.querySelector("li.item[data-item-id]:not(.aid-hidden)");
    section.classList.toggle("aid-hidden", !visible && !!section.querySelector("li.item[data-item-id]"));
  }
}

function inject(app, element) {
  const actor = app.actor;
  if ( !actor || (actor.type !== "character") || !setting("enabled") ) return;
  const root = element instanceof HTMLElement ? element : element?.[0];
  const tab = root?.querySelector("section.tab[data-tab=\"inventory\"]");
  if ( !tab ) return;

  tab.classList.add("aid-tab");
  tab.querySelector(":scope > .aid-doll")?.remove();
  tab.querySelectorAll(".aid-containers, .aid-unstowed-title").forEach(e => e.remove());

  // Paperdoll links
  const tmp = document.createElement("div");
  tmp.innerHTML = renderDoll(app, actor);
  const aside = tmp.firstElementChild;
  tab.prepend(aside);
  bindDoll(app, actor, aside);

  // Behälter rechts (im Inventar-Element, damit der dnd5e-Stil greift)
  const inv = tab.querySelector(".inventory-element");
  const list = inv?.querySelector(".items-list");
  tab.classList.toggle("aid-purse-mode", purseActive());
  tab.querySelectorAll(".aid-purses, .aid-cbar").forEach(e => e.remove());
  if ( inv && list ) {
    const box = document.createElement("div");
    box.innerHTML = renderContainerSlots(actor, getDoll(actor), app.isEditable && canEdit(actor))
      + (purseActive() ? renderPurses(app, actor) : "") + renderContainers(app, actor);
    for ( const node of [...box.children] ) inv.insertBefore(node, list);
    bindContainers(app, actor, tab);
    bindPurses(app, actor, tab);
    const bar = tab.querySelector(".aid-cbar");
    if ( bar ) bindDoll(app, actor, bar);
  }
  hideWornRows(actor, tab);

  if ( setting("hideSidebar") && (app.tabGroups?.primary === "inventory") ) app._toggleSidebar?.(true);
}

/* -------------------------------------------- */
/*  SL-Editor                                   */
/* -------------------------------------------- */

const { ApplicationV2 } = foundry.applications.api;

class LayoutEditor extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "aid-layout-editor",
    classes: ["aid-editor", "dnd5e2"],
    window: { title: "AID.Editor.Title", icon: "fa-solid fa-person-rays", resizable: true },
    position: { width: 860, height: "auto" }
  };

  constructor(options) {
    super(options);
    this.layout = getLayout();
    this.selected = this.layout.slots[0]?.id ?? null;
  }

  async _renderHTML() {
    const lay = this.layout;
    const slots = lay.slots.map(slot => `<button type="button" class="aid-ed-slot ${slot.id === this.selected ? "selected" : ""}"
        style="left:${slot.x}%;top:${slot.y}%" data-select="${esc(slot.id)}">
        <span class="aid-ed-tile">${esc(slotLabel(slot))}</span><span class="aid-ed-type">${esc(slotTypeLabel(slot.type))}</span></button>`).join("");
    // Vorgeschlagene freie Stellen bekommen ein „+“; zusätzlich kann überall in die Fläche geklickt werden.
    const free = Object.values(ANCHORS).filter(a => !lay.slots.some(sl => Math.hypot(sl.x - a.x, (sl.y - a.y) * 1.25) < 9));
    const adds = free.map(a => `<button type="button" class="aid-ed-add" style="left:${a.x}%;top:${a.y}%" data-add-x="${a.x}" data-add-y="${a.y}"
        aria-label="${esc(L("Editor.Add"))}" data-tooltip="${esc(L("Editor.Add"))}">+</button>`).join("");
    const anchors = adds + slots;
    const sel = lay.slots.find(s => s.id === this.selected);
    const typeOpts = Object.keys(SLOT_TYPES).map(t => `<option value="${t}" ${sel?.type === t ? "selected" : ""}>${esc(slotTypeLabel(t))}</option>`).join("");
    const form = sel ? `
        <label class="aid-ed-field"><span>${esc(L("Editor.SlotType"))}</span><select data-field="type">${typeOpts}</select></label>
        <label class="aid-ed-field"><span>${esc(L("Editor.Label"))}</span><input type="text" data-field="label" value="${esc(sel.label)}" placeholder="${esc(slotTypeLabel(sel.type))}"></label>
        <p class="aid-ed-hint">${esc(L(`TypeHint.${sel.type}`))}</p>
        <button type="button" class="aid-ed-remove" data-remove><i class="fa-solid fa-trash" inert></i> ${esc(L("Editor.Remove"))}</button>`
      : `<p class="aid-ed-hint">${esc(L("Editor.NoSelection"))}</p>`;
    return `<div class="aid-ed">
        <div class="aid-ed-figure" data-figure>
          <div class="aid-ed-portrait"><i class="fa-solid fa-user" inert></i></div>
          <div class="aid-ed-fixed hand" data-fixed="main" style="left:${lay.fixed.main.x}%;top:${lay.fixed.main.y}%" data-tooltip="${esc(L("Editor.MoveHint"))}"><span class="aid-ed-sets">I · II · III</span>${esc(L("Sets.Main"))}</div>
          <div class="aid-ed-fixed hand" data-fixed="off" style="left:${lay.fixed.off.x}%;top:${lay.fixed.off.y}%" data-tooltip="${esc(L("Editor.MoveHint"))}">${esc(L("Sets.Off"))}</div>
          <div class="aid-ed-fixed ac" data-fixed="ac" style="left:${lay.fixed.ac.x}%;top:${lay.fixed.ac.y}%" data-tooltip="${esc(L("Editor.MoveHint"))}">${esc(L("Doll.ACShort"))}</div>
          ${anchors}
        </div>
        <div class="aid-ed-side">
          <fieldset><legend>${esc(L("Editor.Selected"))}</legend>${form}</fieldset>
          <fieldset><legend>${esc(L("Editor.Fixed"))}</legend>
            <p class="aid-ed-row"><span>${esc(L("Editor.WeaponSets"))}</span><strong>3 × ${esc(L("Sets.Main"))}/${esc(L("Sets.Off"))}</strong></p>
            <label class="aid-ed-field inline"><span>${esc(L("Editor.ContainerSlots"))}</span><input type="number" min="1" max="8" step="1" data-field="containerSlots" value="${lay.containerSlots}"></label>
          </fieldset>
          <fieldset><legend>${esc(L("Purse.Title"))}</legend>
            <label class="aid-ed-field inline"><span>${esc(L("Settings.Purse.Name"))}</span><input type="checkbox" data-purse-on ${setting("purseEnabled") ? "checked" : ""}></label>
            <label class="aid-ed-field inline"><span>${esc(L("Settings.PurseCap.Name"))}</span><input type="number" min="10" max="10000" step="10" data-purse-cap value="${setting("purseCapacity")}"></label>
          </fieldset>
          <p class="aid-ed-hint">${esc(L("Editor.Hint"))}</p>
          <button type="button" data-settings><i class="fa-solid fa-sliders" inert></i> ${esc(L("Editor.AllSettings"))}</button>
          <div class="aid-ed-buttons">
            <button type="button" data-reset><i class="fa-solid fa-rotate-left" inert></i> ${esc(L("Editor.Reset"))}</button>
            <button type="button" class="bright" data-save><i class="fa-solid fa-floppy-disk" inert></i> ${esc(L("Editor.Save"))}</button>
          </div>
        </div>
      </div>`;
  }

  _replaceHTML(result, content) {
    content.innerHTML = result;
    const figure = content.querySelector("[data-figure]");
    const addAt = (x, y) => {
      const id = foundry.utils.randomID(8);
      const type = this.layout.slots.find(sl => sl.id === this.selected)?.type ?? "ring";
      this.layout.slots.push({ id, x: Math.round(Math.clamp(x, 4, 96)), y: Math.round(Math.clamp(y, 4, 96)), type, label: "" });
      this.selected = id;
      this.render();
    };
    const pct = ev => {
      const r = figure.getBoundingClientRect();
      return { x: ((ev.clientX - r.left) / r.width) * 100, y: ((ev.clientY - r.top) / r.height) * 100 };
    };
    content.querySelectorAll("[data-add-x]").forEach(b => b.addEventListener("click", ev => {
      ev.stopPropagation();
      addAt(Number(b.dataset.addX), Number(b.dataset.addY));
    }));
    // In eine freie Stelle der Figur klicken = neuer Slot genau dort
    figure?.addEventListener("click", ev => {
      if ( ev.target.closest(".aid-ed-slot, .aid-ed-add, .aid-ed-fixed") ) return;
      const p = pct(ev);
      addAt(p.x, p.y);
    });
    // Feste Elemente (Hände, RK) verschieben
    content.querySelectorAll("[data-fixed]").forEach(el => {
      el.addEventListener("pointerdown", ev => {
        if ( ev.button !== 0 ) return;
        ev.preventDefault();
        ev.stopPropagation();
        const pos = this.layout.fixed[el.dataset.fixed];
        el.setPointerCapture(ev.pointerId);
        const move = e => {
          const p = pct(e);
          pos.x = Math.round(Math.clamp(p.x, 4, 96));
          pos.y = Math.round(Math.clamp(p.y, 4, 96));
          el.style.left = `${pos.x}%`;
          el.style.top = `${pos.y}%`;
        };
        const up = () => {
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerup", up);
          el.removeEventListener("pointercancel", up);
        };
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerup", up);
        el.addEventListener("pointercancel", up);
      });
      el.addEventListener("click", ev => ev.stopPropagation());
    });

    // Slots anklicken = auswählen, ziehen = verschieben
    content.querySelectorAll("[data-select]").forEach(b => {
      b.addEventListener("pointerdown", ev => {
        if ( ev.button !== 0 ) return;
        ev.preventDefault();
        const slot = this.layout.slots.find(sl => sl.id === b.dataset.select);
        const start = { x: ev.clientX, y: ev.clientY };
        let moved = false;
        b.setPointerCapture(ev.pointerId);
        const move = e => {
          if ( !moved && (Math.hypot(e.clientX - start.x, e.clientY - start.y) < 4) ) return;
          moved = true;
          const p = pct(e);
          slot.x = Math.round(Math.clamp(p.x, 4, 96));
          slot.y = Math.round(Math.clamp(p.y, 4, 96));
          b.style.left = `${slot.x}%`;
          b.style.top = `${slot.y}%`;
        };
        const up = () => {
          b.removeEventListener("pointermove", move);
          b.removeEventListener("pointerup", up);
          b.removeEventListener("pointercancel", up);
          this.selected = slot.id;
          this.render();
        };
        b.addEventListener("pointermove", move);
        b.addEventListener("pointerup", up);
        b.addEventListener("pointercancel", up);
      });
      b.addEventListener("click", ev => ev.stopPropagation());
    });
    const sel = () => this.layout.slots.find(s => s.id === this.selected);
    content.querySelector("[data-field=type]")?.addEventListener("change", ev => {
      const s = sel();
      if ( s ) s.type = ev.currentTarget.value;
      this.render();
    });
    content.querySelector("[data-field=label]")?.addEventListener("change", ev => {
      const s = sel();
      if ( s ) s.label = ev.currentTarget.value.trim();
      this.render();
    });
    content.querySelector("[data-field=containerSlots]")?.addEventListener("change", ev => {
      this.layout.containerSlots = Math.clamp(Number(ev.currentTarget.value) || 4, 1, 8);
    });
    content.querySelector("[data-remove]")?.addEventListener("click", () => {
      this.layout.slots = this.layout.slots.filter(s => s.id !== this.selected);
      this.selected = this.layout.slots[0]?.id ?? null;
      this.render();
    });
    content.querySelector("[data-settings]")?.addEventListener("click", async () => {
      const Config = foundry.applications.settings?.SettingsConfig;
      if ( !Config ) return game.settings.sheet?.render(true);
      const cfg = foundry.applications.instances.get("settings-config") ?? new Config();
      await cfg.render({ force: true });
      try { cfg.changeTab?.(ID, "categories"); } catch { /* Reiter optional */ }
    });
    content.querySelector("[data-reset]")?.addEventListener("click", () => {
      this.layout = foundry.utils.deepClone(DEFAULT_LAYOUT);
      this.selected = this.layout.slots[0].id;
      this.render();
    });
    content.querySelector("[data-save]")?.addEventListener("click", async () => {
      this.layout.v = LAYOUT_VERSION;
      await game.settings.set(ID, "layout", this.layout);
      const cap = Math.clamp(Number(content.querySelector("[data-purse-cap]")?.value) || 300, 10, 10000);
      if ( cap !== setting("purseCapacity") ) await game.settings.set(ID, "purseCapacity", cap);
      const on = !!content.querySelector("[data-purse-on]")?.checked;
      if ( on !== setting("purseEnabled") ) await game.settings.set(ID, "purseEnabled", on);
      ui.notifications.info(L("Editor.Saved"));
      this.close();
    });
  }
}

/* -------------------------------------------- */
/*  Hooks                                       */
/* -------------------------------------------- */

function rerenderSheets() {
  for ( const app of foundry.applications.instances.values() ) {
    if ( (app.document?.documentName === "Actor") && (app.document.type === "character") && app.rendered ) app.render();
  }
}

Hooks.once("init", () => {
  const reg = (key, data) => game.settings.register(ID, key, { scope: "world", config: true, ...data });
  game.settings.register(ID, "layout", { scope: "world", config: false, type: Object, default: DEFAULT_LAYOUT, onChange: rerenderSheets });
  game.settings.registerMenu(ID, "layoutEditor", {
    name: "AID.Settings.Editor.Name", label: "AID.Settings.Editor.Label", hint: "AID.Settings.Editor.Hint",
    icon: "fa-solid fa-person-rays", type: LayoutEditor, restricted: true
  });
  reg("enabled", { name: "AID.Settings.Enabled.Name", hint: "AID.Settings.Enabled.Hint", type: Boolean, default: true, onChange: rerenderSheets });
  reg("hideSidebar", { name: "AID.Settings.HideSidebar.Name", hint: "AID.Settings.HideSidebar.Hint", type: Boolean, default: true, onChange: rerenderSheets });
  reg("playersEquip", { name: "AID.Settings.PlayersEquip.Name", hint: "AID.Settings.PlayersEquip.Hint", type: Boolean, default: true, onChange: rerenderSheets });
  reg("strictSlots", { name: "AID.Settings.Strict.Name", hint: "AID.Settings.Strict.Hint", type: Boolean, default: true });
  reg("autoEquip", { name: "AID.Settings.AutoEquip.Name", hint: "AID.Settings.AutoEquip.Hint", type: Boolean, default: true });
  reg("autoAttune", { name: "AID.Settings.Attune.Name", hint: "AID.Settings.Attune.Hint", type: Boolean, default: true });
  reg("hideWornInList", { name: "AID.Settings.HideWorn.Name", hint: "AID.Settings.HideWorn.Hint", type: Boolean, default: true, onChange: rerenderSheets });
  reg("purseEnabled", { name: "AID.Settings.Purse.Name", hint: "AID.Settings.Purse.Hint", type: Boolean, default: false, onChange: onPurseToggle });
  reg("purseCapacity", { name: "AID.Settings.PurseCap.Name", hint: "AID.Settings.PurseCap.Hint", type: Number, default: 300, range: { min: 10, max: 10000, step: 10 }, onChange: rerenderSheets });
  reg("allowGround", { name: "AID.Settings.Ground.Name", hint: "AID.Settings.Ground.Hint", type: Boolean, default: true, onChange: rerenderSheets });
});

Hooks.once("setup", () => {
  // Geldbörsen-Summe in actor.system.currency (nach allen dnd5e-Berechnungen)
  const ActorCls = CONFIG.Actor.documentClass;
  const prep = ActorCls.prototype.prepareDerivedData;
  ActorCls.prototype.prepareDerivedData = function(...args) {
    const r = prep.apply(this, args);
    try { applyPurseTotals(this); } catch ( err ) { console.error(`${ID} | Geldbörse`, err); }
    return r;
  };

  // Seitenleiste auf dem Inventar-Reiter einklappen, auf anderen Reitern wie gewohnt.
  const Sheet = globalThis.dnd5e?.applications?.actor?.CharacterActorSheet;
  if ( !Sheet ) return console.warn(`${ID} | CharacterActorSheet nicht gefunden`);
  const originalDrop = Sheet.prototype._onDrop;
  Sheet.prototype._onDrop = async function(event) {
    try {
      if ( setting("enabled") && await handleSheetDrop(this, event) ) return;
    } catch ( err ) { console.error(`${ID} | Drop`, err); }
    return originalDrop.call(this, event);
  };
  const original = Sheet.prototype.changeTab;
  Sheet.prototype.changeTab = function(tab, group, options) {
    original.call(this, tab, group, options);
    if ( (group !== "primary") || !setting("enabled") || !setting("hideSidebar") ) return;
    if ( tab === "inventory" ) this._toggleSidebar?.(true);
    else this._toggleSidebar?.(!!game.user.getFlag("dnd5e", this._sidebarCollapsedKeyPath));
  };
});

Hooks.once("ready", () => {
  game.modules.get(ID).api = { isReachable, getLayout, getDoll };
  game.socket.on(SOCKET, msg => {
    if ( (msg?.action === "ground") && (msg.gmId === game.user.id) ) groundHandler(msg.payload, msg.userId);
  });
});

// Geld-Änderungen von außen (Shops, Belohnungen, Würfe) in die Geldbörsen umleiten
Hooks.on("preUpdateActor", (actor, changes, options) => {
  if ( options.aidPurse || (actor.type !== "character") || !purseActive() ) return;
  const cc = foundry.utils.getProperty(changes, "system.currency");
  if ( !cc || !pursesOf(actor).length ) return;
  const own = ownCoins(actor);
  const delta = {};
  for ( const d of DENOMS() ) {
    if ( !(d in cc) ) continue;
    const diff = (Number(cc[d]) || 0) - (Number(actor.system.currency?.[d]) || 0);
    cc[d] = Number(own[d]) || 0;
    if ( diff ) delta[d] = diff;
  }
  if ( Object.keys(delta).length ) options.aidPurseDelta = delta;
});
Hooks.on("updateActor", (actor, changes, options, userId) => {
  if ( (userId === game.user.id) && options.aidPurseDelta ) applyCoinDelta(actor, options.aidPurseDelta);
});

Hooks.on("renderCharacterActorSheet", (app, element) => {
  try {
    inject(app, element);
  } catch ( err ) {
    console.error(`${ID} | Fehler beim Aufbau der Paperdoll`, err);
  }
});

// Wird ein Gegenstand anderweitig in einen Behälter gelegt oder abgelegt, Paperdoll aufräumen.
Hooks.on("updateItem", (item, changes, options, userId) => {
  if ( (userId !== game.user.id) || options.aid || !(item.parent instanceof Actor) || (item.parent.type !== "character") ) return;
  const actor = item.parent;
  if ( !setting("enabled") ) return;
  if ( foundry.utils.getProperty(changes, "system.equipped") === true ) return autoEquip(actor, item);
  const movedIn = foundry.utils.hasProperty(changes, "system.container") && changes.system.container;
  const unequipped = foundry.utils.getProperty(changes, "system.equipped") === false;
  if ( !movedIn && !unequipped ) return;
  const d = getDoll(actor);
  const sets = getSets(actor);
  const inSlot = d.slots.some(e => e.i === item.id);
  const inSet = setIds(sets).has(item.id);
  const inActive = inActiveSet(sets, item.id);
  const inContainerSlot = d.containers.includes(item.id);
  if ( movedIn ) {
    if ( !(inSlot || inSet || inContainerSlot) ) return;
    detach(d, sets, item.id);
    return commit(actor, { ...dollUpdate(d), ...setsUpdate(sets) }, []);
  }
  // Abgerüstet (z. B. Schild-Symbol in der Liste) → von der Paperdoll in den Primär-Behälter
  // (Waffen aus inaktiven Sets werden beim Set-Wechsel abgerüstet – die bleiben im Set.)
  if ( !(inSlot || inActive) ) return;
  d.slots = d.slots.filter(e => e.i !== item.id);
  const act = sets.sets[sets.active];
  if ( act.primary === item.id ) act.primary = null;
  if ( act.secondary === item.id ) act.secondary = null;
  if ( setIds(sets).has(item.id) ) return commit(actor, { ...dollUpdate(d), ...setsUpdate(sets) }, []);
  const target = item.system.container ? null : primaryContainer(actor, d, item.id);
  const updates = [{ _id: item.id, _aidStow: true, ...(target ? { "system.container": target } : {}) }];
  return commit(actor, { ...dollUpdate(d), ...setsUpdate(sets) }, updates);
});
