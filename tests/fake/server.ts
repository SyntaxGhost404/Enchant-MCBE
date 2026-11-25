/**
 * A small stand-in for @minecraft/server, just big enough to run the add-on's game code in tests.
 * It models the behaviours the add-on depends on: item copies vs slots, non-stackable dynamic
 * properties, the 20-line lore limit, loaded and unloaded blocks, item and XP entities.
 */

export enum GameMode {
  Adventure = 'Adventure',
  Creative = 'Creative',
  Spectator = 'Spectator',
  Survival = 'Survival'
}
export enum EntityComponentTypes {
  Inventory = 'minecraft:inventory',
  Item = 'minecraft:item',
  Exhaustion = 'minecraft:player.exhaustion'
}
export enum ItemComponentTypes {
  Durability = 'minecraft:durability',
  Enchantable = 'minecraft:enchantable'
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}
export interface RawMessage {
  rawtext?: RawMessage[];
  text?: string;
  translate?: string;
  with?: string[] | RawMessage;
}

// ------------------------------------------------------------------ items

const MAX_STACK: Record<string, number> = {
  'minecraft:raw_iron': 64,
  'minecraft:raw_gold': 64,
  'minecraft:raw_copper': 64,
  'minecraft:iron_ingot': 64,
  'minecraft:gold_ingot': 64,
  'minecraft:copper_ingot': 64,
  'minecraft:netherite_scrap': 64,
  'minecraft:ancient_debris': 64,
  'minecraft:diamond': 64,
  'minecraft:coal': 64,
  'minecraft:redstone': 64,
  'minecraft:lapis_lazuli': 64,
  'minecraft:emerald': 64,
  'minecraft:quartz': 64,
  'minecraft:gold_nugget': 64,
  'minecraft:iron_ore': 64,
  'minecraft:deepslate_iron_ore': 64,
  'minecraft:diamond_ore': 64,
  'minecraft:cobblestone': 64
};

export const DURABILITY: Record<string, number> = {
  'minecraft:wooden_pickaxe': 59,
  'minecraft:stone_pickaxe': 131,
  'minecraft:iron_pickaxe': 250,
  'minecraft:golden_pickaxe': 32,
  'minecraft:diamond_pickaxe': 1561,
  'minecraft:netherite_pickaxe': 2031,
  'minecraft:copper_pickaxe': 190
};

export class EnchantmentType {
  constructor(public readonly id: string) {}
}

export class FakeDurability {
  constructor(
    public damage: number,
    public readonly maxDurability: number,
    public unbreakable = false
  ) {}
  getDamageChanceRange() {
    return { min: 100, max: 100 };
  }
}

export class FakeEnchantable {
  constructor(public readonly list: Map<string, number>) {}
  getEnchantments() {
    return [...this.list].map(([id, level]) => ({ type: new EnchantmentType(`minecraft:${id}`), level }));
  }
}

const clonePlain = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export class ItemStack {
  private _amount: number;
  nameTag: string | undefined;
  lore: (string | RawMessage)[] = [];
  props = new Map<string, string | number | boolean>();
  enchants = new Map<string, number>();
  durability: FakeDurability | undefined;
  tags: string[] = [];
  canDestroy: string[] = [];

  constructor(
    public readonly typeId: string,
    amount = 1
  ) {
    if (amount > this.maxAmount) throw new Error(`amount ${amount} above ${this.maxAmount}`);
    this._amount = amount;
    const max = DURABILITY[typeId];
    if (max !== undefined) {
      this.durability = new FakeDurability(0, max);
      this.tags.push('minecraft:is_pickaxe');
    }
  }
  get maxAmount(): number {
    if (DURABILITY[this.typeId] !== undefined || this.typeId.startsWith('vmos:')) return 1;
    return MAX_STACK[this.typeId] ?? 64;
  }
  get isStackable(): boolean {
    return this.maxAmount > 1;
  }
  get amount(): number {
    return this._amount;
  }
  set amount(n: number) {
    if (n < 1 || n > this.maxAmount) throw new Error(`bad amount ${n}`);
    this._amount = n;
  }
  get localizationKey(): string {
    return `item.${this.typeId.replace('minecraft:', '')}.name`;
  }
  hasTag(tag: string): boolean {
    return this.tags.includes(tag);
  }
  getCanDestroy(): string[] {
    return [...this.canDestroy];
  }
  getComponent(id: string): unknown {
    if (id === ItemComponentTypes.Durability) return this.durability;
    if (id === ItemComponentTypes.Enchantable) return new FakeEnchantable(this.enchants);
    return undefined;
  }
  getDynamicProperty(id: string) {
    return this.props.get(id);
  }
  setDynamicProperty(id: string, value?: string | number | boolean): void {
    if (this.isStackable) throw new Error('stackable items cannot have dynamic properties');
    if (value === undefined) this.props.delete(id);
    else this.props.set(id, value);
  }
  getLore(): string[] {
    return this.lore.map((l) => (typeof l === 'string' ? l : state.flattenLore ? '§r§7?' : JSON.stringify(l)));
  }
  getRawLore(): RawMessage[] {
    return this.lore.map((l) =>
      typeof l === 'string' ? { text: l } : state.flattenLore ? { text: '§r§7?' } : clonePlain(l)
    );
  }
  setLore(lines?: (string | RawMessage)[]): void {
    state.setLoreCalls++;
    const list = lines ?? [];
    if (list.length > 20) throw new Error('ArgumentOutOfBoundsError: more than 20 lore lines');
    for (const l of list) if (typeof l === 'string' && l.length > 50) throw new Error('lore line too long');
    this.lore = clonePlain(list);
  }
  isStackableWith(other: ItemStack): boolean {
    return (
      this.typeId === other.typeId &&
      this.isStackable &&
      JSON.stringify(this.lore) === JSON.stringify(other.lore) &&
      this.nameTag === other.nameTag
    );
  }
  clone(): ItemStack {
    const c = new ItemStack(this.typeId, this._amount);
    c.nameTag = this.nameTag;
    c.lore = clonePlain(this.lore);
    c.props = new Map(this.props);
    c.enchants = new Map(this.enchants);
    c.durability = this.durability
      ? new FakeDurability(this.durability.damage, this.durability.maxDurability, this.durability.unbreakable)
      : undefined;
    c.tags = [...this.tags];
    c.canDestroy = [...this.canDestroy];
    return c;
  }
}

export class Container {
  readonly slots: (ItemStack | undefined)[];
  constructor(public readonly size = 36) {
    this.slots = new Array(size).fill(undefined);
  }
  getItem(i: number): ItemStack | undefined {
    return this.slots[i]?.clone();
  }
  setItem(i: number, item?: ItemStack): void {
    this.slots[i] = item?.clone();
  }
  getSlot(i: number): ContainerSlot {
    if (i < 0 || i >= this.size) throw new Error('slot out of range');
    return new ContainerSlot(this, i);
  }
}

/** A live view of one slot: reads and writes go to the stored item itself. */
export class ContainerSlot {
  constructor(
    private readonly c: Container,
    private readonly i: number
  ) {}
  private get item(): ItemStack {
    const it = this.c.slots[this.i];
    if (!it) throw new Error('empty slot');
    return it;
  }
  get isValid() {
    return true;
  }
  get typeId() {
    return this.item.typeId;
  }
  getItem() {
    return this.c.getItem(this.i);
  }
  setItem(item?: ItemStack) {
    this.c.setItem(this.i, item);
  }
  hasItem() {
    return this.c.slots[this.i] !== undefined;
  }
  getDynamicProperty(id: string) {
    return this.item.getDynamicProperty(id);
  }
  setDynamicProperty(id: string, v?: string | number | boolean) {
    this.item.setDynamicProperty(id, v);
  }
  getLore() {
    return this.item.getLore();
  }
  getRawLore() {
    return this.item.getRawLore();
  }
  setLore(l?: (string | RawMessage)[]) {
    this.item.setLore(l);
  }
  hasTag(t: string) {
    return this.item.hasTag(t);
  }
}

// ------------------------------------------------------------------ world, blocks, entities

export class BlockPermutation {
  constructor(
    public readonly id: string,
    public readonly states: Record<string, string | number | boolean> = {}
  ) {}
  get type() {
    return { id: this.id };
  }
  getState(name: string) {
    return this.states[name];
  }
  static resolve(id: string, states?: Record<string, string | number | boolean>) {
    return new BlockPermutation(id, states ?? {});
  }
}

const key = (p: Vector3) => `${p.x},${p.y},${p.z}`;

export class Block {
  constructor(
    public readonly dimension: Dimension,
    public readonly x: number,
    public readonly y: number,
    public readonly z: number
  ) {}
  get location() {
    return { x: this.x, y: this.y, z: this.z };
  }
  get typeId() {
    return this.dimension.typeAt(this);
  }
  get permutation() {
    return this.dimension.permutationAt(this);
  }
  setType(id: string) {
    this.dimension.setPermutation(this, new BlockPermutation(id));
  }
  setPermutation(p: BlockPermutation) {
    this.dimension.setPermutation(this, p);
  }
}

let nextEntity = 1;

export class Entity {
  readonly id = String(nextEntity++);
  isValid = true;
  velocity: Vector3 = { x: 0, y: 0.2, z: 0 };
  constructor(
    public readonly typeId: string,
    public readonly dimension: Dimension,
    public location: Vector3,
    public readonly itemStack?: ItemStack,
    public readonly xp = 0
  ) {}
  getComponent(id: string) {
    if (id === EntityComponentTypes.Item && this.itemStack) return { itemStack: this.itemStack.clone() };
    return undefined;
  }
  getVelocity() {
    return { ...this.velocity };
  }
  clearVelocity() {
    this.velocity = { x: 0, y: 0, z: 0 };
  }
  applyImpulse(v: Vector3) {
    this.velocity = { x: this.velocity.x + v.x, y: this.velocity.y + v.y, z: this.velocity.z + v.z };
  }
  remove() {
    if (!this.isValid) throw new Error('entity already removed');
    this.isValid = false;
    this.dimension.entities.delete(this.id);
  }
}

export class Dimension {
  readonly heightRange = { min: -64, max: 320 };
  readonly blocks = new Map<string, BlockPermutation>();
  readonly unloaded = new Set<string>();
  readonly entities = new Map<string, Entity>();
  readonly sounds: { id: string; at: Vector3 }[] = [];
  players: Player[] = [];
  constructor(public readonly id = 'minecraft:overworld') {}

  set(p: Vector3, id: string, states?: Record<string, string>) {
    this.blocks.set(key(p), new BlockPermutation(id, states));
  }
  typeAt(p: Vector3): string {
    return this.blocks.get(key(p))?.id ?? 'minecraft:stone';
  }
  permutationAt(p: Vector3): BlockPermutation {
    return this.blocks.get(key(p)) ?? new BlockPermutation('minecraft:stone');
  }
  setPermutation(p: Vector3, perm: BlockPermutation) {
    if (this.unloaded.has(key(p))) throw new Error('LocationInUnloadedChunkError');
    this.blocks.set(key(p), perm);
  }
  getBlock(p: Vector3): Block | undefined {
    if (p.y < this.heightRange.min || p.y >= this.heightRange.max) throw new Error('LocationOutOfWorldBoundariesError');
    if (this.unloaded.has(key(p))) return undefined;
    return new Block(this, Math.floor(p.x), Math.floor(p.y), Math.floor(p.z));
  }
  isChunkLoaded(p: Vector3) {
    return !this.unloaded.has(key(p));
  }
  getPlayers(_o?: unknown): Player[] {
    return this.players;
  }
  spawnItem(item: ItemStack, at: Vector3): Entity {
    const e = new Entity('minecraft:item', this, { ...at }, item.clone());
    this.entities.set(e.id, e);
    return e;
  }
  spawnXp(at: Vector3, amount: number) {
    if (amount < 1 || amount > 12000 || !Number.isInteger(amount)) throw new Error(`bad xp ${amount}`);
    const e = new Entity('minecraft:xp_orb', this, { ...at }, undefined, amount);
    this.entities.set(e.id, e);
  }
  playSound(id: string, at: Vector3) {
    this.sounds.push({ id, at });
  }
  items(): Entity[] {
    return [...this.entities.values()].filter((e) => e.typeId === 'minecraft:item');
  }
  orbs(): number[] {
    return [...this.entities.values()].filter((e) => e.typeId === 'minecraft:xp_orb').map((e) => e.xp);
  }
}

export class Player {
  readonly id: string;
  isValid = true;
  isSneaking = false;
  selectedSlotIndex = 0;
  level = 30;
  mode: GameMode = GameMode.Survival;
  location: Vector3 = { x: 0.5, y: 100, z: 0.5 };
  readonly inventory = new Container(36);
  readonly actionBar: unknown[] = [];
  readonly messages: unknown[] = [];
  readonly heard: string[] = [];
  exhaustion = { currentValue: 0, effectiveMax: 20, setCurrentValue: (v: number) => (this.exhaustion.currentValue = v) };
  readonly onScreenDisplay = { setActionBar: (m: unknown) => this.actionBar.push(m) };
  constructor(
    public dimension: Dimension,
    id = 'p1'
  ) {
    this.id = id;
  }
  getGameMode() {
    return this.mode;
  }
  getComponent(id: string) {
    if (id === EntityComponentTypes.Inventory) return { container: this.inventory };
    if (id === EntityComponentTypes.Exhaustion) return this.exhaustion;
    return undefined;
  }
  addLevels(n: number) {
    this.level = Math.max(0, this.level + n);
    return this.level;
  }
  sendMessage(m: unknown) {
    this.messages.push(m);
  }
  playSound(id: string) {
    this.heard.push(id);
  }
}

/** Test hook for loot: given a block id and the tool, return the drops (or undefined for "cannot harvest"). */
export type LootRule = (blockId: string, tool: ItemStack | undefined) => ItemStack[] | undefined;

export const state = {
  tick: 100,
  packSettings: {} as Record<string, string | number | boolean | string[]>,
  doTileDrops: true,
  lootRule: (() => []) as LootRule,
  lootCalls: 0,
  queued: [] as (() => void)[],
  /** Simulates a game that hands translated lore lines back as plain resolved text. */
  flattenLore: false,
  setLoreCalls: 0
};

export const world = {
  getPackSettings: () => state.packSettings,
  get gameRules() {
    return { doTileDrops: state.doTileDrops };
  },
  getLootTableManager: () => ({
    generateLootFromBlock: (block: Block, tool?: ItemStack) => {
      state.lootCalls++;
      return state.lootRule(block.typeId, tool);
    },
    generateLootFromBlockPermutation: (perm: BlockPermutation, tool?: ItemStack) => state.lootRule(perm.id, tool)
  }),
  beforeEvents: {},
  afterEvents: {}
};

export const system = {
  get currentTick() {
    return state.tick;
  },
  run(cb: () => void) {
    state.queued.push(cb);
    return state.queued.length;
  },
  waitTicks: async (_n: number) => {},
  runTimeout(cb: () => void) {
    state.queued.push(cb);
    return state.queued.length;
  }
};

/** Runs queued system.run callbacks, like the end of a game tick. */
export function flush(): void {
  while (state.queued.length) state.queued.shift()!();
}

export function reset(): void {
  state.tick = 100;
  state.packSettings = {};
  state.doTileDrops = true;
  state.lootRule = () => [];
  state.lootCalls = 0;
  state.queued = [];
  state.flattenLore = false;
  state.setLoreCalls = 0;
}
