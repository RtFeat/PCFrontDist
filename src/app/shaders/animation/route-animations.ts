// Ошибка "Cannot find module '@angular/animations' or its corresponding type declarations."
// Обычно возникает, если не установлены необходимые пакеты или отсутствуют типы.
// Проверьте, что установлен пакет @angular/animations и @types/angular, если требуется.
// Исправленный импорт (оставляем как есть, так как синтаксис верный):

import { trigger, transition, style, animate, query, group, animateChild } from '@angular/animations';

export interface RouteAnimationData {
  animation: string;
}

export const slideInAnimation = trigger('routeAnimations', [
  transition('* <=> *', [
    style({ position: 'relative' }),
    query(':enter, :leave', [
      style({
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%'
      })
    ], { optional: true }),
    query(':enter', [
      style({ left: '100%' })
    ], { optional: true }),
    query(':leave', animateChild(), { optional: true }),
    group([
      query(':leave', [
        animate('600ms ease-out', style({ left: '-100%', opacity: 0 }))
      ], { optional: true }),
      query(':enter', [
        animate('600ms ease-out', style({ left: '0%' }))
      ], { optional: true })
    ]),
    query(':enter', animateChild(), { optional: true }),
  ])
]);

export const signalLossAnimation = trigger('signalLoss', [
  transition(':enter', [
    style({ 
      opacity: 0, 
      transform: 'scale(0.8)',
      filter: 'blur(5px)'
    }),
    animate('300ms ease-in', style({ 
      opacity: 1, 
      transform: 'scale(1)',
      filter: 'blur(0px)'
    }))
  ]),
  transition(':leave', [
    animate('300ms ease-out', style({ 
      opacity: 0, 
      transform: 'scale(0.8)',
      filter: 'blur(5px)'
    }))
  ])
]);