import { Component, computed, OnInit, OnDestroy, ChangeDetectionStrategy, signal, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Animal, NavigationItem, SliderConfig, SliderState } from '../shared/interface/help-interface';
import * as THREE from 'three';
import { Router } from '@angular/router';
import { TransitionService } from '../../shaders/service/transition.service';

class DisplacementSlider {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private material!: THREE.ShaderMaterial;
  private mesh!: THREE.Mesh;
  private textures: THREE.Texture[] = [];
  private currentIndex = 0;
  private isAnimating = false;
  private animationFrameId: number | null = null;

  private vertex = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `;

  private fragment = `
    varying vec2 vUv;
    uniform sampler2D currentImage;
    uniform sampler2D nextImage;
    uniform float dispFactor;

    void main() {
      vec2 uv = vUv;
      vec4 _currentImage;
      vec4 _nextImage;
      float intensity = 0.3;

      vec4 orig1 = texture2D(currentImage, uv);
      vec4 orig2 = texture2D(nextImage, uv);
      
      _currentImage = texture2D(currentImage, vec2(uv.x, uv.y + dispFactor * (orig2 * intensity)));
      _nextImage = texture2D(nextImage, vec2(uv.x, uv.y + (1.0 - dispFactor) * (orig1 * intensity)));

      vec4 finalTexture = mix(_currentImage, _nextImage, dispFactor);
      gl_FragColor = finalTexture;
    }
  `;

  constructor(
    private container: HTMLElement, 
    private images: string[], 
    private router: Router,
  ) {
    this.init();
  }

  private async init(): Promise<void> {
    await this.setupRenderer();
    await this.loadTextures();
    this.setupScene();
    this.animate();
  }

  private async setupRenderer(): Promise<void> {
    const width = this.container.offsetWidth;
    const height = this.container.offsetHeight;

    this.renderer = new THREE.WebGLRenderer({ antialias: false });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x23272A, 1.0);
    this.renderer.setSize(width, height);
    
    this.container.appendChild(this.renderer.domElement);
  }

  private async loadTextures(): Promise<void> {
    const loader = new THREE.TextureLoader();
    
    const loadPromises = this.images.map(src => {
      return new Promise<THREE.Texture>((resolve, reject) => {
        loader.load(
          src + '?v=' + Date.now(),
          (texture) => {
            texture.magFilter = texture.minFilter = THREE.LinearFilter;
            texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
            resolve(texture);
          },
          undefined,
          reject
        );
      });
    });

    this.textures = await Promise.all(loadPromises);
  }

  private setupScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x23272A);

    const width = this.container.offsetWidth;
    const height = this.container.offsetHeight;

    this.camera = new THREE.OrthographicCamera(
      width / -2, width / 2,
      height / 2, height / -2,
      1, 1000
    );
    this.camera.position.z = 1;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        dispFactor: { value: 0.0 },
        currentImage: { value: this.textures[0] },
        nextImage: { value: this.textures[1] || this.textures[0] },
      },
      vertexShader: this.vertex,
      fragmentShader: this.fragment,
      transparent: true,
      opacity: 1.0
    });

    const geometry = new THREE.PlaneGeometry(width, height);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.set(0, 0, 0);
    this.scene.add(this.mesh);
  }

  public async transitionTo(index: number): Promise<void> {
    if (this.isAnimating || index === this.currentIndex || !this.textures[index]) {
      return Promise.resolve();
    }

    this.isAnimating = true;
    this.material.uniforms['nextImage'].value = this.textures[index];
    // this.material.uniforms['nextImage'].needsUpdate = true;

    return new Promise((resolve) => {
      const startTime = Date.now();
      const duration = 2000; // 3 second

      const animateTransition = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Exponential easing
        const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2.0, -10 * progress);
        
        this.material.uniforms['dispFactor'].value = easeProgress;

        if (progress < 1) {
          requestAnimationFrame(animateTransition);
        } else {
          this.material.uniforms['currentImage'].value = this.textures[index];
          // this.material.uniforms['currentImage'].needsUpdate = true;
          this.material.uniforms['dispFactor'].value = 0.0;
          this.currentIndex = index;
          this.isAnimating = false;
          resolve();
        }
      };

      requestAnimationFrame(animateTransition);
    });
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  public stopAnimation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public resize(): void {
    if (!this.camera || !this.renderer) return;

    const width = this.container.offsetWidth;
    const height = this.container.offsetHeight;
    
    this.renderer.setSize(width, height);
    this.camera.left = width / -2;
    this.camera.right = width / 2;
    this.camera.top = height / 2;
    this.camera.bottom = height / -2;
    this.camera.updateProjectionMatrix();
  }

  public dispose(): void {
    console.log('Disposing DisplacementSlider...');
    this.stopAnimation();
    this.renderer.dispose();
    this.material.dispose();
    this.mesh?.geometry?.dispose();
    this.textures.forEach(texture => texture.dispose());
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
    const gl = this.renderer?.getContext();
    if (gl) {
      console.log('Losing WebGL context...');
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    this.renderer = null as any;
    this.scene = null as any;
    this.camera = null as any;
    this.material = null as any;
    this.mesh = null as any;
    this.textures = [];
    console.log('DisplacementSlider disposed');
  }

  public getIsAnimating(): boolean {
    return this.isAnimating;
  }
}

@Component({
  selector: 'app-help-page',
  imports: [CommonModule],
  templateUrl: './help-page.html',
  styleUrl: './help-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HelpPage implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('sliderContainer', { static: true }) sliderContainer!: ElementRef<HTMLElement>;
  @ViewChild('slideTitle', { static: true }) slideTitle!: ElementRef<HTMLElement>;
  @ViewChild('slideStatus', { static: true }) slideStatus!: ElementRef<HTMLElement>;
  @ViewChild('slideDescription', { static: true }) slideDescription!: ElementRef<HTMLElement>;

  private autoSlideInterval?: number;
  private displacementSlider?: DisplacementSlider;
  private resizeObserver?: ResizeObserver;
  
  // Signals for reactive state management
  private currentSlideIndex = signal<number>(0);
  public isAnimating = signal<boolean>(false);
  public isLoading = signal<boolean>(true);
  public isReturnBtnVisible = signal<boolean>(false);
  public isReturnBtnHiding = signal<boolean>(false);

  // Configuration
  private readonly config: SliderConfig = {
    autoSlide: false,
    autoSlideInterval: 5000,
    animationDuration: 600
  };

  // Data
  readonly animals: Animal[] = [
    {
      id: 0,
      name: 'Для Авторов Контента',
      description: 'Помогаем реализовываться на территориях роста, выпускать новый контент и разрабатывать новые проекты, привлекать финансирование и лучшие ресурсы, дистрибутировать видео продукт',
      status: "• Социальные сети • Онлайн кинотеатры\n• Оффлайн проекты • Телеканалы",
      imageUrl: '/images/help/bg-help-1.jpg'
    },
    {
      id: 1,
      name: 'Для Рекламодателей',
      description: 'Помогаем рекламодателям свободно и спокойно чувствовать себя среди обладателей медийного и социального капитала, работать с лучшими кадрами, технологиями, решениями, опытом и знаниями',
      status: '• Оффлайн проекты • Онлайн кинотеатры\n• Телеканалы • Социальные сети',
      imageUrl: '/images/help/bg-help-2.jpg'
    },
    {
      id: 2,
      name: 'Для Партнёров',
      description: 'Помогаем находить, структурировать и продавать востребованные грани продукта, из идей формировать решения, ускорять развитие бизнеса',
      status: '• Социальные сети • Онлайн кинотеатры\n• Телеканалы • Оффлайн проекты',
      imageUrl: '/images/help/bg-help-4.jpg'
    },
    {
      id: 3,
      name: 'Вернуться в Космос',
      description: '',
      status: '\n',
      imageUrl: '/images/help/bg-help-3.jpg'
    },
  ];

  // Computed values
  readonly currentSlide = computed(() => this.currentSlideIndex());
  readonly currentAnimal = computed(() => this.animals[this.currentSlideIndex()]);
  readonly totalSlides = computed(() => this.animals.length);
  readonly sliderState = computed<SliderState>(() => ({
    currentSlide: this.currentSlideIndex(),
    totalSlides: this.animals.length,
    isAnimating: this.isAnimating()
  }));

  readonly navigationItems = computed<NavigationItem[]>(() => 
    this.animals.map((_, index) => ({
      index,
      isActive: index === this.currentSlideIndex()
    }))
  );

  private audioPlayer?: HTMLAudioElement;
  private slideAudioPlayer?: HTMLAudioElement; // Для звука листания

  constructor(
    private router: Router,
    private transitionService: TransitionService
  ) {}

  ngOnInit(): void {
    this.initializeSlider();
    this.startAutoSlide();
    if (this.currentSlideIndex() === this.animals.length - 1) {
      setTimeout(() => {
        this.isReturnBtnVisible.set(true);
        setTimeout(() => {
          this.isReturnBtnHiding.set(false);
        }, 20);
      }, 100);
    }
    // Воспроизведение аудио при запуске компонента
    this.audioPlayer = new Audio('/images/advertisers/audio/help.mp3');
    this.audioPlayer.autoplay = true;
    this.audioPlayer.loop = false;
    this.audioPlayer.volume = 0.5;
    this.audioPlayer.play().catch(() => {}); // Игнорируем ошибку автозапуска
    // Инициализация аудио для листания
    this.slideAudioPlayer = new Audio('/images/advertisers/audio/preloader-2s.mp3');
    this.slideAudioPlayer.volume = 0.2;
    this.slideAudioPlayer.preload = 'auto';
  }

  ngAfterViewInit(): void {
    this.initializeWebGL();
    this.setupResizeObserver();
  }

  ngOnDestroy(): void {
    this.stopAutoSlide();
    this.displacementSlider?.stopAnimation(); // Останавливаем анимацию
    this.displacementSlider?.dispose();
    this.resizeObserver?.disconnect();
    // Останавливаем и удаляем аудио
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer.src = '';
      this.audioPlayer.load();
      this.audioPlayer = undefined;
    }
    // Останавливаем и удаляем аудио для листания
    if (this.slideAudioPlayer) {
      this.slideAudioPlayer.pause();
      this.slideAudioPlayer.src = '';
      this.slideAudioPlayer.load();
      this.slideAudioPlayer = undefined;
    }
  }

  private initializeSlider(): void {
    // Simulate loading time
    setTimeout(() => {
      this.isLoading.set(false);
      document.body.classList.remove('loading');
    }, 3000);
  }

  private async initializeWebGL(): Promise<void> {
    const imageUrls = this.animals.map(animal => animal.imageUrl);
    this.displacementSlider = new DisplacementSlider(
      this.sliderContainer.nativeElement,
      imageUrls,
      this.router,
    );
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.displacementSlider?.resize();
    });
    this.resizeObserver.observe(this.sliderContainer.nativeElement);
  }

  private startAutoSlide(): void {
    if (this.config.autoSlide) {
      this.autoSlideInterval = window.setInterval(() => {
        this.nextSlide();
      }, this.config.autoSlideInterval);
    }
  }

  private stopAutoSlide(): void {
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
      this.autoSlideInterval = undefined;
    }
  }

  onSlideClick(index: number): void {
    if (index === this.currentSlideIndex() || this.isAnimating()) {
      return;
    }
    
    this.goToSlide(index);
  }

  nextSlide(): void {
    if (this.isAnimating()) return;
    
    const nextIndex = (this.currentSlideIndex() + 1) % this.animals.length;
    this.goToSlide(nextIndex);
  }

  prevSlide(): void {
    if (this.isAnimating()) return;
    
    const prevIndex = this.currentSlideIndex() === 0 
      ? this.animals.length - 1 
      : this.currentSlideIndex() - 1;
    this.goToSlide(prevIndex);
  }

  private async goToSlide(index: number): Promise<void> {
    if (index < 0 || index >= this.animals.length || index === this.currentSlideIndex()) {
      return;
    }

    // Воспроизведение звука листания
    if (this.slideAudioPlayer) {
      try {
        this.slideAudioPlayer.currentTime = 0;
        await this.slideAudioPlayer.play();
      } catch (e) {
        // Игнорируем ошибку (например, если автозапуск запрещён)
      }
    }

    if (this.currentSlideIndex() === this.animals.length - 1) {
      await this.animateReturnBtnHide();
    }

    this.isAnimating.set(true);

    const webglPromise = this.displacementSlider?.transitionTo(index) || Promise.resolve();
    const textPromise = this.animateText(index);

    await Promise.all([webglPromise, textPromise]);

    this.currentSlideIndex.set(index);
    this.isAnimating.set(false);

    if (index === this.animals.length - 1) {
      setTimeout(() => {
        this.isReturnBtnVisible.set(true);
        setTimeout(() => {
          this.isReturnBtnHiding.set(false);
        }, 20);
      }, 100);
    } else {
      this.isReturnBtnVisible.set(false);
      this.isReturnBtnHiding.set(false);
    }

    if (this.config.autoSlide) {
      this.stopAutoSlide();
      this.startAutoSlide();
    }
  }

  private animateReturnBtnHide(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isReturnBtnVisible()) {
        resolve();
        return;
      }
      this.isReturnBtnHiding.set(true);
      setTimeout(() => {
        this.isReturnBtnVisible.set(false);
        this.isReturnBtnHiding.set(false);
        resolve();
      }, 350);
    });
  }

  private async animateText(index: number): Promise<void> {
    const titleEl = this.slideTitle.nativeElement;
    const statusEl = this.slideStatus.nativeElement;
    const descriptionEl = this.slideDescription.nativeElement;
    const newAnimal = this.animals[index];
  
    // Создаем более плавные easing функции
    const easeOut = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    const easeIn = 'cubic-bezier(0.55, 0.055, 0.675, 0.19)';
    const easeInOut = 'cubic-bezier(0.645, 0.045, 0.355, 1)';
    const bounceOut = 'cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  
    // Анимируем исчезновение с stagger эффектом
    const fadeOutAnimations = [
      // Заголовок - исчезает первым с поворотом
      titleEl.animate([
        { 
          opacity: 1, 
          transform: 'translateY(0px) scale(1) rotateX(0deg)',
          filter: 'blur(0px)'
        },
        { 
          opacity: 0, 
          transform: 'translateY(-30px) scale(0.9) rotateX(-10deg)',
          filter: 'blur(2px)'
        }
      ], {
        duration: 800,
        easing: easeIn,
        fill: 'forwards'
      }),
      
      // Описание - исчезает вторым, движется влево
      descriptionEl.animate([
        { 
          opacity: 1, 
          transform: 'translateX(0px) scale(1)',
          filter: 'blur(0px)'
        },
        { 
          opacity: 0, 
          transform: 'translateX(-50px) scale(0.95)',
          filter: 'blur(1px)'
        }
      ], {
        duration: 700,
        delay: 100,
        easing: easeIn,
        fill: 'forwards'
      }),
  
      // Статус - исчезает последним, движется вправо
      statusEl.animate([
        { 
          opacity: 1, 
          transform: 'translateX(0px) scale(1)',
          filter: 'blur(0px)'
        },
        { 
          opacity: 0, 
          transform: 'translateX(50px) scale(0.95)',
          filter: 'blur(1px)'
        }
      ], {
        duration: 600,
        delay: 200,
        easing: easeIn,
        fill: 'forwards'
      })
    ];
  
    // Ждем завершения анимации исчезновения
    await Promise.all(fadeOutAnimations.map(anim => anim.finished));
  
    // Небольшая пауза перед появлением нового контента
    await new Promise(resolve => setTimeout(resolve, 150));
  
    // Обновляем контент
    titleEl.innerHTML = newAnimal.name;
    statusEl.textContent = newAnimal.status;
    descriptionEl.textContent = newAnimal.description;
  
    // Анимируем появление с разными эффектами
    const fadeInAnimations = [
      // Заголовок появляется с bounce эффектом
      titleEl.animate([
        { 
          opacity: 0, 
          transform: 'translateX(60px) scale(0.9)',
          filter: 'blur(2px)'
        },
        { 
          opacity: 1, 
          transform: 'translateX(0px) scale(1)',
          filter: 'blur(0px)'
        }
      ], {
        duration: 1000,
        delay: 200,
        easing: easeOut,
        fill: 'forwards'
      }),
  
      // Описание появляется плавно справа
      descriptionEl.animate([
        { 
          opacity: 0, 
          transform: 'translateX(60px) scale(0.9)',
          filter: 'blur(2px)'
        },
        { 
          opacity: 1, 
          transform: 'translateX(0px) scale(1)',
          filter: 'blur(0px)'
        }
      ], {
        duration: 1000,
        delay: 200,
        easing: easeOut,
        fill: 'forwards'
      }),
  
      // Статус появляется последним с легким поворотом
      statusEl.animate([
        { 
          opacity: 0, 
          transform: 'translateY(30px) scale(0.9) rotateZ(-2deg)',
          filter: 'blur(1px)'
        },
        { 
          opacity: 1, 
          transform: 'translateY(0px) scale(1) rotateZ(0deg)',
          filter: 'blur(0px)'
        }
      ], {
        duration: 900,
        delay: 400,
        easing: easeInOut,
        fill: 'forwards'
      })
    ];
  
    // Ждем завершения анимации появления
    await Promise.all(fadeInAnimations.map(anim => anim.finished));
  
    // Дополнительный subtle эффект "дыхания" для заголовка
    this.addSubtleBreathingEffect(titleEl);
  }

  private addSubtleBreathingEffect(element: HTMLElement): void {
    const breathingAnimation = element.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(1.005)' },
      { transform: 'scale(1)' }
    ], {
      duration: 4000,
      iterations: Infinity,
      easing: 'ease-in-out'
    });
  
    // Останавливаем дыхание при следующей анимации
    setTimeout(() => {
      breathingAnimation.cancel();
    }, 3000);
  }
  
  // Дополнительный метод для создания particle эффекта (опционально)
  private createParticleEffect(element: HTMLElement): void {
    const particles = [];
    const particleCount = 6;
  
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.style.cssText = `
        position: absolute;
        width: 3px;
        height: 3px;
        background: rgba(255, 255, 255, 0.6);
        border-radius: 50%;
        pointer-events: none;
        z-index: 1000;
      `;
  
      const rect = element.getBoundingClientRect();
      particle.style.left = `${rect.left + Math.random() * rect.width}px`;
      particle.style.top = `${rect.top + Math.random() * rect.height}px`;
      
      document.body.appendChild(particle);
      particles.push(particle);
  
      // Анимируем частицу
      particle.animate([
        { 
          opacity: 0,
          transform: 'scale(0) translateY(0px)',
        },
        { 
          opacity: 1,
          transform: 'scale(1) translateY(-20px)',
        },
        { 
          opacity: 0,
          transform: 'scale(0) translateY(-40px)',
        }
      ], {
        duration: 1500 + Math.random() * 1000,
        easing: 'ease-out',
        delay: Math.random() * 500
      }).finished.then(() => {
        particle.remove();
      });
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        this.prevSlide();
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.nextSlide();
        break;
      case 'Home':
        event.preventDefault();
        this.goToSlide(0);
        break;
      case 'End':
        event.preventDefault();
        this.goToSlide(this.animals.length - 1);
        break;
    }
  }

  trackByAnimalId(index: number, animal: Animal): number {
    return animal.id;
  }

  trackByIndex(index: number): number {
    return index;
  }

  onWheel(event: WheelEvent): void {
    if (this.isAnimating()) return;

    if (event.deltaY > 0) {
      // Прокрутка вниз — следующий слайд
      this.nextSlide();
    } else if (event.deltaY < 0) {
      // Прокрутка вверх — предыдущий слайд
      this.prevSlide();
    }
  }

  public goToAdvertisers(): void {
    this.transitionService.goWithSmoke('/flight');
  }

  public get marsTime(): string {
    // 1. Получаем текущее время в UTC (секунды с 1970-01-01)
    const now = new Date();
    const unixTime = now.getTime() / 1000;
    // 2. Юлианская дата (JD)
    const JD_UTC = unixTime / 86400 + 2440587.5;
    // 3. Юлианская дата TT (прибл. +69.184/86400 дней)
    const JD_TT = JD_UTC + (69.184 / 86400);
    // 4. Марсианская солнечная дата (MSD)
    const MSD = (JD_TT - 2405522.0028779) / 1.0274912517;
    // 5. Марсианское координированное время (MTC, 0..24)
    const mtc = (24 * MSD) % 24;
    const hours = Math.floor(mtc).toString().padStart(2, '0');
    const minutes = Math.floor((mtc % 1) * 60).toString().padStart(2, '0');
    const seconds = Math.floor((((mtc % 1) * 60) % 1) * 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  public get marsDate(): string {
    // 1. Получаем текущее время в UTC (секунды с 1970-01-01)
    const now = new Date();
    const unixTime = now.getTime() / 1000;
    // 2. Юлианская дата (JD)
    const JD_UTC = unixTime / 86400 + 2440587.5;
    // 3. Юлианская дата TT (прибл. +69.184/86400 дней)
    const JD_TT = JD_UTC + (69.184 / 86400);
    // 4. Марсианская солнечная дата (MSD)
    const MSD = (JD_TT - 2405522.0028779) / 1.0274912517;
    // Марсианский год (начиная с 1955-04-11, Mars Year 1)
    // Один марсианский год ≈ 668.6 солов
    const marsYear1JD = 2435208.5; // 1955-04-11
    const marsYear1MSD = (marsYear1JD - 2405522.0028779) / 1.0274912517;
    const solsSinceYear1 = MSD - marsYear1MSD;
    const marsYear = Math.floor(solsSinceYear1 / 668.6) + 1;
    const solOfYear = Math.floor(solsSinceYear1 % 668.6) + 1;
    // Марсианский месяц (24 месяца по 28 солов, условно)
    const marsMonth = Math.floor((solOfYear - 1) / 28) + 1;
    const marsDay = ((solOfYear - 1) % 28) + 1;
    return `${marsDay.toString().padStart(2, '0')}.${marsMonth.toString().padStart(2, '0')}.${marsYear.toString().padStart(4, '0')}`;
  }
}