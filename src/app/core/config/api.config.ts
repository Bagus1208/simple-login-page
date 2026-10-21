import { InjectionToken } from '@angular/core';

export interface ApiConfig {
  readonly authUrl: string;
  readonly timeoutMs: number;
  readonly defaults: {
    readonly fromOrigin: string;
    readonly envServer: string;
    readonly referrer: string;
  };
}

export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG');

export const DEFAULT_API_CONFIG: ApiConfig = {
  authUrl: 'http://cool.uruz.id/api/authV5',
  timeoutMs: 5000,
  defaults: {
    fromOrigin: '*',
    envServer: 'dev',
    referrer: 'bodev.uruz.id',
  },
};
