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
  l0: { x: 11, y: 8 }, l1: { x: 11, y: 24 }, l2: { x: 11, y: 40 }, l3: { x: 11, y: 56 }, l4: { x: 11, y: 72 },
  r0: { x: 89, y: 8 }, r1: { x: 89, y: 24 }, r2: { x: 89, y: 40 }, r3: { x: 89, y: 56 }, r4: { x: 89, y: 72 },
  b0: { x: 22, y: 91 }, b1: { x: 36, y: 91 }, b2: { x: 50, y: 91 }, b3: { x: 64, y: 91 }, b4: { x: 78, y: 91 }
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

const DEFAULT_LAYOUT = {
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
  ]
};

function getLayout() {
  const l = foundry.utils.deepClone(setting("layout") ?? {});
  if ( !Array.isArray(l.slots) ) return foundry.utils.deepClone(DEFAULT_LAYOUT);
  l.slots = l.slots.filter(s => ANCHORS[s.anchor] && (s.type in SLOT_TYPES));
  l.containerSlots = Math.clamp(Number(l.containerSlots) || 4, 1, 8);
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
  const u = { _id: item.id, "system.container": (containerId && (containerId !== item.id)) ? containerId : null };
  if ( item.system.equipped !== undefined ) u["system.equipped"] = false;
  return u;
}

function equipUpdate(item, equipped = true) {
  const u = { _id: item.id, "system.container": null };
  if ( item.system.equipped !== undefined ) u["system.equipped"] = equipped;
  return u;
}

/** Änderungen gesammelt schreiben (Flags + Gegenstände). */
async function commit(actor, flagUpdate, itemUpdates) {
  const merged = new Map();
  for ( const u of itemUpdates ) merged.set(u._id, { ...(merged.get(u._id) ?? {}), ...u });
  if ( flagUpdate && Object.keys(flagUpdate).length ) await actor.update(flagUpdate);
  if ( merged.size ) await actor.updateEmbeddedDocuments("Item", [...merged.values()]);
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

  if ( which === "primary" ) {
    if ( s.primary && (s.primary !== item.id) ) removed.push(s.primary);
    if ( s.secondary === item.id ) s.secondary = null;
    s.primary = item.id;
    if ( isTwoHanded(item) && s.secondary ) { removed.push(s.secondary); s.secondary = null; }
  } else {
    if ( s.secondary && (s.secondary !== item.id) ) removed.push(s.secondary);
    if ( s.primary === item.id ) s.primary = null;
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
  if ( !d.containers.some(Boolean) ) {
    const packs = actor.itemTypes.container.filter(c => !c.system.container);
    packs.sort((a, b) => (nameHas(b, ["backpack", "rucksack"]) ? 1 : 0) - (nameHas(a, ["backpack", "rucksack"]) ? 1 : 0));
    d.containers = packs.slice(0, layout.containerSlots).map(c => c.id);
    for ( const c of packs.slice(0, layout.containerSlots) ) updates.push(equipUpdate(c, true));
  }
  await commit(actor, { ...dollUpdate(d), ...setsUpdate(data) }, updates);
  ui.notifications.info(L("Info.AutoFilled"));
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

function renderSlot(actor, slot, d, editable) {
  const a = ANCHORS[slot.anchor];
  const item = actor.items.get(slotItemId(d, slot.id));
  const label = slotLabel(slot);
  return `<div class="aid-slot ${item ? "filled" : "empty"}" style="left:${a.x}%;top:${a.y}%"
      data-aid-drop="slot" data-slot="${esc(slot.id)}" ${item ? `data-aid-item="${item.id}" data-tooltip="${esc(item.name)}"` : `data-tooltip="${esc(label)}"`}>
      <div class="aid-tile" ${item && editable ? "draggable=\"true\"" : ""}>${item ? img(item.img, item.name) : ""}</div>
      <span class="aid-label">${esc(label)}</span>
    </div>`;
}

function renderWeaponSlot(actor, set, which, id, editable, two = false) {
  const item = actor.items.get(id);
  const placeholder = L(which === "primary" ? "Sets.Main" : "Sets.Off");
  return `<div class="aid-wslot ${item ? "filled" : "empty"} ${two ? "two" : ""}" data-aid-drop="weapon" data-set="${set}" data-which="${which}"
      ${item ? `data-aid-item="${item.id}"` : ""} ${item && editable ? "draggable=\"true\"" : ""}>
      ${item ? `<span class="aid-wimg">${img(item.img, item.name)}</span><span class="aid-wname">${esc(item.name)}</span>`
    : `<span class="aid-wplace">${esc(placeholder)}</span>`}
      ${two ? `<span class="aid-pill">${esc(L("Sets.TwoHanded"))}</span>` : ""}
    </div>`;
}

function renderSets(actor, editable) {
  const data = getSets(actor);
  const nums = { 1: "I", 2: "II", 3: "III" };
  const rows = ["1", "2", "3"].map(n => {
    const s = data.sets[n];
    const main = actor.items.get(s.primary);
    const two = isTwoHanded(main);
    const slots = two
      ? renderWeaponSlot(actor, n, "primary", s.primary, editable, true)
      : renderWeaponSlot(actor, n, "primary", s.primary, editable) + renderWeaponSlot(actor, n, "secondary", s.secondary, editable);
    return `<div class="aid-set ${data.active === n ? "active" : ""}">
        <button type="button" class="aid-setnum" data-aid-set="${n}" data-tooltip="${esc(L("Sets.Activate"))}">${nums[n]}</button>
        <div class="aid-setslots">${slots}</div>
      </div>`;
  }).join("");
  return `<section class="aid-card">
      <header class="aid-header"><h3>${esc(L("Sets.Title"))}</h3><span>${esc(L(hudActive() ? "Sets.SyncedHud" : "Sets.Own"))}</span></header>
      <div class="aid-sets">${rows}</div>
    </section>`;
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
    const tag = i === 0 ? `★ ${L("Containers.Primary")}` : `${i + 1}`;
    cells.push(`<div class="aid-cslot ${c ? "filled" : "empty"} ${i === 0 ? "primary" : ""}" data-aid-drop="container" data-index="${i}"
        ${c ? `data-aid-item="${c.id}"` : ""}>
        <span class="aid-ctag">${esc(tag)}</span>
        ${c ? `<div class="aid-cbody" ${editable ? "draggable=\"true\"" : ""}>${img(c.img, c.name)}<span class="aid-cname">${esc(c.name)}</span></div>${ammoSelect(actor, c, d)}`
    : `<span class="aid-cplace">${esc(L("Containers.Drop"))}</span>`}
      </div>`);
  }
  return `<section class="aid-card">
      <header class="aid-header"><h3>${esc(L("Containers.Title"))}</h3><span>${esc(L("Containers.Hint"))}</span></header>
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
  return `<aside class="aid-doll ${editable ? "editable" : "locked"}">
      <section class="aid-card">
        <header class="aid-header"><h3>${esc(L("Doll.Title"))}</h3>${auto}</header>
        <div class="aid-figure">
          <div class="aid-portrait">${img(actor.img, actor.name)}</div>
          <div class="aid-ac" data-tooltip="${esc(L("Doll.AC"))}"><span>${esc(L("Doll.ACShort"))}</span><strong>${esc(ac)}</strong></div>
          ${slots}
        </div>
      </section>
      ${renderSets(actor, editable)}
      ${renderContainerSlots(actor, d, editable)}
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
  const useCell = isConsumable(item) && app.actor.isOwner
    ? `<button type="button" class="aid-use-btn" data-aid-act="use">${esc(L("Row.Use"))}</button>${uses ? `<span class="aid-uses">${esc(uses)}</span>` : ""}`
    : (uses ? esc(uses) : "<span class=\"aid-dim\">–</span>");
  const qtyCell = editable
    ? `<a class="aid-adj" data-aid-act="dec" aria-label="−"><i class="fa-solid fa-minus" inert></i></a><span>${qty}</span><a class="aid-adj" data-aid-act="inc" aria-label="+"><i class="fa-solid fa-plus" inert></i></a>`
    : `<span>${qty}</span>`;
  return `<li class="item aid-row" data-item-id="${item.id}" data-uuid="${esc(item.uuid)}" data-aid-item="${item.id}" draggable="true">
      <div class="item-row">
        <div class="item-name aid-name" role="button" data-aid-act="open">
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

function renderContainerSection(app, container, { primary = false, attached = true, collapsed = false }, editable) {
  const cap = capacityOf(container);
  const pct = cap ? Math.clamp(Math.round((Number(cap.value) / Number(cap.max)) * 100), 0, 100) : 0;
  const items = [...(container.system.contents ?? [])].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  const rows = items.length ? items.map(i => renderRow(app, i, editable)).join("")
    : `<li class="aid-empty">${esc(L("Containers.Empty"))}</li>`;
  return `<div class="aid-container container ${collapsed ? "collapsed" : ""} ${attached ? "" : "detached"}" data-item-id="${container.id}" data-uuid="${esc(container.uuid)}">
      <div class="aid-container-header" data-aid-toggle="${container.id}" role="button" aria-expanded="${!collapsed}">
        <i class="fa-solid fa-chevron-right aid-chevron" inert></i>
        <h3>${esc(container.name)}</h3>
        ${primary ? `<span class="aid-pill">★ ${esc(L("Containers.Primary"))}</span>` : ""}
        ${attached ? "" : `<span class="aid-pill dim">${esc(L("Containers.Detached"))}</span>`}
        <span class="aid-spacer"></span>
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
  const attached = d.containers.filter(Boolean);
  const primary = primaryContainer(actor, d);
  const sections = attached.map(id => renderContainerSection(app, actor.items.get(id),
    { primary: id === primary, attached: true, collapsed: collapsedSet.has(id) }, editable));
  const loose = actor.itemTypes.container.filter(c => !attached.includes(c.id) && !c.system.container);
  for ( const c of loose ) sections.push(renderContainerSection(app, c, { attached: false, collapsed: collapsedSet.has(c.id) }, editable));
  const title = `<h3 class="aid-unstowed-title">${esc(L("Containers.Unstowed"))}</h3>`;
  return `<div class="aid-containers">${sections.join("")}</div>${title}`;
}

/* -------------------------------------------- */
/*  Einbau in den Bogen                         */
/* -------------------------------------------- */

function parseDrop(event) {
  try {
    return JSON.parse(event.dataTransfer.getData("text/plain"));
  } catch {
    return null;
  }
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
  event.dataTransfer.setData("text/plain", JSON.stringify(data));
  event.dataTransfer.effectAllowed = "copyMove";
  event.stopPropagation();
}

function bindDoll(app, actor, aside) {
  const editable = app.isEditable && canEdit(actor);

  // Ziehen aus der Paperdoll
  aside.querySelectorAll("[data-aid-item] [draggable=\"true\"], [data-aid-item][draggable=\"true\"]").forEach(el => {
    el.addEventListener("dragstart", ev => {
      const host = el.closest("[data-aid-item]");
      const item = actor.items.get(host.dataset.aidItem);
      if ( item ) setDragData(ev, item, { from: "doll" });
    });
  });

  // Doppelklick öffnet den Gegenstand
  aside.querySelectorAll("[data-aid-item]").forEach(el => {
    el.addEventListener("dblclick", ev => {
      ev.preventDefault();
      actor.items.get(el.dataset.aidItem)?.sheet.render(true);
    });
    if ( editable ) el.addEventListener("contextmenu", ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const item = actor.items.get(el.dataset.aidItem);
      if ( item ) unequip(actor, item, el.dataset.aidDrop === "container" ? null : undefined);
    });
  });

  aside.querySelectorAll("[data-aid-set]").forEach(b => b.addEventListener("click", ev => {
    ev.preventDefault();
    if ( editable || actor.isOwner ) switchSet(actor, b.dataset.aidSet);
  }));

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
    if ( kind === "container" ) return assignContainer(actor, item, Number(t.dataset.index));
  });
}

function bindContainers(app, actor, tab) {
  const editable = app.isEditable && actor.isOwner;
  const wrap = tab.querySelector(".aid-containers");
  if ( !wrap ) return;

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
      item.sheet.render(true);
    });
    row.querySelector("[data-aid-act=use]")?.addEventListener("click", ev => {
      ev.preventDefault();
      ev.stopPropagation();
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

/** Gegenstände von der Paperdoll, die in die rechte Spalte gezogen werden → in einen Behälter. */
function bindRightSide(app, actor, tab) {
  if ( tab.dataset.aidBound ) return;
  tab.dataset.aidBound = "1";
  tab.addEventListener("drop", async ev => {
    if ( ev.target.closest(".aid-doll") ) return;
    const data = parseDrop(ev);
    if ( !data?.aidFrom || (data.aidFrom !== "doll") ) return;
    ev.preventDefault();
    ev.stopPropagation();
    if ( !canEdit(actor) ) return;
    const item = await Item.implementation.fromDropData(data).catch(() => null);
    if ( item?.parent !== actor ) return;
    const box = ev.target.closest(".aid-container[data-item-id]");
    const target = box?.dataset.itemId;
    if ( target === item.id ) return;
    await unequip(actor, item, target ?? undefined);
  });
}

function hideWornRows(actor, tab) {
  if ( !setting("hideWornInList") ) return;
  const worn = wornIds(actor);
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
  if ( inv && list ) {
    const box = document.createElement("div");
    box.innerHTML = renderContainers(app, actor);
    for ( const node of [...box.children] ) inv.insertBefore(node, list);
    bindContainers(app, actor, tab);
  }
  bindRightSide(app, actor, tab);
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
    const anchors = Object.entries(ANCHORS).map(([key, a]) => {
      const slot = lay.slots.find(s => s.anchor === key);
      const style = `left:${a.x}%;top:${a.y}%`;
      if ( slot ) {
        return `<button type="button" class="aid-ed-slot ${slot.id === this.selected ? "selected" : ""}" style="${style}" data-select="${esc(slot.id)}">
            <span class="aid-ed-tile">${esc(slotLabel(slot))}</span><span class="aid-ed-type">${esc(slotTypeLabel(slot.type))}</span></button>`;
      }
      return `<button type="button" class="aid-ed-add" style="${style}" data-add="${key}" aria-label="${esc(L("Editor.Add"))}" data-tooltip="${esc(L("Editor.Add"))}">+</button>`;
    }).join("");
    const sel = lay.slots.find(s => s.id === this.selected);
    const typeOpts = Object.keys(SLOT_TYPES).map(t => `<option value="${t}" ${sel?.type === t ? "selected" : ""}>${esc(slotTypeLabel(t))}</option>`).join("");
    const form = sel ? `
        <label class="aid-ed-field"><span>${esc(L("Editor.SlotType"))}</span><select data-field="type">${typeOpts}</select></label>
        <label class="aid-ed-field"><span>${esc(L("Editor.Label"))}</span><input type="text" data-field="label" value="${esc(sel.label)}" placeholder="${esc(slotTypeLabel(sel.type))}"></label>
        <p class="aid-ed-hint">${esc(L(`TypeHint.${sel.type}`))}</p>
        <button type="button" class="aid-ed-remove" data-remove><i class="fa-solid fa-trash" inert></i> ${esc(L("Editor.Remove"))}</button>`
      : `<p class="aid-ed-hint">${esc(L("Editor.NoSelection"))}</p>`;
    return `<div class="aid-ed">
        <div class="aid-ed-figure">
          <div class="aid-ed-portrait"><i class="fa-solid fa-user" inert></i></div>
          ${anchors}
        </div>
        <div class="aid-ed-side">
          <fieldset><legend>${esc(L("Editor.Selected"))}</legend>${form}</fieldset>
          <fieldset><legend>${esc(L("Editor.Fixed"))}</legend>
            <p class="aid-ed-row"><span>${esc(L("Editor.WeaponSets"))}</span><strong>3 × ${esc(L("Sets.Main"))}/${esc(L("Sets.Off"))}</strong></p>
            <label class="aid-ed-field inline"><span>${esc(L("Editor.ContainerSlots"))}</span><input type="number" min="1" max="8" step="1" data-field="containerSlots" value="${lay.containerSlots}"></label>
          </fieldset>
          <p class="aid-ed-hint">${esc(L("Editor.Hint"))}</p>
          <div class="aid-ed-buttons">
            <button type="button" data-reset><i class="fa-solid fa-rotate-left" inert></i> ${esc(L("Editor.Reset"))}</button>
            <button type="button" class="bright" data-save><i class="fa-solid fa-floppy-disk" inert></i> ${esc(L("Editor.Save"))}</button>
          </div>
        </div>
      </div>`;
  }

  _replaceHTML(result, content) {
    content.innerHTML = result;
    content.querySelectorAll("[data-select]").forEach(b => b.addEventListener("click", () => {
      this.selected = b.dataset.select;
      this.render();
    }));
    content.querySelectorAll("[data-add]").forEach(b => b.addEventListener("click", () => {
      const id = foundry.utils.randomID(8);
      this.layout.slots.push({ id, anchor: b.dataset.add, type: "ring", label: "" });
      this.selected = id;
      this.render();
    }));
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
    content.querySelector("[data-reset]")?.addEventListener("click", () => {
      this.layout = foundry.utils.deepClone(DEFAULT_LAYOUT);
      this.selected = this.layout.slots[0].id;
      this.render();
    });
    content.querySelector("[data-save]")?.addEventListener("click", async () => {
      await game.settings.set(ID, "layout", this.layout);
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
  reg("hideWornInList", { name: "AID.Settings.HideWorn.Name", hint: "AID.Settings.HideWorn.Hint", type: Boolean, default: true, onChange: rerenderSheets });
  reg("allowGround", { name: "AID.Settings.Ground.Name", hint: "AID.Settings.Ground.Hint", type: Boolean, default: true, onChange: rerenderSheets });
});

Hooks.once("setup", () => {
  // Seitenleiste auf dem Inventar-Reiter einklappen, auf anderen Reitern wie gewohnt.
  const Sheet = globalThis.dnd5e?.applications?.actor?.CharacterActorSheet;
  if ( !Sheet ) return console.warn(`${ID} | CharacterActorSheet nicht gefunden`);
  const original = Sheet.prototype.changeTab;
  Sheet.prototype.changeTab = function(tab, group, options) {
    original.call(this, tab, group, options);
    if ( (group !== "primary") || !setting("enabled") || !setting("hideSidebar") ) return;
    if ( tab === "inventory" ) this._toggleSidebar?.(true);
    else this._toggleSidebar?.(!!game.user.getFlag("dnd5e", this._sidebarCollapsedKeyPath));
  };
});

Hooks.once("ready", () => {
  game.socket.on(SOCKET, msg => {
    if ( (msg?.action === "ground") && (msg.gmId === game.user.id) ) groundHandler(msg.payload, msg.userId);
  });
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
  if ( (userId !== game.user.id) || !(item.parent instanceof Actor) || (item.parent.type !== "character") ) return;
  const actor = item.parent;
  const movedIn = foundry.utils.hasProperty(changes, "system.container") && changes.system.container;
  const unequipped = foundry.utils.getProperty(changes, "system.equipped") === false;
  if ( !movedIn && !unequipped ) return;
  const d = getDoll(actor);
  const inSlot = d.slots.some(e => e.i === item.id);
  const inContainerSlot = d.containers.includes(item.id);
  if ( !(movedIn && (inSlot || inContainerSlot || setIds(getSets(actor)).has(item.id))) && !(unequipped && inSlot) ) return;
  const sets = getSets(actor);
  if ( movedIn ) detach(d, sets, item.id);
  else d.slots = d.slots.filter(e => e.i !== item.id);
  actor.update({ ...dollUpdate(d), ...(movedIn ? setsUpdate(sets) : {}) });
});
