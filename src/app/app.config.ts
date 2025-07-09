import { ApplicationConfig, InjectionToken, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { PreloadAllModules, provideRouter, withPreloading } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { CustomPreloadingStrategy } from './custom-preloading.strategy';

import { routes } from './app.routes';

export interface AppConfig {
  apiUrl: string;
  staticUrl: string;
  mediaUrl: string;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('AppConfig');

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withPreloading(CustomPreloadingStrategy)),
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(),
    {
      provide: APP_CONFIG,
      useValue: {
        apiUrl: 'http://127.0.0.1:8000/api/', // URL для API
        staticUrl: 'http://127.0.0.1:8000/', // URL для API
        mediaUrl: 'http://127.0.0.1:8000/media/' // URL для медиафайлов
      } as AppConfig
    }
  ]
};
