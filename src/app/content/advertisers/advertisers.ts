import { Component, Renderer2, signal, computed, ElementRef, OnInit, OnDestroy, ViewChild, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl, ReactiveFormsModule } from '@angular/forms';
import { AdvertisersService } from '../shared/service/advertisers-service/advertisers-service';
import { catchError, Observable, Subject, Subscription, tap, throwError } from 'rxjs';
import { RouterLink, RouterModule, Router } from '@angular/router';
import { TransitionService } from '../../shaders/service/transition.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeedbackService } from '../../shaders/service/feedback-service';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface Course {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  svgIcon: string;
  watchUrl: string;
}

type Theme = 'system' | 'light' | 'dark';

interface ThemeOption {
  label: string;
  value: Theme;
}

interface FeedbackForm {
  actor: string;
  theme: string;
  email: string;
  name_company: string;
  name_person: string;
  message: string;
  status: string;
  user_agent: string;
  updated_at: string;
  agreement: string;
}

interface ModalState {
  isOpen: boolean;
  isScrollTriggered: boolean;
}

@Component({
  selector: 'app-advertisers',
  imports: [RouterLink, RouterModule, CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './advertisers.html',
  styleUrl: './advertisers.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Advertisers implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('coursesList', { static: true }) coursesList!: ElementRef<HTMLUListElement>;
  @ViewChild('modal', { static: true }) modalRef!: ElementRef<HTMLDivElement>;
  @ViewChild('scrollDown', { static: true }) scrollDownRef!: ElementRef<HTMLDivElement>;

  // Signals for reactivity
  public readonly theme = signal<Theme>('system');
  public readonly activeIndex = signal<number>(0);
  private modalState = signal<ModalState>({ isOpen: false, isScrollTriggered: false });
  form?: FormGroup;
  submitted = false;
  submitting = false;
  errorMessage = '';
  successMessage = '';

  // Computed properties
  readonly isModalOpen = computed(() => this.modalState().isOpen);
  readonly isScrollTriggered = computed(() => this.modalState().isScrollTriggered);

  public readonly courses = signal<Course[]>([
    {
      id: 1,
      title: 'PR-менеджер',
      description: 'Специалист по стратегическому управлению репутацией брендов в информационном пространстве, определяющий тактику присутствия в СМИ и на тематических мероприятиях. Создает комплексные коммуникационные стратегии, переводит PR-активности в измеримые бизнес-метрики и управляет контентом от пресс-релизов до интервью. Требуется опыт работы с эвентами, широкая медиа-сеть и навыки презентации результатов.',
      imageUrl: 'images/carier/PR.jpg',
      watchUrl: '#',
      svgIcon: `<path d="M6 3h12l4 6-10 13L2 9Z" /><path d="M11 3 8 9l4 13 4-13-3-6" /><path d="M2 9h20" />`
    },
    {
      id: 2,
      title: 'Аккаунт-менеджер',
      description: 'Специалист по поиску и взаимодействию с блогерами на всех популярных платформах для реализации рекламных кампаний и спецпроектов. Проводит переговоры с инфлюенсерами, готовит материалы для размещений и анализирует результаты кампаний. Необходим опыт в эвентах, работе с медиапланами и создании гибридных онлайн-офлайн проектов.',
      imageUrl: 'images/carier/ACCOUNT.jpg',
      watchUrl: '#',
      svgIcon: `<rect width="18" height="18" x="3" y="3" rx="2" /><path d="M7 3v18" /><path d="M3 7.5h4" /><path d="M3 12h18" /><path d="M3 16.5h4" /><path d="M17 3v18" /><path d="M17 7.5h4" /><path d="M17 16.5h4" />`
    },
    {
      id: 3,
      title: 'Маркетолог',
      description: 'Эксперт по продвижению товаров на маркетплейсах с фокусом на увеличение продаж через SEO-оптимизацию карточек и настройку рекламных кампаний. Анализирует конкурентов, управляет бюджетами, отслеживает метрики эффективности и разрабатывает стратегии роста. Обязателен опыт работы с ВБ, Озон, ЯндексМаркет и знание unit-экономики.',
      imageUrl: 'images/carier/MARKETER.jpg',
      watchUrl: '#',
      svgIcon: `<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />`
    },
    {
      id: 4,
      title: 'Креатор',
      description: 'Идеолог нестандартных маркетинговых механик, создающий виральные кампании, интерактивные проекты и коллаборации брендов. Разрабатывает спецпроекты с блогерами, чат-боты и креативные решения, интегрируя идеи с бизнес-целями клиентов. Требуется портфолио реализованных механик и опыт в инфлюенс-маркетинге.',
      imageUrl: 'images/carier/CREATOR.jpg',
      watchUrl: '#',
      svgIcon: `<path d="M19 17V5a2 2 0 0 0-2-2H4" /><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" />`
    },
    {
      id: 5,
      title: 'Развитие бизнеса',
      description: 'Ключевое звено в привлечении новых клиентов и развитии долгосрочных партнерских отношений в B2B-сегменте. Проводит аналитику рынка, готовит проактивные предложения и ведет переговоры с потенциальными клиентами. Необходимы навыки управления бизнесом и глубокое понимание современных маркетинговых трендов.',
      imageUrl: 'images/carier/BUSINESS.jpg',
      watchUrl: '#',
      svgIcon: `<circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" /><circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />`
    }
  ]);

  public readonly themeOptions: ThemeOption[] = [
    { label: 'System', value: 'system' },
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' }
  ];

  public readonly gridColumns = computed(() => {
    const courses = this.courses();
    const activeIdx = this.activeIndex();
    return courses.map((_, index) => index === activeIdx ? '10fr' : '1fr').join(' ');
  });

  feedbackForm!: FormGroup<{
    actor: FormControl<string>;
    theme: FormControl<string>;
    email: FormControl<string>;
    name_company: FormControl<string>;
    name_person: FormControl<string>;
    message: FormControl<string>;
    agreement: FormControl<boolean>;
  }>;

  private subscriptions: Subscription[] = [];
  private scrollAnimationFrame: number | null = null;
  private isTransitioning = false;
  private readonly SCROLL_THRESHOLD_RATIO = 1 / 3;
  public hoveredNavLabel: string | null = null;
  private isModalOpenedByScroll = false;

  constructor(
    private http: HttpClient,
    private AdvertisersService: AdvertisersService,
    private transitionService: TransitionService,
    private renderer: Renderer2,
    private elementRef: ElementRef,
    private router: Router,
    private fb: FormBuilder,
    private feedbackSevice: FeedbackService,
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    document.body.classList.add('loading-active');
    this.AdvertisersService.init(this.canvasRef.nativeElement);
    this.subscriptions.push(
      this.AdvertisersService.error$.subscribe((error: string) => this.showError(error)),
      this.AdvertisersService.fps$.subscribe((fps: number) => this.updateFps(fps))
    );
    this.bindEvents();
    this.initScrollObserver();
    this.updateTheme();
    setTimeout(() => this.resyncArticleWidth(), 0);

    // Fetch CSRF token on initialization
    this.getCsrfToken().subscribe(
    );

    if ((this.AdvertisersService as any).progress$ && typeof (this.AdvertisersService as any).progress$.subscribe === 'function') {
      this.subscriptions.push(
        (this.AdvertisersService as any).progress$.subscribe((progress: number) => {
          if (progress >= 100) {
            this.setBodyScroll(true);
          }
        })
      );
    }
  }

  private getCsrfToken(): Observable<any> {
    return this.feedbackSevice.getCsrfToken().pipe(
      catchError((error) => {
        return throwError(error);
      })
    );
  }

  onSubmit() {
  
    // Очищаем предыдущие ошибки и успехи
    this.errorMessage = '';
    this.successMessage = '';
    this.clearFormErrors();
  
    if (this.feedbackForm.invalid) {
      console.log('❌ Form is invalid');
      this.handleFormValidationErrors();
      return;
    }
  
    const feedback = this.prepareFeedbackData();
  
    this.getCsrfTokenForSubmission()
      .then(token => {
        if (token) {
          this.submitFeedback(feedback, token);
        } else {
          this.handleCsrfTokenError();
        }
      })
      .catch(error => {
        this.errorMessage = 'Попробуйте перезагрузить и отправить снова';
        this.successMessage = '';
      });
  }

  private async getCsrfTokenForSubmission(): Promise<string | null> {
    try {
      const response = await this.getCsrfToken().toPromise();
      const token = response?.csrfToken || response?.csrf_token || response?.token;
      return token ?? null;
    } catch (error) {
      return null;
    }
  }

  private submitFeedback(feedback: any, csrfToken: string): void {
  this.submitting = true;
  this.errorMessage = '';
  this.successMessage = '';

  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'X-CSRFToken': csrfToken
  });

  this.feedbackSevice.feedback(feedback, headers).subscribe({
    next: (response) => {
      console.log('✅ Feedback sent successfully:', response);
      this.successMessage = 'Вы успешно отправили ваше обращение!';
      this.router.navigate(['/']);
      this.submitted = false;
      this.submitting = false;
      this.errorMessage = '';
      this.feedbackForm.reset({
        actor: '',
        email: '',
        theme: '',
        name_company: '',
        agreement: false,
        name_person: '',
        message: ''
      });
      // Автоматически скрывать successMessage через 10 секунд
      setTimeout(() => {
        this.successMessage = '';
      }, 10000);
    },
    error: (error) => {
      console.error('❌ Feedback submission error:', JSON.stringify(error, null, 2));
      this.submitting = false;
      this.successMessage = '';
      this.handleSubmissionError(error);
    }
  });
}

private handleSubmissionError(error: any): void {
  console.error('❌ Full error object:', error);
  this.successMessage = '';
  
  // Сначала очищаем все предыдущие ошибки формы
  this.clearFormErrors();
  
  if (error.error) {
    // Обработка non_field_errors (например, "Вы уже отправляли...")
    if (error.error.non_field_errors) {
      this.errorMessage = error.error.non_field_errors.join(', ');
      this.showErrorMessage(this.errorMessage);
      return;
    } 
    // Обработка ошибок для конкретных полей
    else if (typeof error.error === 'object') {
      let hasFieldErrors = false;
      Object.keys(error.error).forEach((field) => {
        const control = this.feedbackForm.get(field);
        if (control && Array.isArray(error.error[field])) {
          hasFieldErrors = true;
          control.setErrors({ 
            serverError: error.error[field].join(', ')
          });
          control.markAsTouched();
        }
      });
      
      if (hasFieldErrors) {
        this.errorMessage = 'Проверьте правильность заполнения полей формы';
        this.showErrorMessage(this.errorMessage);
        return;
      }
    }
    // Если error.error - это строка
    else if (typeof error.error === 'string') {
      this.errorMessage = error.error;
      this.showErrorMessage(this.errorMessage);
      return;
    }
  } 
  
  // Обработка HTTP-ошибок по статусу
  if (error.status) {
    switch (error.status) {
      case 429:
        this.errorMessage = 'Слишком много запросов. Попробуйте снова через несколько минут.';
        break;
      case 400:
        this.errorMessage = 'Ошибка в данных формы. Проверьте введённые данные.';
        break;
      case 403:
        this.errorMessage = 'Доступ запрещён. Попробуйте обновить страницу.';
        break;
      case 500:
        this.errorMessage = 'Внутренняя ошибка сервера. Попробуйте позже.';
        break;
      default:
        this.errorMessage = `Ошибка сервера (${error.status}). Попробуйте позже.`;
    }
  } else {
    this.errorMessage = 'Произошла ошибка при отправке формы. Попробуйте позже.';
  }
  
  // Показываем ошибку
  this.showErrorMessage(this.errorMessage);
}

private showErrorMessage(message: string): void {
  console.log('🚨 Showing error message:', message);
  this.successMessage = '';
  
  // Убеждаемся, что ошибка видна
  this.errorMessage = message;
  
  // Добавляем визуальный индикатор ошибки
  const errorElement = document.querySelector('.error-message');
  if (errorElement) {
    errorElement.classList.add('show-error');
    errorElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  
  // Автоматически скрываем через 15 секунд (увеличено время)
  setTimeout(() => {
    this.errorMessage = '';
    if (errorElement) {
      errorElement.classList.remove('show-error');
    }
  }, 15000);
}

private clearFormErrors(): void {
  Object.keys(this.feedbackForm.controls).forEach(key => {
    const control = this.feedbackForm.get(key);
    if (control && control.errors?.['serverError']) {
      // Удаляем только серверные ошибки, оставляя валидационные
      const errors = { ...control.errors };
      delete errors['serverError'];
      
      // Если других ошибок нет, устанавливаем null
      const hasOtherErrors = Object.keys(errors).length > 0;
      control.setErrors(hasOtherErrors ? errors : null);
    }
  });
}

  private handleCsrfTokenError(): void {
    if (confirm('Токен не найден. Хотите перезагрузить страницу?')) {
      window.location.reload();
    }
  }

  private prepareFeedbackData(): any {
    return {
      actor: this.feedbackForm.value.actor || '',
      theme: this.feedbackForm.value.theme || '',
      email: this.feedbackForm.value.email || '',
      name_company: this.feedbackForm.value.name_company || '',
      name_person: this.feedbackForm.value.name_person || '',
      message: this.feedbackForm.value.message || '',
      user_agent: navigator.userAgent,
      agreement: this.feedbackForm.value.agreement || false,
      updated_at: new Date().toISOString()
    };
  }

  private handleFormValidationErrors(): void {
    let errorMessages: string[] = [];
    
    Object.keys(this.feedbackForm.controls).forEach(key => {
      const control = this.feedbackForm.get(key);
      if (control && control.invalid) {
        const fieldError = this.getFieldErrorMessage(key);
        if (fieldError) {
          errorMessages.push(fieldError);
        }
      }
    });
    
    this.markFormGroupTouched();
    
    if (errorMessages.length > 0) {
      this.errorMessage = 'Пожалуйста, проверьте введенные данные';
    } else {
      this.errorMessage = 'Пожалуйста, проверьте введенные данные';
    }
    
    this.showErrorMessage(this.errorMessage);
  }

  public testErrorHandling(): void {
    // Тест валидационных ошибок
    this.feedbackForm.get('email')?.setValue('invalid-email');
    this.feedbackForm.get('name_person')?.setValue('');
    this.onSubmit();
    
    // Тест серверных ошибок (симуляция)
    setTimeout(() => {
      console.log('Testing server errors...');
      this.handleSubmissionError({ status: 429, error: 'Too many requests' });
    }, 2000);
    
    setTimeout(() => {
      console.log('Testing 400 error...');
      this.handleSubmissionError({ status: 400, error: 'Bad request' });
    }, 4000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  
    // Stop any ongoing animations
    if (this.scrollAnimationFrame) {
      cancelAnimationFrame(this.scrollAnimationFrame);
      this.scrollAnimationFrame = null;
    }
  
    // Call AdvertisersService.destroy() and ensure it cleans up properly
    try {
      this.AdvertisersService.destroy();
    } catch (error) {
    }
  
    // Unsubscribe from all subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
  
    // Close modal
    this.closeModal();
  
    // Clean up WebGL context
    if (this.canvasRef?.nativeElement) {
      const canvas = this.canvasRef.nativeElement;
      const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
      if (gl) {
        const ext = gl.getExtension('WEBGL_lose_context');
        if (ext) {
          ext.loseContext();
        }
      } else {
        console.warn('No WebGL context found on canvas');
      }
      // Remove canvas from DOM using Renderer2
      try {
        this.renderer.removeChild(this.elementRef.nativeElement, canvas);
      } catch (error) {
        console.error('Error removing canvas:', error);
      }
    } else {
      console.warn('CanvasRef is undefined');
    }
  
    // Nullify references
    this.canvasRef = null as any;
    this.coursesList = null as any;
    this.modalRef = null as any;
    this.scrollDownRef = null as any;
  }

  @HostListener('window:scroll', ['$event'])
  onScroll(event: Event): void {
    if (this.scrollAnimationFrame) {
      cancelAnimationFrame(this.scrollAnimationFrame);
    }
    this.scrollAnimationFrame = requestAnimationFrame(() => {
      this.handleScrollAnimation();
      // this.checkScrollToBottomAndOpenModal();
    });
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.resyncArticleWidth();
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' || event.keyCode === 27) {
      this.closeModal();
    }
  }

  public onThemeChange(newTheme: Theme): void {
    this.theme.set(newTheme);
    if ('startViewTransition' in document) {
      (document as any).startViewTransition(() => this.updateTheme());
    } else {
      this.updateTheme();
    }
  }

  public setActiveItem(event: Event, index: number): void {
    const target = event.target as HTMLElement;
    if (target.closest('li')) {
      this.activeIndex.set(index);
      this.updateGridColumns();
    }
  }

  public onFocus(event: Event, index: number): void {
    this.setActiveItem(event, index);
  }

  public onClick(event: Event, index: number): void {
    this.setActiveItem(event, index);
  }

  public onPointerMove(event: Event, index: number): void {
    this.setActiveItem(event, index);
  }

  public trackByCourse(index: number, course: Course): number {
    return course.id;
  }

  public isActive(index: number): boolean {
    return this.activeIndex() === index;
  }

  public onModalButtonClick(): void {
    this.openModal();
  }

  public onCloseButtonClick(): void {
    this.closeModal();
  }

  public onSignUpClick(): void {
  }

  private initializeForm(): void {
    this.feedbackForm = this.fb.nonNullable.group({
      actor: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      theme: ['', [Validators.required, Validators.minLength(3)]],
      name_company: [''],
      agreement: [false, Validators.required],
      name_person: ['', [Validators.required, Validators.minLength(2)]],
      message: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.feedbackForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldErrorMessage(fieldName: string): string {
    const field = this.feedbackForm.get(fieldName);
    if (!field || !field.errors) return '';
    
    const errors = field.errors;
    
    // Приоритет серверным ошибкам
    if (errors['serverError']) {
      return errors['serverError'];
    }
    
    // Валидационные ошибки
    
    if (errors['email']) {
      return 'Введите корректный email';
    }
    
    if (errors['minlength']) {
      const requiredLength = errors['minlength'].requiredLength;
      return `Минимум ${requiredLength} символов`;
    }
    
    return 'Некорректное значение';
  }

  private openModal(): void {
    this.modalState.set({
      ...this.modalState(),
      isOpen: true
    });
    this.setBodyOverflow('hidden');
  }

  private closeModal(): void {
    this.modalState.set({
      ...this.modalState(),
      isOpen: false
    });
    this.setBodyOverflow('initial');
  }

  private hideScrollDown(): void {
    if (this.scrollDownRef?.nativeElement) {
      this.renderer.setStyle(
        this.scrollDownRef.nativeElement,
        'display',
        'none'
      );
    }
  }

  private setBodyOverflow(value: 'hidden' | 'initial'): void {
    this.renderer.setStyle(document.body, 'overflow', value);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.feedbackForm.controls).forEach(key => {
      const control = this.feedbackForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  get emailControl() {
    return this.feedbackForm.get('email');
  }

  get isEmailInvalid(): boolean {
    const email = this.emailControl;
    return !!(email && email.invalid && email.touched);
  }

  private updateTheme(): void {
    this.renderer.setAttribute(
      document.documentElement,
      'data-theme',
      this.theme()
    );
  }

  private updateGridColumns(): void {
    if (this.coursesList) {
      this.renderer.setStyle(
        this.coursesList.nativeElement,
        'grid-template-columns',
        this.gridColumns()
      );
    }
  }

  private resyncArticleWidth(): void {
    if (!this.coursesList) return;
    const listItems = this.coursesList.nativeElement.querySelectorAll('li');
    const maxWidth = Math.max(
      ...Array.from(listItems).map((item: Element) => (item as HTMLElement).offsetWidth)
    );
    this.renderer.setStyle(
      this.coursesList.nativeElement,
      '--article-width',
      `${maxWidth}px`
    );
  }

  private initScrollObserver(): void {
    const contentSection = document.querySelector('.content-section');
    if (!contentSection) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.95 && !this.isTransitioning) {
            this.triggerContentTransition();
            this.modalState.set({
              ...this.modalState(),
              isScrollTriggered: true,
              isOpen: true
            });
            this.hideScrollDown();
            this.setBodyOverflow('hidden');
          }
        });
      },
      {
        threshold: 0.95,
        rootMargin: '0px 0px -10% 0px'
      }
    );
    observer.observe(contentSection);
  }

  private handleScrollAnimation(): void {
    const scrollPosition = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollPercentage = scrollPosition / (documentHeight - windowHeight);
    const fadeStart = 0.3;
    const fadeEnd = 0.7;
    let opacity = 1;
    if (scrollPercentage > fadeStart) {
      const fadeProgress = (scrollPercentage - fadeStart) / (fadeEnd - fadeStart);
      opacity = Math.max(0, 1 - fadeProgress);
    }
    const fixedElements = document.querySelectorAll('.text-element');
    const canvas = document.getElementById('canvas');
    const container = document.querySelector('.container');
    fixedElements.forEach(element => {
      (element as HTMLElement).style.opacity = opacity.toString();
      (element as HTMLElement).style.transform = `translateY(${(1 - opacity) * 30}px)`;
    });
    if (canvas) {
      const canvasOpacity = Math.max(0, opacity);
      canvas.style.opacity = canvasOpacity.toString();
    }
    if (container) {
      const blurAmount = (1 - opacity) * 10;
      (container as HTMLElement).style.filter = `blur(${blurAmount}px)`;
    }
  }

  private triggerContentTransition(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    const contentSection = document.querySelector('.content-section') as HTMLElement;
    if (contentSection) {
      contentSection.classList.add('active');
      const transitionSound = document.getElementById('hoverSound') as HTMLAudioElement;
      if (transitionSound) {
        transitionSound.currentTime = 0;
        transitionSound.play().catch(() => {});
      }
      setTimeout(() => {
        this.isTransitioning = false;
      }, 1000);
    }
  }

  private bindEvents(): void {
    const enableBtn = document.getElementById('enableBtn');
    if (enableBtn) {
      enableBtn.onclick = () => this.AdvertisersService.onStartClick();
    }
  }

  private showError(message: string): void {
    const el = document.getElementById('errorMessage');
    if (el) {
      el.textContent = message;
      el.style.display = 'block';
      setTimeout(() => el.style.display = 'block', 5000);
    }
  }

  private updateFps(fps: number): void {
    const fpsElement = document.getElementById('fpsCounter');
    if (fpsElement) {
      fpsElement.textContent = fps.toString();
    }
  }

  goToTest(target: string) {
    this.transitionService.goWithSmoke('/flight', target);
  }

  scrollToContent() {
    const contentSection = document.querySelector('.content-section');
    if (contentSection) {
      contentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  private setBodyScroll(enabled: boolean) {
    if (enabled) {
      document.body.classList.remove('loading-active');
    } else {
      document.body.classList.add('loading-active');
    }
  }

  public get todayMarsDate(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd}`;
  }

  public onNavMouseEnter(label: string): void {
    this.hoveredNavLabel = label;
  }

  public onNavMouseLeave(): void {
    this.hoveredNavLabel = null;
  }

  private checkScrollToBottomAndOpenModal(): void {
    const scrollPosition = window.scrollY + window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    if (scrollPosition >= documentHeight - 2 && !this.isModalOpenedByScroll && !this.isModalOpen()) {
      this.isModalOpenedByScroll = true;
      this.openModal();
    }
    if (scrollPosition < documentHeight - 50 && this.isModalOpenedByScroll) {
      this.isModalOpenedByScroll = false;
    }
  }
}