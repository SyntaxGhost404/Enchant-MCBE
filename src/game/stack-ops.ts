import { ItemStack } from '@minecraft/server';
import type { StackOps } from '../rules/stacks';

/** rules/stacks.ts working on real item stacks. */
export const itemStackOps: StackOps<ItemStack> = {
  typeId: (s) => s.typeId,
  amount: (s) => s.amount,
  setAmount: (s, n) => {
    s.amount = n;
  },
  maxAmount: (s) => s.maxAmount,
  stackable: (a, b) => {
    try {
      return a.isStackableWith(b);
    } catch {
      return false;
    }
  },
  clone: (s) => s.clone(),
  make: (typeId) => new ItemStack(typeId, 1)
};
