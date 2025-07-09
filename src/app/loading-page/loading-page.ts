import { Component, OnInit, OnDestroy, HostListener, inject, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TransitionService } from '../shaders/service/transition.service';
import { Router } from '@angular/router';
import { DataLoadingService, LoadingTask } from '../shaders/service/data-loading.service';
import { Subject, takeUntil } from 'rxjs';

interface AnimationState {
  isPortrait: boolean;
  isLowHeight: boolean;
}

@Component({
  selector: 'app-loading-page',
  imports: [CommonModule],
  templateUrl: './loading-page.html',
  styleUrl: './loading-page.scss'
})
export class LoadingPage implements OnInit, OnDestroy {
  private loadingAudio: HTMLAudioElement | null = null;
  private destroy$ = new Subject<void>();
  private elementRef = inject(ElementRef);
  
  // Состояние загрузки
  loadingProgress = 0;
  loadingTasks: LoadingTask[] = [];
  isLoading = true;
  loadingError = false;
  
  animationState: AnimationState = {
    isPortrait: false,
    isLowHeight: false
  };

  // Сообщения для пользователя
  loadingMessages = [
    'Подготовка космического корабля...',
    'Загрузка звездных карт...',
    'Настройка двигателей...',
    'Проверка систем навигации...',
    'Инициализация бортового компьютера...',
    'Готовность к полету...'
  ];
  
  currentMessage = '';
  private messageIndex = 0;

  constructor(
    private router: Router,
    private transitionService: TransitionService,
    private dataLoadingService: DataLoadingService
  ) {}

  ngOnInit(): void {
    this.updateAnimationState();
    this.startLoadingProcess();
  }

  private startLoadingProcess(): void {
    // Получаем целевой маршрут
    const targetRoute = this.transitionService.getNextRoute();
    
    if (!targetRoute) {
      console.error('No target route specified');
      this.handleLoadingError();
      return;
    }

    // Начинаем воспроизведение аудио
    this.startLoadingAudio();
    
    // Запускаем анимацию сообщений
    this.startMessageAnimation();
    
    // Подписываемся на прогресс загрузки
    this.dataLoadingService.getLoadingProgress()
      .pipe(takeUntil(this.destroy$))
      .subscribe((progress: any) => {
        this.loadingProgress = Math.round(progress);
      });

    // Подписываемся на задачи загрузки
    this.dataLoadingService.getLoadingTasks()
      .pipe(takeUntil(this.destroy$))
      .subscribe((tasks: LoadingTask[] | any) => {
        this.loadingTasks = tasks;
      });

    // Начинаем загрузку данных
    this.dataLoadingService.loadDataForRoute(targetRoute)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            this.completeLoading(targetRoute);
          } else {
            this.handleLoadingError();
          }
        },
        error: (error) => {
          console.error('Loading error:', error);
          this.handleLoadingError();
        }
      });
  }

  private startLoadingAudio(): void {
    this.loadingAudio = new Audio('/images/advertisers/audio/loading.mp3');
    this.loadingAudio.loop = false;
    this.loadingAudio.volume = 0.7;
    
    // Запускаем аудио с задержкой
    setTimeout(() => {
      this.loadingAudio?.play().catch(() => {
        // Игнорируем ошибки автовоспроизведения
      });
    }, 1500);
  }

  private startMessageAnimation(): void {
    this.updateLoadingMessage();
    
    // Обновляем сообщение каждые 2 секунды
    const messageInterval = setInterval(() => {
      if (this.isLoading) {
        this.updateLoadingMessage();
      } else {
        clearInterval(messageInterval);
      }
    }, 2000);
  }

  private updateLoadingMessage(): void {
    this.currentMessage = this.loadingMessages[this.messageIndex];
    this.messageIndex = (this.messageIndex + 1) % this.loadingMessages.length;
  }

  private async completeLoading(targetRoute: string): Promise<void> {
    this.isLoading = false;
    this.currentMessage = 'Загрузка завершена! Готов к полету!';
    
    // Небольшая задержка для показа завершения
    await this.delay(2500);
    
    // Очищаем сохраненный маршрут
    this.transitionService.clearNextRoute();
    
    // Запускаем анимацию смока и переход
    await this.transitionService.completeTransitionWithSmoke(targetRoute);
  }

  private async handleLoadingError(): Promise<void> {
    this.isLoading = false;
    this.loadingError = true;
    this.currentMessage = 'Ошибка загрузки данных. Повторите попытку.';
    
    // Автоматический переход на главную через 3 секунды
    setTimeout(() => {
      this.router.navigate(['/']);
    }, 3000);
  }

  // Метод для принудительного перехода при клике (для отладки)
  async forceTransition(): Promise<void> {
    if (this.loadingError) {
      await this.router.navigate(['/']);
      return;
    }
    
    const targetRoute = this.transitionService.getNextRoute();
    if (targetRoute) {
      this.transitionService.clearNextRoute();
      await this.transitionService.completeTransitionWithSmoke(targetRoute);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Очистка аудио
    if (this.loadingAudio) {
      this.loadingAudio.pause();
      this.loadingAudio.currentTime = 0;
      this.loadingAudio = null;
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.updateAnimationState();
  }

  @HostListener('window:orientationchange', ['$event'])
  onOrientationChange(event: Event): void {
    setTimeout(() => {
      this.updateAnimationState();
    }, 100);
  }

  private updateAnimationState(): void {
    const isPortrait = window.innerHeight > window.innerWidth;
    const isLowHeight = window.innerHeight <= 300;
    
    this.animationState = {
      isPortrait,
      isLowHeight
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}