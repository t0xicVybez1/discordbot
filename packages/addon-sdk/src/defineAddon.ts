import type { AddonDefinition } from './types.js';

/**
 * Define an addon using a functional API.
 *
 * @example
 * ```ts
 * export default defineAddon({
 *   manifest: {
 *     name: 'my-addon',
 *     displayName: 'My Addon',
 *     version: '1.0.0',
 *     description: 'Does something cool',
 *     author: 'Your Name',
 *   },
 *   commands: [...],
 *   events: [...],
 *   hooks: {
 *     onLoad: async (ctx) => {
 *       ctx.logger.info('My addon loaded!');
 *     },
 *   },
 * });
 * ```
 */
export function defineAddon(definition: AddonDefinition): AddonDefinition {
  return definition;
}
