import type { TraqStampConfig } from '~/features/traq-stamp/types';

import type { RehypeSanitizeConfiguration } from './rehype-sanitize';

export type RendererConfig = {
  traqStamps?: TraqStampConfig;
  isSharedPage?: boolean;
  isEnabledLinebreaks: boolean;
  isEnabledLinebreaksInComments: boolean;
  adminPreferredIndentSize: number;
  isIndentSizeForced: boolean;
  highlightJsStyleBorder: boolean;
  isEnabledMarp: boolean;

  drawioUri: string;
  plantumlUri: string;
} & RehypeSanitizeConfiguration;

export type RendererConfigExt = RendererConfig & {
  isDarkMode?: boolean;
};
