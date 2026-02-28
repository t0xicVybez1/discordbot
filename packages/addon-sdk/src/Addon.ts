import type { AddonDefinition } from './types.js';

/**
 * Base class for addons. Extend this class to create a type-safe addon.
 * Alternatively, use the defineAddon() function for a functional approach.
 */
export abstract class Addon {
  abstract readonly definition: AddonDefinition;
}
