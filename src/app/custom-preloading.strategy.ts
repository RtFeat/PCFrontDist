import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CustomPreloadingStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<any>): Observable<any> {
    // Предварительно загружать только легкие компоненты
    if (route.path === 'cosmos' || route.path === 'flight') {
      return of(null); // Пропустить тяжелые компоненты
    }
    return load();
  }
}