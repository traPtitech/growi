import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';

import { RehypeSanitizeType } from '~/interfaces/services/rehype-sanitize';
import type { RendererConfig } from '~/interfaces/services/renderer';
import { generateSSRViewOptions } from '~/services/renderer/renderer';

const config: RendererConfig = {
  isEnabledLinebreaks: true,
  isEnabledLinebreaksInComments: true,
  adminPreferredIndentSize: 4,
  isIndentSizeForced: false,
  highlightJsStyleBorder: false,
  isEnabledMarp: false,
  drawioUri: '',
  plantumlUri: '',
  isEnabledXssPrevention: true,
  sanitizeType: RehypeSanitizeType.RECOMMENDED,
};

describe('traQ stamps in GROWI renderer options', () => {
  it('renders stamps through the real SSR configuration without replacing standard fallback', () => {
    const options = generateSSRViewOptions(
      {
        ...config,
        traqStamps: { origin: 'https://q.example.com', names: ['smile'] },
      },
      '/test',
    );
    const html = renderToStaticMarkup(
      <ReactMarkdown {...options}>
        {':smile: :smile; :@alice: :+1:'}
      </ReactMarkdown>,
    );
    expect(html).toContain('class="emoji s32 e_smile"');
    expect(html).toContain('class="emoji s24 e_smile"');
    expect(html).toContain('https://q.example.com/api/v3/public/icon/alice');
    expect(html).toContain('👍');
    expect(html).not.toContain('😄');
  });

  it('keeps normal GROWI emoji rendering when the integration is disabled', () => {
    const html = renderToStaticMarkup(
      <ReactMarkdown {...generateSSRViewOptions(config, '/test')}>
        {':smile:'}
      </ReactMarkdown>,
    );
    expect(html).toBe('<p>😄</p>');
  });
});
