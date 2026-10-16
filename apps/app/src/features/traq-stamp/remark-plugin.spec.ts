import type { Element, Root as HastRoot } from 'hast';
import type { Root } from 'mdast';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

import {
  attributes,
  tagNames,
} from '~/services/renderer/recommended-whitelist';
import { remarkPlugin as emoji } from '~/services/renderer/remark-plugins/emoji';

import { remarkPlugin } from './remark-plugin';

const config = {
  origin: 'https://q.example.com',
  names: ['smile', 'blob_pyon', '-'],
};
const render = (source: string): HastRoot => {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkDirective)
    .use(remarkPlugin, config)
    .use(emoji, config.names)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize, { attributes, tagNames });
  return processor.runSync(processor.parse(source), source);
};
const elements = (tree: HastRoot, tag: string): Element[] => {
  const found: Element[] = [];
  visit(tree, 'element', (node) => {
    if (node.tagName === tag) found.push(node);
  });
  return found;
};
const content = (tree: HastRoot | Element): string =>
  tree.children
    .map((node) => {
      if (node.type === 'text') return node.value;
      if (node.type === 'element') return content(node);
      return '';
    })
    .join('');

describe('traQ stamp rendering', () => {
  it('renders both sizes of normal and user stamps through sanitization', () => {
    const stamps = elements(render(':smile: :smile; :@alice: :@bob;'), 'i');
    expect(stamps.map((node) => node.properties.className)).toEqual([
      ['emoji', 's32', 'e_smile'],
      ['emoji', 's24', 'e_smile'],
      ['emoji', 's32'],
      ['emoji', 's24'],
    ]);
    expect(stamps.map((node) => node.properties.title)).toEqual([
      ':smile:',
      ':smile;',
      ':@alice:',
      ':@bob;',
    ]);
    expect(stamps[2].properties.style).toBe(
      'background-image: url(https://q.example.com/api/v3/public/icon/alice)',
    );
  });

  it('prefers traQ images and keeps standard emoji fallback and unknown names', () => {
    const tree = render(':smile: :+1: :no_such_stamp: :smile.large:');
    expect(elements(tree, 'i')).toHaveLength(1);
    expect(content(tree)).toBe(':smile: 👍 :no_such_stamp: :smile.large:');
  });

  it('preserves escaped delimiters and character references as literal text', () => {
    const tree = render(
      '\\:smile: :smile\\: &colon;smile&colon; \\:blob_pyon;',
    );
    expect(elements(tree, 'i')).toHaveLength(0);
    expect(content(tree)).toBe(':smile: :smile: :smile: :blob_pyon;');
  });

  it('keeps GFM alignment and renders stamps within tables, headings and links', () => {
    const tree = render(
      '# :smile:\n\n| a | b |\n| :-: | --- |\n| [:blob_pyon;](/page) | **:smile:** |',
    );
    expect(elements(tree, 'table')).toHaveLength(1);
    expect(elements(tree, 'th')[0].properties.align).toBe('center');
    expect(elements(tree, 'h1')).toHaveLength(1);
    expect(elements(tree, 'a')[0].properties.href).toBe('/page');
    expect(elements(tree, 'strong')).toHaveLength(1);
    expect(elements(tree, 'i')).toHaveLength(3);
  });

  it('does not render stamps in code, math, image alt text or HTML attributes', () => {
    const tree = render(
      '`:smile:`\n\n```\n:smile:\n```\n\n$:smile:$\n\n![alt :smile:](https://example.com/:smile:)\n\n<span title=":smile:">text</span>',
    );
    expect(elements(tree, 'i')).toHaveLength(0);
    expect(elements(tree, 'img')[0].properties.alt).toBe('alt :smile:');
    expect(elements(tree, 'img')[0].properties.src).toBe(
      'https://example.com/:smile:',
    );
    expect(elements(tree, 'span')[0].properties.title).toBe(':smile:');
  });

  it('preserves quote/list prefixes, escapes and entities across lines', () => {
    const tree = render(
      '> first &amp; :smile:\n> next :blob_pyon;\n\n- first :smile:\n  next :blob_pyon;',
    );
    expect(elements(tree, 'i')).toHaveLength(4);
    expect(content(elements(tree, 'blockquote')[0])).toContain(
      'first & :smile:\nnext :blob_pyon;',
    );
    expect(content(elements(tree, 'li')[0])).toBe(
      'first :smile:\nnext :blob_pyon;',
    );
  });

  it('keeps real directives and adjacent stamps intact', () => {
    const processor = unified()
      .use(remarkParse)
      .use(remarkDirective)
      .use(remarkPlugin, config);
    const source = ':badge[label]{.class} :smile::blob_pyon;';
    const tree: Root = processor.runSync(processor.parse(source), source);
    expect(tree.children[0]).toMatchObject({
      children: [
        {
          type: 'textDirective',
          name: 'badge',
          children: [{ value: 'label' }],
        },
        { type: 'text', value: ' ' },
        { type: 'traqStamp', value: ':smile:' },
        { type: 'traqStamp', value: ':blob_pyon;' },
      ],
    });
  });

  it('renders multiline CRLF content without dropping stamps or quote prefixes', () => {
    const tree = render(
      ':smile: \r\n:blob_pyon;\r\n\r\n> :smile:\r\n> :@alice;',
    );
    expect(elements(tree, 'i')).toHaveLength(4);
    expect(content(elements(tree, 'blockquote')[0])).not.toContain('>');
  });

  it('renders stamps adjacent to words without swallowing unrelated directives or escaped endings', () => {
    const tree = render(':smile:Ruby :blob_pyon;Text :smile&colon; :smile\\:');
    expect(elements(tree, 'i')).toHaveLength(2);
    expect(content(tree)).toBe(':smile:Ruby :blob_pyon;Text :smile: :smile:');
    const source = ':badge :smile:Ruby';
    const processor = unified()
      .use(remarkParse)
      .use(remarkDirective)
      .use(remarkPlugin, config);
    const ast = processor.runSync(processor.parse(source), source);
    expect(ast.children[0]).toMatchObject({
      children: [
        { type: 'textDirective', name: 'badge' },
        { type: 'text', value: ' ' },
        { type: 'traqStamp', value: ':smile:' },
        { type: 'text', value: 'Ruby' },
      ],
    });
  });
});
