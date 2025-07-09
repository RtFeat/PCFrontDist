import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TransitionService {
  private nextRoute: string | null = null;
  public smokeVisible$ = new BehaviorSubject<boolean>(false);
  public smokeShow$ = new BehaviorSubject<boolean>(false);
  private isTransitioning = false;
  private finalTarget: string | null = null;

  constructor(private router: Router) {}

  async goWithSmoke(target: string, finalTarget?: string, loadingRoute: string = '/loading') {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.nextRoute = target;
    this.finalTarget = finalTarget || null;

    // 1. Показать overlay
    this.smokeVisible$.next(true);
    await this.delay(50);

    // 2. Запустить анимацию появления
    this.smokeShow$.next(true);
    await this.delay(1200);

    // 3. Перейти на loading
    await this.router.navigate([loadingRoute]);

    // 4. Скрыть анимацию (можно добавить задержку для плавности)
    this.smokeShow$.next(false);
    await this.delay(1000);

    // 5. Скрыть overlay
    this.smokeVisible$.next(false);

    this.isTransitioning = false;
  }

  // Новый метод для анимации после загрузки данных
  async completeTransitionWithSmoke(targetRoute: string): Promise<void> {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    // 1. Показать overlay
    this.smokeVisible$.next(true);
    await this.delay(50);

    // 2. Запустить анимацию появления
    this.smokeShow$.next(true);
    await this.delay(1200);

    // 3. Перейти на целевую страницу
    await this.router.navigate([targetRoute]);

    // 4. Скрыть анимацию
    this.smokeShow$.next(false);
    await this.delay(1000);

    // 5. Скрыть overlay
    this.smokeVisible$.next(false);

    this.isTransitioning = false;
  }

  // Метод для плавного перехода без смока (для случаев когда данные уже загружены)
  async quickTransition(targetRoute: string): Promise<void> {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    await this.router.navigate([targetRoute]);
    this.isTransitioning = false;
  }

  getNextRoute(): string | null {
    return this.nextRoute;
  }

  clearNextRoute() {
    this.nextRoute = null;
  }

  getFinalTarget(): string | null {
    return this.finalTarget;
  }

  clearFinalTarget() {
    this.finalTarget = null;
  }

  isCurrentlyTransitioning(): boolean {
    return this.isTransitioning;
  }

  // Метод для проверки нужно ли показывать смок
  getSmokeState(): Observable<{visible: boolean, show: boolean}> {
    return new Observable(subscriber => {
      let visible = false;
      let show = false;

      const visibleSub = this.smokeVisible$.subscribe(v => {
        visible = v;
        subscriber.next({visible, show});
      });

      const showSub = this.smokeShow$.subscribe(s => {
        show = s;
        subscriber.next({visible, show});
      });

      return () => {
        visibleSub.unsubscribe();
        showSub.unsubscribe();
      };
    });
  }

  private delay(ms: number) {
    return new Promise(res => setTimeout(res, ms));
  }
}