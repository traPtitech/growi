// Re-run `turbo run build --filter @growi/emoji-mart-data` whenever @emoji-mart/data is upgraded.
import emojiNativeLookup from '@growi/emoji-mart-data';
import type { Root } from 'mdast';
import { findAndReplace } from 'mdast-util-find-and-replace';
import type { Plugin } from 'unified';

export const remarkPlugin: Plugin<[string[]?]> = (reservedNames = []) => {
  const reserved = new Set(reservedNames);
  return (tree: Root) => {
    findAndReplace(tree, [
      // Ref: https://github.com/remarkjs/remark-gemoji/blob/fb4d8a5021f02384e180c17f72f40d8dc698bd46/lib/index.js
      /:(\+1|[-\w]+):/g,

      (_, $1: string) => {
        if (reserved.has($1)) return false;
        const emoji = emojiNativeLookup[$1]?.skins[0].native;
        return emoji ?? false;
      },
    ]);
  };
};
