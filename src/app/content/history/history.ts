import { 
  Component, 
  ElementRef, 
  ViewChild, 
  HostListener, 
  OnInit, 
  OnDestroy, 
  AfterViewInit,
  Renderer2,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { TransitionService } from '../../shaders/service/transition.service';

interface SlideData {
  title: string;
  quote: string;
}

interface MousePosition {
  x: number;
  y: number;
}

interface MouseCoefficients {
  xCoeff: number;
  yCoeff: number;
}

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './history.html',
  styleUrl: './history.scss'
})
export class History implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('slider', { static: true }) sliderEl!: ElementRef<HTMLDivElement>;
  @ViewChild('sliderContent', { static: true }) contentEl!: ElementRef<HTMLDivElement>;
  @ViewChild('sliderDots', { static: true }) dotsEl!: ElementRef<HTMLDivElement>;

  // Data
  readonly images: string[] = [
    "/images/history/gagarin.jpeg",
    "/images/history/leonov.jpeg",
    "/images/history/korolev.jpeg",
    "/images/history/sokolov.jpeg",
    "/images/Cosmos.jpg"
  ];

  readonly slideData: SlideData[] = [
    {
      title: 'Юрий Гагарин',
      quote: '"Улыбка Гагарина сделала для международного имиджа Советского Союза больше, чем тысячи дипломатов. Его образ – пример того, как правильно выбранный "амбассадор бренда" может изменить восприятие целой страны."'
    },
    {
      title: 'Алексей Леонов',
      quote: '"Невозможно обойти стороной личность Алексея Леонова: первый человек в открытом космосе, стал живым воплощением синтеза науки и искусства, творчества. Его космические пейзажи не просто документировали достижения — они создавали новую реальность."'
    },
    {
      title: 'Сергей Королев',
      quote: '"Величайший пример работающей коммуникационной кампании. Благодаря правильной поддержке и освещению его работы удалось сформировать образ страны, лидирующей в научных и технологических достижениях. Многие поколения ученых и исследователей сформировались и продолжают формироваться благодаря истории жизни Королева, популяризации им и его командой процессов, котором они посвятили жизнь."'
    },
    {
      title: 'А. Леонов, А. Соколов',
      quote: '"Тяжелый спутник Земли. Здесь все строго, точно и элегантно. На спутнике есть многочисленные отсеки для хранения топлива, удобные гостиные и жилые помещения. Но сердцем спутника является стартовая платформа, с которой космические корабли отправляются к другим мирам. Обычный космический полет"'
    },
    {
      title: 'Космос',
      quote: '"Вернуться в Космос"'
    }
  ];

  // State
  currentIndex: number = 0;
  isInTransit: boolean = false;
  isMobile: boolean = false;
  mouseWatched: boolean = false;
  animationRunning: boolean = false;
  animationStopped: boolean = false;
  showReturnButton: boolean = false;

  // Mouse tracking
  private lastX: number = 0;
  private lastY: number = 0;
  private targetX: number = 0;
  private targetY: number = 0;
  private halfWidth: number = 0;
  private halfHeight: number = 0;
  private zDistance: string = '8.519vw';

  // Auto-slide
  private autoSlideTimer: number | null = null;
  private animationFrameId: number | null = null;

  // Audio
  private audio: HTMLAudioElement | null = null;

  constructor(
    private renderer: Renderer2,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private transitionService: TransitionService
  ) {}

  ngOnInit(): void {
    this.updateSliderVariables();
    // Воспроизведение аудио при запуске компонента
    this.audio = new Audio('/images/advertisers/audio/history.mp3');
    this.audio.loop = true;
    this.audio.volume = 1.0;
    this.audio.play().catch(() => {}); // Игнорируем ошибку автозапуска
  }

  ngAfterViewInit(): void {
    this.onResize();
    this.startAutoSlide();
  }

  ngOnDestroy(): void {
    this.stopAutoSlide();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    // Останавливаем аудио при уничтожении компонента
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    const htmlStyles = getComputedStyle(document.documentElement);
    const mobileBreakpoint = htmlStyles.getPropertyValue('--mobile-bkp') || '650px';
    
    this.isMobile = window.matchMedia(`only screen and (max-width: ${mobileBreakpoint})`).matches;
    this.halfWidth = window.innerWidth / 2;
    this.halfHeight = window.innerHeight / 2;
    this.zDistance = htmlStyles.getPropertyValue('--z-distance') || '8.519vw';

    if (!this.isMobile && !this.mouseWatched) {
      this.mouseWatched = true;
      this.updateSliderVariables();
      this.renderer.setStyle(
        this.contentEl.nativeElement,
        'transform',
        `translateZ(${this.zDistance})`
      );
    } else if (this.isMobile && this.mouseWatched) {
      this.mouseWatched = false;
      this.renderer.setStyle(this.contentEl.nativeElement, 'transform', 'none');
    }
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.isMobile) return;

    this.targetX = event.pageX;
    this.targetY = event.pageY;

    if (!this.animationRunning) {
      this.animationRunning = true;
      this.runAnimation();
    }
  }

  @HostListener('touchstart')
  onTouchStart(): void {
    this.stopAutoSlide();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const audio = new Audio('/images/advertisers/audio/preloader-2s.mp3');
    audio.volume = 0.2;
    audio.play().catch(() => {});
  }

  // Utility methods
  private lerp(current: MousePosition, target: MousePosition): MousePosition {
    const fraction = 0.1;
    return {
      x: current.x + (target.x - current.x) * fraction,
      y: current.y + (target.y - current.y) * fraction
    };
  }

  private getMouseCoefficients(pos?: MousePosition): MouseCoefficients {
    const x = pos?.x || this.targetX;
    const y = pos?.y || this.targetY;
    
    const xCoeff = (x - this.halfWidth) / this.halfWidth;
    const yCoeff = (this.halfHeight - y) / this.halfHeight;
    
    return { xCoeff, yCoeff };
  }

  private get reachedFinalPoint(): boolean {
    const lastX = Math.floor(this.lastX);
    const lastY = Math.floor(this.lastY);
    const targetX = this.targetX;
    const targetY = this.targetY;
    
    return (lastX === targetX || lastX - 1 === targetX || lastX + 1 === targetX) &&
           (lastY === targetY || lastY - 1 === targetY || lastY + 1 === targetY);
  }

  private runAnimation(): void {
    if (this.animationStopped) {
      this.animationRunning = false;
      return;
    }

    const maxX = 10;
    const maxY = 10;

    const newPos = this.lerp(
      { x: this.lastX, y: this.lastY },
      { x: this.targetX, y: this.targetY }
    );

    const { xCoeff, yCoeff } = this.getMouseCoefficients({
      x: newPos.x,
      y: newPos.y
    });

    this.lastX = newPos.x;
    this.lastY = newPos.y;

    this.positionImage({ xCoeff, yCoeff });

    this.renderer.setStyle(
      this.contentEl.nativeElement,
      'transform',
      `translateZ(${this.zDistance}) rotateX(${maxY * yCoeff}deg) rotateY(${maxX * xCoeff}deg)`
    );

    if (this.reachedFinalPoint) {
      this.animationRunning = false;
    } else {
      this.animationFrameId = requestAnimationFrame(() => this.runAnimation());
    }
  }

  private positionImage({ xCoeff, yCoeff }: MouseCoefficients): void {
    const maxImgOffset = 1;
    const activeImg = this.sliderEl.nativeElement.querySelector('.slider__images-item--active img') as HTMLImageElement;
    
    if (activeImg) {
      this.renderer.setStyle(
        activeImg,
        'transform',
        `translateX(${maxImgOffset * -xCoeff}em) translateY(${maxImgOffset * yCoeff}em)`
      );
    }
  }

  private updateSliderVariables(): void {
    this.renderer.setStyle(
      this.sliderEl.nativeElement,
      '--img-prev',
      `url(${this.images[this.currentIndex]})`
    );
    this.renderer.setStyle(
      this.sliderEl.nativeElement,
      '--from-left',
      (this.currentIndex + 1).toString()
    );
  }

  // Navigation methods
  onDotClick(index: number): void {
    if (this.isInTransit || index === this.currentIndex) return;
    this.startTransition(index);
  }

  goToTest(target: string) {
    this.transitionService.goWithSmoke('/flight', target);
  }

  next(): void {
    if (this.isInTransit) return;
    
    // Если это последний слайд, перенаправляем на /cosmos
    if (this.currentIndex === 4) {
      this.goToTest('/cosmos');
      return;
    }
    
    const nextIndex = this.currentIndex + 1 >= this.images.length ? 0 : this.currentIndex + 1;
    this.startTransition(nextIndex);
  }

  prev(): void {
    if (this.isInTransit) return;
    
    const prevIndex = this.currentIndex - 1 < 0 ? this.images.length - 1 : this.currentIndex - 1;
    this.startTransition(prevIndex);
  }

  private startTransition(nextIndex: number): void {
    if (this.isInTransit) return;

    this.isInTransit = true;
    this.animationStopped = true;

    // Trigger transition
    setTimeout(() => {
      this.currentIndex = nextIndex;
      this.updateSliderVariables();
      this.cdr.detectChanges();
      
      this.animationStopped = false;
      this.positionImage(this.getMouseCoefficients());
      
      // Complete transition
      setTimeout(() => {
        this.isInTransit = false;
      }, 700);
    }, 350);
  }

  // Auto-slide functionality
  private startAutoSlide(): void {
    this.autoSlideTimer = window.setTimeout(() => {
      this.autoSlide();
    }, 10000);
  }

  private autoSlide(): void {
    this.next();
    this.autoSlideTimer = window.setTimeout(() => {
      this.autoSlide();
    }, 15000);
  }

  private stopAutoSlide(): void {
    if (this.autoSlideTimer) {
      clearTimeout(this.autoSlideTimer);
      this.autoSlideTimer = null;
    }
  }

  // Template helpers
  getImageClass(index: number): string {
    const baseClass = 'slider__images-item';
    if (index === this.currentIndex) {
      return `${baseClass} slider__images-item--active`;
    }
    return baseClass;
  }

  getTextClass(index: number): string {
    const baseClass = 'slider__text-item';
    if (index === this.currentIndex) {
      return `${baseClass} slider__text-item--active`;
    }
    return baseClass;
  }

  getDotClass(index: number): string {
    const baseClass = 'slider__nav-dot';
    if (index === this.currentIndex) {
      return `${baseClass} slider__nav-dot--active`;
    }
    return baseClass;
  }

  trackByIndex(index: number): number {
    return index;
  }
}