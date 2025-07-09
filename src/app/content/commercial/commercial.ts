import { Component, AfterViewInit, OnDestroy, HostListener, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';
import { Router } from '@angular/router';
import { TransitionService } from '../../shaders/service/transition.service';

interface WalkthroughScreen { 
  id: string;
  title: string;
  subtitle: string;
  description: string;
  mediaType: 'logo' | 'books' | 'bars' | 'files' | 'comm';
  icons: string[];
}

interface SectionData {
  id: string;
  title: string;
  className: string;
  bgUrl: string;
  subtitle: string;
  description: string;
  modalScreens: WalkthroughScreen[];
} 

@Component({
  selector: 'app-commercial',
  imports: [CommonModule],
  templateUrl: './commercial.html',
  styleUrl: './commercial.scss'
})
export class Commercial implements AfterViewInit, OnDestroy {
  
  public sections: SectionData[] = [
    {
      id: 'first',
      title: 'Рекламодателям',
      className: 'first',
      bgUrl: 'images/commercial/image/Commercial.jpg',
      subtitle: '',
      description: '',
      modalScreens: [
        {
          id: 'targeting',
          title: 'ТВ',
          subtitle: 'Спонсорство',
          description: 'Реализация интеграционных решений с ТВ каналами любых территорий вещания в РФ и любых способов доставки контента.',
          mediaType: 'logo',
          icons: [
            'images/commercial/vector/TV.svg',
          ]
        },
        {
          id: 'analytics',
          title: 'Медийная Digital',
          subtitle: 'Реклама',
          description: 'Уникальные ценовые условия, широкая экспертиза в сквозной аналитике, верификация качества трафика.',
          mediaType: 'bars',
          icons: [
            'images/commercial/vector/AD1.svg',
            'images/commercial/vector/AD.svg',
          ]
        },
        {
          id: 'formats',
          title: 'Influence',
          subtitle: '',
          description: 'Подбор, анализ и реализация блогерских рекламных кампаний. Работа со всеми возможными инструментами на рынке, одновременный запуск больших охватных кампаний, конкурсные механики во всех социальных сетях. Оценка качества аудитории и бот-трафика.',
          mediaType: 'files',
          icons: [
            'images/commercial/vector/bar_axis.png',
            'images/commercial/vector/bar_1.png',
            'images/commercial/vector/bar_2.png',
            'images/commercial/vector/bar_3.png',
          ]
        },
        {
          id: 'support',
          title: 'Производство',
          subtitle: 'Контента',
          description: 'Производство авторского и рекламного контента, создание каналов, групп и сообществ для различных платформ и брендов. Длинные метры, короткие метры, фото и видео, текст и графика, анимационные решения.',
          mediaType: 'comm',
          icons: [
            'images/commercial/vector/CREATE.svg',
            'images/commercial/vector/CREATE1.svg',
          ]
        },
        {
          id: 'target',
          title: 'Таргетированная Реклама',
          subtitle: 'Социальные сети',
          description: 'Тонкая настройка рекламных кампаний для CPx конверсий, глубокая экспертиза в сквозной аналитике, использовании данных из разных источников, непрерывная оценка результатов и гарантия низкой цены.',
          mediaType: 'comm',
          icons: [
            'images/commercial/vector/comm_1.png',
            'images/commercial/vector/comm_2.png',
          ]
        },
        {
          id: 'reputation',
          title: 'Репутационный',
          subtitle: 'Маркетинг',
          description: 'Вход во все процессы работы бизнеса с помощью обратной связи от потребителей: корректировка работы фронта и бэка, логистических цепочек, рецептуры и пользовательского опыта. Восстановление и развитие положительной репутации, рост выручки и формирование силы бренда.',
          mediaType: 'comm',
          icons: [
            'images/commercial/vector/MARKET1.svg',
            'images/commercial/vector/MARKET.svg',
          ]
        },
        {
          id: 'design',
          title: 'Дизайн',
          subtitle: '',
          description: 'Разработка ярких и запоминающихся логотипов, брендбуков, web-разработка, интерактивные креативные рекламные материалы, дизайн презентационных материалов, оформление оффлайн мероприятий, сценография.',
          mediaType: 'files',
          icons: [
            'images/commercial/vector/DESIGN.svg',
            'images/commercial/vector/DESIGN1.svg',
            'images/commercial/vector/DESIGN2.svg'
          ]
        },
        {
          id: 'Business',
          title: 'Event',
          subtitle: 'Бизнес',
          description: 'Проведение концертов, мероприятий, выставок, клиентских дней, конгрессов и форумов. Рекламные активации на фестивалях, турах, гибридные offline2online проекты. PR поддержка и анонсирование. Подбор спикеров.',
          mediaType: 'comm',
          icons: [
              'images/commercial/vector/EVENT1.svg',
              'images/commercial/vector/EVENT.svg'
          ]
        }
      ]
    },
    {
      id: 'second', 
      title: 'Авторам',
      subtitle: '',
      description: '',
      className: 'second',
      bgUrl: 'images/commercial/image/Author.jpg',
      modalScreens: [
        {
          id: 'creation',
          title: 'Поддержка в Упаковке',
          subtitle: 'Продажа Контента',
          description: 'Постпродакшен и монтаж, guest и location - менеджмент, корректировка рамок brand safety, привлечение рекламного финансирования от брендов. Дистрибуция видео продукта, рост монетизации.',
          mediaType: 'books',
          icons: [
            'images/commercial/vector/PACKAGE.svg',
          ]
        },
        {
          id: 'monetization',
          title: 'Финансирование',
          subtitle: 'Продюсирование Контента',
          description: 'Оценка проектов на ранних стадиях или на уровне идей, финансирование и реализация производства, исполнительное продюсирование. Корректировка концептов, сценарная, режиссерская и операторская поддержка.',
          mediaType: 'bars',
          icons: [
            'images/commercial/vector/FINANCE1.svg',
            'images/commercial/vector/FINANCE.svg',
          ]
        },
        {
          id: 'audience',
          title: 'TALENT MANAGEMENT',
          subtitle: 'PR ПОДДЕРЖКА',
          description: 'Поиск и реализация концепции присутствия в медиа, развитие и расширение присутствия, репутационный менеджмент, концертная деятельность. Полная поддержка творчества, включающая в себя все возможные опции.',
          mediaType: 'files',
          icons: [
            'images/commercial/vector/SUPPORT.svg',
            'images/commercial/vector/SUPPORT1.svg',
            'images/commercial/vector/SUPPORT2.svg'
          ]
        },
        {
          id: 'rights',
          title: 'Бухгалтерское',
          subtitle: 'Юридическое Консультирование',
          description: 'Закрытие финансовых и юридических вопросов, поддержка в планировании и выравнивании трудовой деятельности, снятие кредиторской и дебиторской нагрузки. Полноценный бэк-офис на аутсорсе.',
          mediaType: 'files',
          icons: [
            'images/commercial/vector/file_1.png',
            'images/commercial/vector/file_2.png',
            'images/commercial/vector/file_3.png',
            'images/commercial/vector/file_4.png',
          ]
        },
        {
          id: 'rights',
          title: 'Сценарная',
          subtitle: 'Мастерская',
          description: 'Создание сценариев для авторских шоу, кино и сериалов. Написание текстов выступлений, шуток и дополнительных линий в контенте. Создание и сопровождение каналов, сообществ и групп.',
          mediaType: 'files',
          icons: [
            'images/commercial/vector/SCENARIO.svg',
            'images/commercial/vector/SCENARIO1.svg'
          ]
        }
      ]
    },
    {
      id: 'third',
      title: 'В космос',
      subtitle: '',
      description: '',
      className: 'third',
      bgUrl: '/images/Cosmos.jpg',
      modalScreens: [
        {
          id: 'mystery',
          title: 'Тайны',
          subtitle: 'Вселенной',
          description: 'Исследуйте скрытые возможности платформы. Экспериментальные функции, бета-тестирование, эксклюзивный контент.',
          mediaType: 'logo',
          icons: ['images/commercial/vector/bar_1.png']
        },
        {
          id: 'creative',
          title: 'Творческие',
          subtitle: 'Эксперименты',
          description: 'Пространство для смелых идей и нестандартных решений. Инструменты для создания уникального и запоминающегося контента.',
          mediaType: 'files',
          icons: [
            'images/commercial/vector/file_1.png',
            'images/commercial/vector/file_2.png',
            'images/commercial/vector/file_3.png',
            'images/commercial/vector/file_4.png',
          ]
        },
        {
          id: 'innovation',
          title: 'Инновации',
          subtitle: 'Будущего',
          description: 'Будьте в курсе последних технологических трендов. AI-инструменты, машинное обучение, новые форматы взаимодействия.',
          mediaType: 'bars',
          icons: [
            'images/commercial/vector/bar_axis.png',
          ]
        }
      ]
    }
  ];

  // Commercial component properties
  private sectionElements!: NodeListOf<HTMLElement>;
  private imageElements!: NodeListOf<HTMLElement>;
  private headingElements!: NodeListOf<HTMLElement>;
  private outerWrapperElements!: NodeListOf<HTMLElement>;
  private innerWrapperElements!: NodeListOf<HTMLElement>;
  public currentIndex: number = -1;
  private animating: boolean = false;
  private lastTap: number = 0;

  // Modal component properties
  currentModalIndex: number = 0;
  isModalOpen: boolean = false;
  isRevealed: boolean = false;
  currentSectionIndex: number = 0;

  private audioPlayer?: HTMLAudioElement;

  constructor(private cdr: ChangeDetectorRef, private ngZone: NgZone, private router: Router, private transitionService: TransitionService ) {}

  private wheelHandler = (event: WheelEvent): void => {
    if (event.deltaY < 0 && !this.animating) {
      this.gotoSection(this.currentIndex - 1, -1);
    } else if (event.deltaY > 0 && !this.animating) {
      this.gotoSection(this.currentIndex + 1, 1);
    }
  };

  private touchEndHandler = (event: TouchEvent): void => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - this.lastTap;
    if (tapLength < 500 && tapLength > 0) {
      this.gotoSection(this.currentIndex + 1, 1);
      event.preventDefault();
    }
    this.lastTap = currentTime;
  };

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (!this.isModalOpen) return;

    switch (event.key) {
      case 'ArrowLeft':
        this.prevModalScreen();
        break;
      case 'ArrowUp':
        this.openModal();
        break;
      case 'ArrowRight':
        this.nextModalScreen();
        break;
      case 'ArrowDown':
        this.closeModal();
        break;
      case 'Escape':
        this.closeModal();
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  ngAfterViewInit(): void {
    // --- Аудио ---
    this.audioPlayer = new Audio('/images/advertisers/audio/commercial.mp3');
    this.audioPlayer.loop = true;
    this.audioPlayer.volume = 0.4;
    this.audioPlayer.play().catch(() => {});
    // ---
    this.initializeElements();
    this.setupEventListeners();
    this.initializeGsap();
    this.setupTitleHoverAnimations();
    this.setupTitleClickHandlers();
    setTimeout(() => {
      this.gotoSection(0, 1);
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer.currentTime = 0;
      this.audioPlayer = undefined;
    }
    window.removeEventListener('wheel', this.wheelHandler);
    document.removeEventListener('touchend', this.touchEndHandler);
  }

  private initializeElements(): void {
    this.sectionElements = document.querySelectorAll('.section');
    this.imageElements = document.querySelectorAll('.background');
    this.headingElements = document.querySelectorAll('.section-title');
    this.outerWrapperElements = document.querySelectorAll('.wrapper-outer');
    this.innerWrapperElements = document.querySelectorAll('.wrapper-inner');
  }

  private initializeGsap(): void {
    gsap.set(this.outerWrapperElements, { yPercent: 100 });
    gsap.set(this.innerWrapperElements, { yPercent: -100 });
  }

  private setupEventListeners(): void {
    window.addEventListener('wheel', (event) => {
      this.ngZone.run(() => this.wheelHandler(event));
    });
    document.addEventListener('touchend', (event) => {
      this.ngZone.run(() => this.touchEndHandler(event));
    });

    document.querySelectorAll('nav a').forEach((anchor: Element) => {
      anchor.addEventListener('click', (e: Event) => {
        this.ngZone.run(() => {
          e.preventDefault();
          const target = e.currentTarget as HTMLAnchorElement;
          const href = target.getAttribute('href');
          if (href) {
            this.navigateSectionById(href.slice(1));
          }
        });
      });
    });
  }

  private setupTitleHoverAnimations(): void {
    this.headingElements.forEach((heading: HTMLElement) => {
      this.splitTextIntoChars(heading);
      
      heading.addEventListener('mouseenter', () => this.animateTitleHover(heading, true));
      heading.addEventListener('mouseleave', () => this.animateTitleHover(heading, false));
    });
  }

  private setupTitleClickHandlers(): void {
    this.headingElements.forEach((heading: HTMLElement, index: number) => {
      heading.addEventListener('click', () => {
        // Проверяем, что это секция "В космос"
        const section = this.sections[index];
        if (section && section.id === 'third') {
          this.transitionService.goWithSmoke('/flight');
          return;
        }
        this.currentSectionIndex = index;
        this.currentModalIndex = 0;
        this.openModal();
      });
      // Add cursor pointer style
      heading.style.cursor = 'pointer';
    });
  }

  private splitTextIntoChars(element: HTMLElement): void {
    const text = element.textContent || '';
    element.innerHTML = '';
    
    [...text].forEach((char: string) => {
      const span = document.createElement('span');
      span.textContent = char === ' ' ? '\u00A0' : char;
      span.style.display = 'inline-block';
      span.style.transformOrigin = 'center bottom';
      element.appendChild(span);
    });
  }

  private animateTitleHover(heading: HTMLElement, isHover: boolean): void {
    const chars = heading.querySelectorAll('span');
    
    if (isHover) {
      gsap.to(chars, {
        scale: 1.2,
        y: -10,
        rotation: () => gsap.utils.random(-5, 5),
        transformOrigin: "center bottom",
        duration: 0.6,
        ease: "elastic.out(1, 0.5)",
        stagger: {
          amount: 0.3,
          from: "random",
          ease: "power2.inOut"
        }
      });
      
      gsap.to(chars, {
        y: "+=5",
        duration: 2,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        stagger: {
          amount: 0.4,
          from: "random"
        }
      });
      
    } else {
      gsap.killTweensOf(chars);
      gsap.to(chars, {
        scale: 1,
        y: 0,
        rotation: 0,
        duration: 0.4,
        ease: "back.out(1.7)",
        stagger: {
          amount: 0.2,
          from: "end"
        }
      });
    }
  }

  private wrap(index: number, max: number): number {
    return (index + max) % max;
  }

  private gotoSection(index: number, direction: number): void {
    index = this.wrap(index, this.sectionElements.length);
    this.animating = true;

    const fromTop = direction === -1;
    const dFactor = fromTop ? -1 : 1;
    const tl = gsap.timeline({
      defaults: { duration: 1.25, ease: 'power1.inOut' },
      onComplete: () => {
        this.animating = false;
      }
    });

    if (this.currentIndex >= 0) {
      gsap.set(this.sectionElements[this.currentIndex], { zIndex: 0 });
      tl.to(this.imageElements[this.currentIndex], { yPercent: -15 * dFactor })
        .set(this.sectionElements[this.currentIndex], { autoAlpha: 0 });
    }

    gsap.set(this.sectionElements[index], { autoAlpha: 1, zIndex: 1 });
    tl.fromTo(
      [this.outerWrapperElements[index], this.innerWrapperElements[index]],
      { yPercent: (i: number) => (i ? -100 * dFactor : 100 * dFactor) },
      { yPercent: 0 },
      0
    )
    .fromTo(this.imageElements[index], { yPercent: 15 * dFactor }, { yPercent: 0 }, 0)
    .fromTo(
      this.headingElements[index],
      { autoAlpha: 0, yPercent: 150 * dFactor },
      {
        autoAlpha: 1,
        yPercent: 0,
        duration: 1,
        ease: 'power2',
        stagger: { each: 0.02, from: 'random' }
      },
      0.2
    );

    this.currentIndex = index;
  }

  private navigateSectionById(id: string): void {
    const index = Array.from(this.sectionElements).findIndex(
      (section: HTMLElement) => section.id === id
    );

    if (index !== -1 && index !== this.currentIndex) {
      this.gotoSection(index, index > this.currentIndex ? 1 : -1);
    }
  }

  public onNavClick(event: Event, sectionId: string): void {
    event.preventDefault();
    if (sectionId === 'four') {
      this.router.navigate(['/cosmos']);
      return;
    }
    this.navigateSectionById(sectionId);
  }

  // Modal methods
  get maxModalIndex(): number {
    return this.currentModalScreens.length - 1;
  }

  get isFirstModalScreen(): boolean {
    return this.currentModalIndex === 0;
  }

  get isLastModalScreen(): boolean {
    return this.currentModalIndex === this.maxModalIndex;
  }

  get currentModalScreen(): WalkthroughScreen {
    return this.currentModalScreens[this.currentModalIndex];
  }

  get currentModalScreens(): WalkthroughScreen[] {
    return this.sections[this.currentSectionIndex]?.modalScreens || [];
  }

  nextModalScreen(): void {
    if (this.currentModalIndex < this.maxModalIndex) {
      this.currentModalIndex++;
    }
  }

  prevModalScreen(): void {
    if (this.currentModalIndex > 0) {
      this.currentModalIndex--;
    }
  }

  goToModalScreen(index: number): void {
    if (index >= 0 && index <= this.maxModalIndex) {
      this.currentModalIndex = index;
    }
  }

  openModal(): void {
    this.isModalOpen = true;
    setTimeout(() => {
      this.isRevealed = true;
      this.cdr.detectChanges();
    }, 50);
  }

  closeModal(): void {
    this.isRevealed = false;
    setTimeout(() => {
      this.isModalOpen = false;
      this.currentModalIndex = 0;
      this.cdr.detectChanges();
    }, 400);
  }

  onFinishModal(): void {
    this.closeModal();
  }

  trackByScreenId(index: number, screen: WalkthroughScreen): string {
    return screen.id;
  }

  trackByIndex(index: number): number {
    return index;
  }

  public get todayEarthDate(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd}`;
  }
}