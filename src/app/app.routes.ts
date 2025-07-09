import { Routes } from '@angular/router';

export const routes: Routes = [
    {path: '', loadComponent: () => import('./content/advertisers/advertisers').then(m => m.Advertisers)},
    {path: 'background', loadComponent: () => import('./background-canvas/background-canvas').then(m => m.BackgroundCanvas)},
    {path: 'mars', loadComponent: () => import('./content/help-page/help-page').then(m => m.HelpPage)},
    {path: 'earth', loadComponent: () => import('./content/commercial/commercial').then(m => m.Commercial)},
    {path: 'moon', loadComponent: () => import('./content/history/history').then(m => m.History)},
    {path: 'cosmos', loadComponent: () => import('./home-page/home-page').then(m => m.HomePage)},
    {path: 'flight', loadComponent: () => import('./test-page/test-page').then(m => m.TestPage)},
    {path: 'loading', loadComponent: () => import('./loading-page/loading-page').then(m => m.LoadingPage)},
    {path: '**', redirectTo: ''}
];
