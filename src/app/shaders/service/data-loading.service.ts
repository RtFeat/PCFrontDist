import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, of, timer } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

export interface LoadingTask {
  id: string;
  name: string;
  progress: number;
  completed: boolean;
}

export interface PageLoadingConfig {
  route: string;
  tasks: {
    images?: string[];
    audio?: string[];
    models?: string[];
    data?: string[];
  };
}

@Injectable({ providedIn: 'root' })
export class DataLoadingService {
  private loadingProgress$ = new BehaviorSubject<number>(0);
  private loadingTasks$ = new BehaviorSubject<LoadingTask[]>([]);
  private loadedCache = new Map<string, any>();

  // Конфигурация загрузки для каждой страницы
  private pageConfigs: PageLoadingConfig[] = [
    {
      route: '/cosmos',
      tasks: {
        images: ['/images/cosmos/background.jpg', '/images/cosmos/stars.png'],
        audio: ['/images/advertisers/audio/cosmos.mp3'],
        data: ['cosmos-data']
      }
    },
    {
      route: '/flight',
      tasks: {
        models: ['3d/rocket/Rocket.obj', '3d/rocket/Rocket.mtl'],
        audio: ['/images/advertisers/audio/rocket.mp3', '/images/advertisers/audio/rocket_push.mp3'],
        data: ['flight-data']
      }
    },
    {
      route: '/mars',
      tasks: {
        images: ['/images/mars/surface.jpg', '/images/mars/atmosphere.png'],
        data: ['mars-help-data']
      }
    },
    {
      route: '/earth',
      tasks: {
        images: ['/images/earth/commercial.jpg'],
        data: ['commercial-data']
      }
    },
    {
      route: '/moon',
      tasks: {
        images: ['/images/moon/surface.jpg', '/images/moon/earth-view.jpg'],
        data: ['history-data']
      }
    },
    {
      route: '/',
      tasks: {
        images: ['/images/advertisers/logo.png'],
        data: ['advertisers-data']
      }
    }
  ];

  getLoadingProgress(): Observable<number> {
    return this.loadingProgress$.asObservable();
  }

  getLoadingTasks(): Observable<LoadingTask[]> {
    return this.loadingTasks$.asObservable();
  }

  loadDataForRoute(route: string): Observable<boolean> {
    // Проверяем кеш
    if (this.loadedCache.has(route)) {
      return of(true);
    }

    const config = this.pageConfigs.find(c => c.route === route);
    if (!config) {
      return of(true); // Если нет конфигурации, считаем что данные не нужны
    }

    const tasks: LoadingTask[] = [];
    let taskId = 0;

    // Создаем задачи для изображений
    config.tasks.images?.forEach(img => {
      tasks.push({
        id: `img-${taskId++}`,
        name: `Загрузка изображения: ${img.split('/').pop()}`,
        progress: 0,
        completed: false
      });
    });

    // Создаем задачи для аудио
    config.tasks.audio?.forEach(audio => {
      tasks.push({
        id: `audio-${taskId++}`,
        name: `Загрузка аудио: ${audio.split('/').pop()}`,
        progress: 0,
        completed: false
      });
    });

    // Создаем задачи для 3D моделей
    config.tasks.models?.forEach(model => {
      tasks.push({
        id: `model-${taskId++}`,
        name: `Загрузка модели: ${model.split('/').pop()}`,
        progress: 0,
        completed: false
      });
    });

    // Создаем задачи для данных
    config.tasks.data?.forEach(data => {
      tasks.push({
        id: `data-${taskId++}`,
        name: `Загрузка данных: ${data}`,
        progress: 0,
        completed: false
      });
    });

    this.loadingTasks$.next(tasks);
    this.loadingProgress$.next(0);

    // Создаем Observable для каждой задачи
    const loadingObservables: Observable<any>[] = [];

    // Загрузка изображений
    config.tasks.images?.forEach((img, index) => {
      loadingObservables.push(
        this.loadImage(img, `img-${index}`)
      );
    });

    // Загрузка аудио
    config.tasks.audio?.forEach((audio, index) => {
      loadingObservables.push(
        this.loadAudio(audio, `audio-${index}`)
      );
    });

    // Загрузка 3D моделей
    config.tasks.models?.forEach((model, index) => {
      loadingObservables.push(
        this.loadModel(model, `model-${index}`)
      );
    });

    // Загрузка данных
    config.tasks.data?.forEach((data, index) => {
      loadingObservables.push(
        this.loadData(data, `data-${index}`)
      );
    });

    if (loadingObservables.length === 0) {
      return of(true);
    }

    // Запускаем все загрузки параллельно
    return forkJoin(loadingObservables).pipe(
      map(() => {
        this.loadedCache.set(route, true);
        return true;
      })
    );
  }

  private loadImage(src: string, taskId: string): Observable<any> {
    return new Observable(observer => {
      const img = new Image();
      
      img.onload = () => {
        this.updateTaskProgress(taskId, 100, true);
        observer.next(img);
        observer.complete();
      };
      
      img.onerror = () => {
        this.updateTaskProgress(taskId, 100, true);
        observer.next(null); // Продолжаем даже если изображение не загрузилось
        observer.complete();
      };
      
      img.onprogress = (event: any) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          this.updateTaskProgress(taskId, progress, false);
        }
      };
      
      img.src = src;
    });
  }

  private loadAudio(src: string, taskId: string): Observable<any> {
    return new Observable(observer => {
      const audio = new Audio();
      
      audio.oncanplaythrough = () => {
        this.updateTaskProgress(taskId, 100, true);
        observer.next(audio);
        observer.complete();
      };
      
      audio.onerror = () => {
        this.updateTaskProgress(taskId, 100, true);
        observer.next(null);
        observer.complete();
      };
      
      audio.onprogress = () => {
        if (audio.buffered.length > 0) {
          const progress = (audio.buffered.end(0) / audio.duration) * 100;
          this.updateTaskProgress(taskId, progress, false);
        }
      };
      
      audio.src = src;
      audio.load();
    });
  }

  private loadModel(src: string, taskId: string): Observable<any> {
    return new Observable(observer => {
      // Имитируем загрузку 3D модели
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 100) {
          progress = 100;
          this.updateTaskProgress(taskId, progress, true);
          clearInterval(interval);
          observer.next(true);
          observer.complete();
        } else {
          this.updateTaskProgress(taskId, progress, false);
        }
      }, 100);
    });
  }

  private loadData(dataType: string, taskId: string): Observable<any> {
    // Имитируем загрузку данных с API
    return timer(500 + Math.random() * 1500).pipe(
      switchMap(() => {
        // Здесь бы был реальный HTTP запрос
        // return this.http.get(`/api/${dataType}`)
        return of({ type: dataType, data: 'mock data' });
      }),
      tap(() => {
        this.updateTaskProgress(taskId, 100, true);
      })
    );
  }

  private updateTaskProgress(taskId: string, progress: number, completed: boolean): void {
    const tasks = this.loadingTasks$.value;
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex !== -1) {
      tasks[taskIndex].progress = progress;
      tasks[taskIndex].completed = completed;
      
      // Обновляем общий прогресс
      const totalProgress = tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length;
      this.loadingProgress$.next(totalProgress);
      
      this.loadingTasks$.next([...tasks]);
    }
  }

  clearCache(): void {
    this.loadedCache.clear();
  }
}