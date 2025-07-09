import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { Pane } from 'tweakpane';
import { Subject } from 'rxjs';
import gsap from 'gsap';
import SplitText from 'gsap/SplitText';
import { CustomEase } from 'gsap/CustomEase';

// Adding performance monitoring interface
interface PerformanceMonitor {
  fps: number;
  frameTime: number;
  lastFrame: number;
  frameCount: number;
  isLowPerformance: boolean;
}

// Adding quality settings interface
interface QualitySettings {
  textureSize: number;
  useSimpleShader: boolean;
  enableBlur: boolean;
  enableChromaticAberration: boolean;
  mouseSensitivity: number;
}

type DistortionParams = {
  strength: number;
  radius: number;
  size: number;
  edgeWidth: number;
  edgeOpacity: number;
  rimLightIntensity: number;
  rimLightWidth: number;
  chromaticAberration: number;
  reflectionIntensity: number;
  waveDistortion: number;
  waveSpeed: number;
  lensBlur: number;
  clearCenterSize: number;
  followMouse: boolean;
  animationSpeed: number;
  overallIntensity: number;
  preset: string;
};

@Injectable({
  providedIn: 'root'
})
export class AdvertisersService {
  private scene: THREE.Scene | null = null;
  private camera: THREE.OrthographicCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private controls: OrbitControls | null = null;
  private composer: EffectComposer | null = null;
  private customPass: ShaderPass | null = null;
  private backgroundTexture: THREE.Texture | null = null;
  private backgroundMesh: THREE.Mesh | null = null;
  private backgroundScene: THREE.Scene | null = null;
  private backgroundCamera: THREE.OrthographicCamera | null = null;
  private aspect: number = 1;
  private mousePosition: THREE.Vector2 = new THREE.Vector2(0.5, 0.5);
  private targetMousePosition: THREE.Vector2 = new THREE.Vector2(0.5, 0.5);
  private isMouseMoving: boolean = false;
  private mouseStopTimer: number = 0;
  private staticMousePosition: { x: number; y: number } = { x: 0.5, y: 0.5 };
  private performanceMonitor: PerformanceMonitor = {
    fps: 60,
    frameTime: 16.67,
    lastFrame: 0,
    frameCount: 0,
    isLowPerformance: false
  };
  private qualitySettings: QualitySettings = {
    textureSize: 1024,
    useSimpleShader: false,
    enableBlur: true,
    enableChromaticAberration: true,
    mouseSensitivity: 1.0
  };
  private cachedGeometry: THREE.PlaneGeometry | null = null;
  private lastAspectRatio: number = 0;
  private pane: Pane | null = null;
  private paneVisible: boolean = false;
  private paneInitialized: boolean = false;
  private isSceneReady: boolean = false;
  private isTextureLoaded: boolean = false;
  private isBackgroundPlaying: boolean = false;
  private startClickSound: HTMLAudioElement | null = null;
  private preloaderSound: HTMLAudioElement | null = null;
  private hoverSound: HTMLAudioElement | null = null;
  private backgroundMusic: HTMLAudioElement | null = null;
  private webglSupported: boolean = this.supportsWebGL();
  public error$ = new Subject<string>();
  public fps$ = new Subject<number>();
  private boundOnMouseMove: ((e: MouseEvent) => void) | null = null;
  private boundOnTouchMove: ((e: TouchEvent) => void) | null = null;
  private boundOnTouchStart: ((e: TouchEvent) => void) | null = null;

  private PARAMS: {
    distortion: DistortionParams;
    presets: { [key: string]: Omit<DistortionParams, 'preset' | 'followMouse' | 'animationSpeed' | 'overallIntensity'> };
  } = {
    distortion: {
      strength: 0.18,
      radius: 0.14,
      size: 1.2,
      edgeWidth: 0.19,
      edgeOpacity: 0.08,
      rimLightIntensity: 0.06,
      rimLightWidth: 0.02,
      chromaticAberration: 0,
      reflectionIntensity: 1,
      waveDistortion: 0.30,
      waveSpeed: 5,
      lensBlur: 0.50,
      clearCenterSize: 1,
      followMouse: true,
      animationSpeed: 1.5,
      overallIntensity: 2,
      preset: 'Classic Glass'
    },
    presets: {
      Minimal: {
        strength: 0.05,
        radius: 0.12,
        size: 0.8,
        edgeWidth: 0.02,
        edgeOpacity: 0.1,
        rimLightIntensity: 0.1,
        rimLightWidth: 0.04,
        chromaticAberration: 0.01,
        reflectionIntensity: 0.15,
        waveDistortion: 0.02,
        waveSpeed: 0.8,
        lensBlur: 0.05,
        clearCenterSize: 0.5
      },
      Subtle: {
        strength: 0.08,
        radius: 0.16,
        size: 0.9,
        edgeWidth: 0.03,
        edgeOpacity: 0.15,
        rimLightIntensity: 0.2,
        rimLightWidth: 0.06,
        chromaticAberration: 0.02,
        reflectionIntensity: 0.2,
        waveDistortion: 0.04,
        waveSpeed: 1,
        lensBlur: 0.08,
        clearCenterSize: 0.4
      },
      'Classic Glass': {
        strength: 0.12,
        radius: 0.18,
        size: 1,
        edgeWidth: 0.04,
        edgeOpacity: 0.25,
        rimLightIntensity: 0.3,
        rimLightWidth: 0.08,
        chromaticAberration: 0.025,
        reflectionIntensity: 0.35,
        waveDistortion: 0.03,
        waveSpeed: 0.5,
        lensBlur: 0.12,
        clearCenterSize: 0.2
      },
      Dramatic: {
        strength: 0.25,
        radius: 0.35,
        size: 1.2,
        edgeWidth: 0.08,
        edgeOpacity: 0.4,
        rimLightIntensity: 0.5,
        rimLightWidth: 0.1,
        chromaticAberration: 0.06,
        reflectionIntensity: 0.5,
        waveDistortion: 0.15,
        waveSpeed: 1.8,
        lensBlur: 0.25,
        clearCenterSize: 0.15
      },
      'Chromatic Focus': {
        strength: 0.1,
        radius: 0.22,
        size: 1,
        edgeWidth: 0.06,
        edgeOpacity: 0.3,
        rimLightIntensity: 0.25,
        rimLightWidth: 0.07,
        chromaticAberration: 0.08,
        reflectionIntensity: 0.2,
        waveDistortion: 0.05,
        waveSpeed: 0.8,
        lensBlur: 0.1,
        clearCenterSize: 0.25
      },
      'Liquid Wave': {
        strength: 0.18,
        radius: 0.28,
        size: 1.1,
        edgeWidth: 0.05,
        edgeOpacity: 0.2,
        rimLightIntensity: 0.4,
        rimLightWidth: 0.09,
        chromaticAberration: 0.04,
        reflectionIntensity: 0.4,
        waveDistortion: 0.2,
        waveSpeed: 2.5,
        lensBlur: 0.15,
        clearCenterSize: 0.1
      },
      Gigantic: {
        strength: 0.4,
        radius: 0.65,
        size: 1.8,
        edgeWidth: 0.12,
        edgeOpacity: 0.6,
        rimLightIntensity: 0.8,
        rimLightWidth: 0.15,
        chromaticAberration: 0.1,
        reflectionIntensity: 0.7,
        waveDistortion: 0.25,
        waveSpeed: 1.5,
        lensBlur: 0.35,
        clearCenterSize: 0.05
      }
    }
  };

  private supportsWebGL(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch {
      return false;
    }
  }

  init(canvas: HTMLCanvasElement): void {
    // Gaines
    this.setupAudio();
    this.setupKeyboardControls();
    if (!this.webglSupported) {
      this.showFallback();
      return;
    }
    this.waitForDependencies(canvas);
  }

  private waitForDependencies(canvas: HTMLCanvasElement): void {
    const check = setInterval(() => {
      if (gsap && SplitText) {
        clearInterval(check);
        this.initializeScene(canvas);
      }
    }, 100);
    setTimeout(() => {
      clearInterval(check);
      this.initializeScene(canvas);
    }, 10000);
  }

  private showFallback(): void {
    const fallback = document.getElementById('fallbackBg');
    if (fallback) {
      fallback.classList.add('active');
    }
    this.finishPreloader();
  }

  private setupAudio(): void {
    this.startClickSound = document.getElementById('startClickSound') as HTMLAudioElement;
    this.startClickSound = document.getElementById('startClickSound') as HTMLAudioElement;
    this.preloaderSound = document.getElementById('preloaderSound') as HTMLAudioElement;
    this.hoverSound = document.getElementById('hoverSound') as HTMLAudioElement;
    this.backgroundMusic = document.getElementById('backgroundMusic') as HTMLAudioElement;
  }

  onStartClick(): void {
    document.body.classList.add('loading-active');
    this.startClickSound?.play().catch(() => {});
    const audioEnable = document.querySelector('.audio-enable');
    if (audioEnable) {
      audioEnable.setAttribute('style', 'display: none');
    }
    const preloader = document.getElementById('preloader');
    if (preloader) {
      preloader.style.display = 'flex';
    }
    this.preloaderSound?.play().catch(() => {});
    setTimeout(() => {
      if (this.backgroundMusic) {
        this.backgroundMusic.volume = 0.3;
        this.backgroundMusic.play().catch(() => {});
        this.isBackgroundPlaying = true;
      }
    }, 500);
    this.webglSupported ? this.initializeScene(document.getElementById('canvas') as HTMLCanvasElement) : this.showFallback();
    this.startPreloader();
  }

  private startPreloader(): void {
    let counter = 0;
    const timer = setInterval(() => {
      const el = document.getElementById('counter');
      if (el) {
        el.textContent = `[${counter < 10 ? '00' : counter < 100 ? '0' : ''}${++counter}]`;
      }
      if (counter >= 100) {
        clearInterval(timer);
        setTimeout(() => {
          this.preloaderSound?.pause();
          if (this.preloaderSound) {
            this.preloaderSound.currentTime = 0;
          }
          this.finishPreloader();
        }, 200);
      }
    }, 30);
  }

  private finishPreloader(): void {
    const wait = () => {
      if ((this.isSceneReady && this.isTextureLoaded) || !this.webglSupported) {
        const preloader = document.getElementById('preloader');
        if (preloader) {
          preloader.classList.add('fade-out');
        }
        if (this.webglSupported) {
          const canvas = document.getElementById('canvas');
          if (canvas) {
            canvas.classList.add('ready');
          }
        }
        setTimeout(() => {
          document.body.classList.remove('loading-active');
          if (preloader) {
            preloader.style.display = 'none';
            preloader.classList.remove('fade-out');
          }
          this.animateTextElements();
        }, 800);
      } else {
        setTimeout(wait, 50);
      }
    };
    wait();
  }

  private animateTextElements(): void {
    if (!gsap || !SplitText) {
      this.fallbackTextAnimation();
      return;
    }

    gsap.registerPlugin(SplitText, CustomEase);
    const ease = CustomEase.create('customOut', '0.65,0.05,0.36,1') || 'power2.out';
    const containers = ['.description', '.division', '.signal', '.central-text', '.footer'];

    gsap.set([...containers, '.nav-links'], { opacity: 0 });

    const splits = containers.map(sel => new SplitText(sel, { type: 'lines', linesClass: 'line' }).lines);
    const [descLines, divLines, sigLines, centralLines, footerLines] = splits;

    gsap.set(containers, { opacity: 1 });
    gsap.set([...splits.flat(), '.nav-links a'], { opacity: 0, y: 30 });

    const tl = gsap.timeline();
    tl.to(descLines, { opacity: 1, y: 0, duration: 0.8, ease, stagger: 0.18 })
      .to('.nav-links', { opacity: 1, duration: 0.2 }, 0.12)
      .to('.nav-links a', { opacity: 1, y: 0, duration: 0.8, ease, stagger: 0.15 }, 0.12)
      .to(centralLines, { opacity: 1, y: 0, duration: 0.8, ease, stagger: 0.22 }, 0.25)
      .to(footerLines, { opacity: 1, y: 0, duration: 0.8, ease, stagger: 0.18 }, 0.4)
      .to(divLines, { opacity: 1, y: 0, duration: 0.8, ease, stagger: 0.18 }, 0.55)
      .to(sigLines, { opacity: 1, y: 0, duration: 0.8, ease, stagger: 0.18 }, 0.55);
  }

  private fallbackTextAnimation(): void {
    let delay = 0;
    document.querySelectorAll('.text-element').forEach(el => {
      const htmlEl = el as HTMLElement;
      setTimeout(() => {
        htmlEl.style.opacity = '1';
        htmlEl.style.transform = htmlEl.classList.contains('central-text') ? 'translateX(-50%) translateY(0)' : 'translateY(0)';
      }, delay);
      delay += 250;
    });
  }

  private initializeScene(canvas: HTMLCanvasElement): void {
    if (!this.webglSupported) {
      this.isSceneReady = this.isTextureLoaded = true;
      return;
    }

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.autoClear = false;

    this.aspect = window.innerWidth / window.innerHeight;

    this.backgroundScene = new THREE.Scene();
    this.backgroundCamera = new THREE.OrthographicCamera(-this.aspect, this.aspect, 1, -1, 0.1, 10);
    this.backgroundCamera.position.z = 1;

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-this.aspect, this.aspect, 1, -1, 0.1, 10);
    this.camera.position.z = 1;

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enabled = false;

    this.loadBackgroundTexture();
    this.setupPostProcessing();
    this.setupPane();
    this.setupNavHoverSounds();
    this.setupNavHoverSounds2();

    // Привязываем обработчики один раз
    if (!this.boundOnMouseMove) this.boundOnMouseMove = this.onMouseMove.bind(this);
    if (!this.boundOnTouchMove) this.boundOnTouchMove = this.onTouchMove.bind(this);
    if (!this.boundOnTouchStart) this.boundOnTouchStart = this.onTouchStart.bind(this);
    window.addEventListener('resize', this.onWindowResize.bind(this));
    document.addEventListener('mousemove', this.boundOnMouseMove);
    document.addEventListener('touchmove', this.boundOnTouchMove);
    document.addEventListener('touchstart', this.boundOnTouchStart);

    this.animate();
    this.isSceneReady = true;
  }

  private onMouseMove(e: MouseEvent): void {
    this.updateMousePosition(e);
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length) {
      this.onTouchMove(e);
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (this.PARAMS.distortion.followMouse && e.touches.length) {
      const touch = e.touches[0];
      const rect = this.renderer!.domElement.getBoundingClientRect();
      this.targetMousePosition.x = (touch.clientX - rect.left) / rect.width;
      this.targetMousePosition.y = 1.0 - (touch.clientY - rect.top) / rect.height;
      this.isMouseMoving = true;
      clearTimeout(this.mouseStopTimer);
      this.mouseStopTimer = window.setTimeout(() => {
        this.isMouseMoving = false;
      }, 100);
    }
  }

  private loadBackgroundTexture(): void {
    const video = document.createElement('video');
    video.src = '/images/advertisers/video-bg/image_bg.mp4';
    video.loop = true;
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.crossOrigin = 'anonymous';
    
    video.style.width = `${this.qualitySettings.textureSize}px`;
    video.style.height = `${this.qualitySettings.textureSize * 9/16}px`;

    if (!video.canPlayType('video/mp4')) {
      console.warn('MP4 format not supported');
      this.error$.next('Формат видео не поддерживается');
      return;
    }

    video.addEventListener('loadedmetadata', () => {
      this.detectDeviceCapabilities();
      
      const videoTexture = new THREE.VideoTexture(video);
      videoTexture.minFilter = THREE.LinearFilter;
      videoTexture.magFilter = THREE.LinearFilter;
      videoTexture.format = THREE.RGBFormat;
      videoTexture.generateMipmaps = false;
      videoTexture.flipY = false;

      this.backgroundTexture = videoTexture;
      this.createBackgroundMesh();
      this.isTextureLoaded = true;

      if (this.customPass) {
        this.customPass.uniforms['tDiffuse'].value = this.backgroundTexture;
      }

      video.play().catch(error => {
        console.error('Ошибка воспроизведения видео:', error);
        this.error$.next('Не удалось воспроизвести фоновое видео');
      });
    });

    video.addEventListener('error', (e) => {
      console.error('Ошибка загрузки видео:', e);
      this.isTextureLoaded = true;
      this.error$.next('Не удалось загрузить фоновое видео');
    });

    video.addEventListener('playing', () => {
      this.startPerformanceMonitoring();
    });

    video.load();
  }

  private createBackgroundMesh(): void {
    if (!this.backgroundTexture) {
      return;
    }

    if (this.backgroundMesh) {
      this.backgroundScene?.remove(this.backgroundMesh);
      this.backgroundMesh.geometry.dispose();
      (this.backgroundMesh.material as THREE.Material).dispose();
    }

    const video = (this.backgroundTexture as THREE.VideoTexture).image as HTMLVideoElement;
    const imgAspect = video.videoWidth / video.videoHeight;
    const scAspect = window.innerWidth / window.innerHeight;
    
    if (Math.abs(this.lastAspectRatio - scAspect) < 0.01 && this.cachedGeometry) {
      const material = new THREE.MeshBasicMaterial({ 
        map: this.backgroundTexture,
        transparent: false
      });
      this.backgroundMesh = new THREE.Mesh(this.cachedGeometry, material);
    } else {
      let sx: number, sy: number;

      if (scAspect > imgAspect) {
        sx = scAspect * 2;
        sy = sx / imgAspect;
      } else {
        sy = 2;
        sx = sy * imgAspect;
      }

      const geometry = new THREE.PlaneGeometry(sx, sy, 1, 1);
      const material = new THREE.MeshBasicMaterial({ 
        map: this.backgroundTexture,
        transparent: false
      });
      
      this.backgroundMesh = new THREE.Mesh(geometry, material);
      this.cachedGeometry = geometry;
      this.lastAspectRatio = scAspect;
    }
    
    this.backgroundScene?.add(this.backgroundMesh);
  }

  private setupPostProcessing(): void {
    if (!this.renderer || !this.backgroundScene || !this.backgroundCamera) {
      return;
    }
    this.setupDistortionPass();
  }

  private setupDistortionPass(): void {
    if (!this.renderer || !this.backgroundScene || !this.backgroundCamera) {
      return;
    }

    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.backgroundScene, this.backgroundCamera);
    this.composer.addPass(renderPass);

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = this.qualitySettings.useSimpleShader ? 
      this.getSimpleFragmentShader() : this.getAdvancedFragmentShader();

    this.customPass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: this.backgroundTexture || null },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uRadius: { value: this.PARAMS.distortion.radius },
        uSize: { value: this.PARAMS.distortion.size },
        uStrength: { value: this.PARAMS.distortion.strength },
        uEdgeWidth: { value: this.PARAMS.distortion.edgeWidth },
        uEdgeOpacity: { value: this.PARAMS.distortion.edgeOpacity },
        uRimLightIntensity: { value: this.PARAMS.distortion.rimLightIntensity },
        uRimLightWidth: { value: this.PARAMS.distortion.rimLightWidth },
        uChromaticAberration: { value: this.qualitySettings.enableChromaticAberration ? this.PARAMS.distortion.chromaticAberration : 0.0 },
        uReflectionIntensity: { value: this.PARAMS.distortion.reflectionIntensity },
        uWaveDistortion: { value: this.PARAMS.distortion.waveDistortion },
        uWaveSpeed: { value: this.PARAMS.distortion.waveSpeed },
        uLensBlur: { value: this.qualitySettings.enableBlur ? this.PARAMS.distortion.lensBlur : 0.0 },
        uClearCenterSize: { value: this.PARAMS.distortion.clearCenterSize },
        uOverallIntensity: { value: this.PARAMS.distortion.overallIntensity },
        uAspect: { value: this.aspect },
        uTime: { value: 0 },
        uQuality: { value: this.qualitySettings.useSimpleShader ? 0.0 : 1.0 }
      },
      vertexShader,
      fragmentShader
    });

    this.customPass.renderToScreen = true;
    if (this.backgroundTexture) {
      this.customPass.uniforms['tDiffuse'].value = this.backgroundTexture;
    }
    this.composer.addPass(this.customPass);
  }

  private getSimpleFragmentShader(): string {
    return `
      uniform sampler2D tDiffuse;
      uniform vec2 uMouse;
      uniform float uRadius;
      uniform float uSize;
      uniform float uStrength;
      uniform float uAspect;
      uniform float uOverallIntensity;
      varying vec2 vUv;

      void main() {
        vec2 c = uMouse;
        vec2 a = vUv;
        a.x *= uAspect;
        c.x *= uAspect;
        
        float dist = distance(a, c);
        float rad = uRadius * uSize;
        vec4 orig = texture2D(tDiffuse, vUv);
        
        if (dist < rad) {
          float nd = dist / rad;
          vec2 dir = normalize(a - c);
          float df = 1.0 - smoothstep(0.0, 1.0, nd);
          vec2 dUv = a - dir * uStrength * df * 0.5;
          dUv.x /= uAspect;
          
          vec4 col = texture2D(tDiffuse, dUv);
          gl_FragColor = mix(orig, col, uOverallIntensity * df);
        } else {
          gl_FragColor = orig;
        }
      }
    `;
  }

  private getAdvancedFragmentShader(): string {
    return `
      uniform sampler2D tDiffuse;
      uniform vec2 uMouse;
      uniform float uRadius;
      uniform float uSize;
      uniform float uStrength;
      uniform float uEdgeWidth;
      uniform float uEdgeOpacity;
      uniform float uRimLightIntensity;
      uniform float uRimLightWidth;
      uniform float uChromaticAberration;
      uniform float uReflectionIntensity;
      uniform float uWaveDistortion;
      uniform float uWaveSpeed;
      uniform float uLensBlur;
      uniform float uClearCenterSize;
      uniform float uOverallIntensity;
      uniform float uAspect;
      uniform float uTime;
      uniform float uQuality;
      varying vec2 vUv;

      vec4 simpleBlur(sampler2D tex, vec2 uv, float amount) {
        vec4 col = texture2D(tex, uv);
        if (amount > 0.0) {
          vec2 offset = vec2(1.0 / 512.0) * amount;
          col += texture2D(tex, uv + offset);
          col += texture2D(tex, uv - offset);
          col += texture2D(tex, uv + vec2(offset.x, -offset.y));
          col += texture2D(tex, uv + vec2(-offset.x, offset.y));
          col *= 0.2;
        }
        return col;
      }

      void main() {
        vec2 c = uMouse;
        vec2 a = vUv;
        a.x *= uAspect;
        c.x *= uAspect;
        
        float dist = distance(a, c);
        float rad = uRadius * uSize;
        vec4 orig = texture2D(tDiffuse, vUv);
        
        if (dist >= rad) {
          gl_FragColor = orig;
          return;
        }
        
        float nd = dist / rad;
        vec2 dir = normalize(a - c);
        float cl = uClearCenterSize * rad;
        float df = smoothstep(cl, rad, dist);
        
        float powd = 1.0 + nd * 2.0;
        vec2 dUv = a - dir * uStrength * pow(df, powd);
        
        if (uWaveDistortion > 0.0) {
          float w1 = sin(nd * 6.0 - uTime * uWaveSpeed) * uWaveDistortion;
          dUv += dir * w1 * df * 0.5;
        }
        
        dUv.x /= uAspect;
        
        vec4 col;
        
        if (uChromaticAberration > 0.0) {
          float ab = uChromaticAberration * df * (1.0 + nd * 0.5);
          vec2 rO = dir * ab * 0.8 / vec2(uAspect, 1.0);
          vec2 bO = dir * ab * 0.6 / vec2(uAspect, 1.0);
          
          float r = texture2D(tDiffuse, dUv + rO).r;
          float g = texture2D(tDiffuse, dUv).g;
          float b = texture2D(tDiffuse, dUv - bO).b;
          col = vec4(r, g, b, 1.0);
        } else {
          col = texture2D(tDiffuse, dUv);
        }
        
        if (uLensBlur > 0.0) {
          float bl = uLensBlur * df * 0.5;
          vec4 blurred = simpleBlur(tDiffuse, dUv, bl);
          col = mix(col, blurred, df * 0.3);
        }
        
        if (uReflectionIntensity > 0.0) {
          vec4 ref = texture2D(tDiffuse, vUv + dir * 0.05 * df);
          col = mix(col, ref, uReflectionIntensity * df * 0.5);
        }
        
        float edge = smoothstep(rad - uEdgeWidth, rad, dist);
        vec3 edgeColor = mix(vec3(1.0), vec3(0.8, 0.9, 1.0), nd);
        col = mix(col, vec4(edgeColor, 1.0), edge * uEdgeOpacity);
        
        float rimD = rad - uRimLightWidth;
        float rim = smoothstep(rimD - 0.01, rimD + 0.01, dist);
        rim *= (1.0 - smoothstep(rad - 0.005, rad, dist));
        col = mix(col, vec4(1.0), rim * uRimLightIntensity);
        
        gl_FragColor = mix(orig, col, uOverallIntensity);
      }
    `;
  }

  private detectDeviceCapabilities(): void {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      this.qualitySettings.useSimpleShader = true;
      return;
    }
    
    const debugInfo = (gl instanceof WebGLRenderingContext || gl instanceof WebGL2RenderingContext)
      ? gl.getExtension('WEBGL_debug_renderer_info')
      : null;
    const renderer = (debugInfo && (gl instanceof WebGLRenderingContext || gl instanceof WebGL2RenderingContext))
      ? gl.getParameter((debugInfo as any).UNMASKED_RENDERER_WEBGL)
      : '';
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile || renderer.includes('Mali') || renderer.includes('Adreno') || renderer.includes('PowerVR')) {
      this.qualitySettings.useSimpleShader = true;
      this.qualitySettings.textureSize = 512;
      this.qualitySettings.enableBlur = false;
      this.qualitySettings.enableChromaticAberration = false;
      this.qualitySettings.mouseSensitivity = 0.5;
    }
    
    canvas.remove();
  }

  private startPerformanceMonitoring(): void {
    const monitor = () => {
      const now = performance.now();
      this.performanceMonitor.frameTime = now - this.performanceMonitor.lastFrame;
      this.performanceMonitor.lastFrame = now;
      this.performanceMonitor.frameCount++;
      
      if (this.performanceMonitor.frameCount % 60 === 0) {
        this.performanceMonitor.fps = 1000 / this.performanceMonitor.frameTime;
        this.fps$.next(this.performanceMonitor.fps);
        
        if (this.performanceMonitor.fps < 30 && !this.qualitySettings.useSimpleShader) {
          console.log('Switching to simple shader due to low performance');
          this.qualitySettings.useSimpleShader = true;
          this.setupDistortionPass();
        }
      }
      
      requestAnimationFrame(monitor);
    };
    
    requestAnimationFrame(monitor);
  }

  private updateMousePosition(event: MouseEvent): void {
    if (!this.renderer) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.targetMousePosition.x = (event.clientX - rect.left) / rect.width;
    this.targetMousePosition.y = 1.0 - (event.clientY - rect.top) / rect.height;
    this.isMouseMoving = true;
    clearTimeout(this.mouseStopTimer);
    this.mouseStopTimer = window.setTimeout(() => {
      this.isMouseMoving = false;
    }, 100);
  }

  private updateMouseInterpolation(): void {
    if (this.isMouseMoving) {
      this.mousePosition.lerp(this.targetMousePosition, 0.1 * this.qualitySettings.mouseSensitivity);
      
      if (this.customPass) {
        this.customPass.uniforms['uMouse'].value.copy(this.mousePosition);
      }
    }
  }

  private setupNavHoverSounds(): void {
    document.querySelectorAll('.nav-links a').forEach(a => {
      a.addEventListener('mouseenter', () => {
        if (this.hoverSound && this.isBackgroundPlaying) {
          this.hoverSound.currentTime = 0;
          this.hoverSound.volume = 0.4;
          this.hoverSound.play().catch(() => {});
        }
      });
    });
  }

  private setupNavHoverSounds2(): void {
    document.querySelectorAll('.courses-list li').forEach(a => {
      a.addEventListener('mouseenter', () => {
        if (this.hoverSound && this.isBackgroundPlaying) {
          this.hoverSound.currentTime = 0;
          this.hoverSound.volume = 0.4;
          this.hoverSound.play().catch(() => {});
        }
      });
    });
  }

  private setupKeyboardControls(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (typeof e.key === 'string' && (e.key.toLowerCase() === 'h' || e.key.toLowerCase() === 'р')) {
        e.preventDefault();
        this.togglePane();
      }
    });
  }

  private togglePane(): void {
    if (!this.paneInitialized) {
      this.setupPane();
    }
    if (this.pane) {
      this.paneVisible = !this.paneVisible;
      this.pane.element.style.display = this.paneVisible ? 'block' : 'none';
    }
  }

  private setupPane(): void {
    if (this.paneInitialized) {
      return;
    }

    this.pane = new Pane({ title: 'Glass Refraction Controls', expanded: true });

    const addUniformInput = (prop: keyof typeof this.PARAMS.distortion, opts: any) => {
      const input = this.pane!.addInput(this.PARAMS.distortion, prop, opts);
      input.on('change', (ev: { value: number | boolean }) => {
        const uniformName = `u${prop.charAt(0).toUpperCase()}${prop.slice(1)}`;
        if (this.customPass?.uniforms[uniformName]) {
          this.customPass.uniforms[uniformName].value = ev.value;
        }
      });
      return input;
    };

    addUniformInput('overallIntensity', { min: 0, max: 2, step: 0.01, label: 'Общая Интенсивность' });
    addUniformInput('followMouse', { label: 'Следовать за Мышью' }).on('change', (ev: { value: boolean }) => {
      if (!ev.value) {
        this.staticMousePosition = { x: 0.5, y: 0.5 };
      }
    });
    addUniformInput('animationSpeed', { min: 0, max: 3, step: 0.1, label: 'Скорость Анимации' });

    const f1 = this.pane.addFolder({ title: 'Управление Размером' });
    f1.addInput(this.PARAMS.distortion, 'size', { min: 0.2, max: 3, step: 0.1, label: 'Размер Эффекта' })
      .on('change', (ev: { value: number }) => this.customPass!.uniforms['uSize'].value = ev.value);
    f1.addInput(this.PARAMS.distortion, 'radius', { min: 0.05, max: 0.8, step: 0.01, label: 'Базовый Радиус' })
      .on('change', (ev: { value: number }) => this.customPass!.uniforms['uRadius'].value = ev.value);

    const f2 = this.pane.addFolder({ title: 'Свойства Преломления' });
    f2.addInput(this.PARAMS.distortion, 'strength', { min: 0, max: 0.5, step: 0.01, label: 'Сила Преломления' })
      .on('change', (ev: { value: number }) => this.customPass!.uniforms['uStrength'].value = ev.value);
    f2.addInput(this.PARAMS.distortion, 'clearCenterSize', { min: 0, max: 1, step: 0.01, label: 'Очистить Центр' })
      .on('change', (ev: { value: number }) => this.customPass!.uniforms['uClearCenterSize'].value = ev.value);

    const f3 = this.pane.addFolder({ title: 'Визуальные Эффекты' });
    f3.addInput(this.PARAMS.distortion, 'chromaticAberration', { min: 0, max: 0.15, step: 0.001, label: 'Хроматическая Аберрация' })
      .on('change', (ev: { value: number }) => this.customPass!.uniforms['uChromaticAberration'].value = ev.value);
    f3.addInput(this.PARAMS.distortion, 'reflectionIntensity', { min: 0, max: 1, step: 0.01, label: 'Отражения' })
      .on('change', (ev: { value: number }) => this.customPass!.uniforms['uReflectionIntensity'].value = ev.value);
    f3.addInput(this.PARAMS.distortion, 'lensBlur', { min: 0, max: 0.5, step: 0.01, label: 'Размытие Линзы' })
      .on('change', (ev: { value: number }) => this.customPass!.uniforms['uLensBlur'].value = ev.value);

    const f4 = this.pane.addFolder({ title: 'Анимация Волны' });
    f4.addInput(this.PARAMS.distortion, 'waveDistortion', { min: 0, max: 0.3, step: 0.01, label: 'Сила Волны' })
      .on('change', (ev: { value: number }) => this.customPass!.uniforms['uWaveDistortion'].value = ev.value);
    f4.addInput(this.PARAMS.distortion, 'waveSpeed', { min: 0, max: 5, step: 0.1, label: 'Скорость Волны' })
      .on('change', (ev: { value: number }) => this.customPass!.uniforms['uWaveSpeed'].value = ev.value);

    const f5 = this.pane.addFolder({ title: 'Эффекты Краев' });
    f5.addInput(this.PARAMS.distortion, 'edgeWidth', { min: 0, max: 0.2, step: 0.01, label: 'Ширина Краев' })
      .on('change', (ev: { value: number }) => this.customPass!.uniforms['uEdgeWidth'].value = ev.value);
    f5.addInput(this.PARAMS.distortion, 'edgeOpacity', { min: 0, max: 1, step: 0.01, label: 'Непрозрачность Краев' })
      .on('change', (ev: { value: number }) => this.customPass!.uniforms['uEdgeOpacity'].value = ev.value);

    const f6 = this.pane.addFolder({ title: 'Ореол' });
    f6.addInput(this.PARAMS.distortion, 'rimLightIntensity', { min: 0, max: 1, step: 0.01, label: 'Интенсивность Ореола' })
      .on('change', (ev: { value: number }) => this.customPass!.uniforms['uRimLightIntensity'].value = ev.value);
    f6.addInput(this.PARAMS.distortion, 'rimLightWidth', { min: 0, max: 0.3, step: 0.01, label: 'Ширина Ореола' })
      .on('change', (ev: { value: number }) => this.customPass!.uniforms['uRimLightWidth'].value = ev.value);

    Object.assign(this.pane.element.style, {
      position: 'fixed',
      top: '10px',
      right: '10px',
      zIndex: '3000'
    });
    this.pane.element.style.display = 'none';
    this.paneVisible = false;
    this.paneInitialized = true;
    this.loadPreset('Классическое стекло');
  }

  private loadPreset(name: string): void {
    const preset = this.PARAMS.presets[name];
    if (!preset) {
      return;
    }

    Object.entries(preset).forEach(([key, value]) => {
      if (key in this.PARAMS.distortion) {
        (this.PARAMS.distortion as any)[key] = value;
        const uniformName = `u${key.charAt(0).toUpperCase()}${key.slice(1)}`;
        if (this.customPass?.uniforms[uniformName]) {
          this.customPass.uniforms[uniformName].value = value;
        }
      }
    });

    this.PARAMS.distortion.preset = name;
  }

  private onWindowResize(): void {
    this.aspect = window.innerWidth / window.innerHeight;

    if (this.camera && this.backgroundCamera) {
      this.camera.left = this.camera.right = this.backgroundCamera.left = this.backgroundCamera.right = null as any;
      [this.camera, this.backgroundCamera].forEach(cam => {
        cam.left = -this.aspect;
        cam.right = this.aspect;
        cam.updateProjectionMatrix();
      });
    }

    this.renderer?.setSize(window.innerWidth, window.innerHeight);
    this.composer?.setSize(window.innerWidth, window.innerHeight);

    if (this.customPass) {
      this.customPass.uniforms['uAspect'].value = this.aspect;
    }
    if (this.backgroundTexture) {
      this.createBackgroundMesh();
    }
  }

  private animate(time: number = 0): void {
    if (!this.webglSupported || !this.renderer || !this.isSceneReady || !this.isTextureLoaded) {
      return;
    }
    requestAnimationFrame((t: number) => this.animate(t));
    
    this.updateMouseInterpolation();
    
    if (this.customPass) {
      this.customPass.uniforms['uTime'].value = time * 0.001 * this.PARAMS.distortion.animationSpeed;
    }
    
    if (this.composer && this.backgroundTexture) {
      this.composer.render();
    } else if (this.renderer && this.backgroundScene && this.backgroundCamera) {
      this.renderer.clear();
      this.renderer.render(this.backgroundScene, this.backgroundCamera);
    }
  }

  destroy(): void {
    this.isSceneReady = false;
    this.isTextureLoaded = false;
  
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    if (this.boundOnMouseMove) document.removeEventListener('mousemove', this.boundOnMouseMove);
    if (this.boundOnTouchMove) document.removeEventListener('touchmove', this.boundOnTouchMove);
    if (this.boundOnTouchStart) document.removeEventListener('touchstart', this.boundOnTouchStart);
  
    [this.startClickSound, this.preloaderSound, this.hoverSound, this.backgroundMusic].forEach(audio => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
        audio.remove();
      }
    });
    this.startClickSound = null;
    this.preloaderSound = null;
    this.hoverSound = null;
    this.backgroundMusic = null;
    this.isBackgroundPlaying = false;
  
    if (this.backgroundTexture) {
      this.backgroundTexture.dispose();
      const video = (this.backgroundTexture as THREE.VideoTexture).image as HTMLVideoElement;
      video.pause();
      video.src = '';
      video.remove();
      this.backgroundTexture = null;
    }
  
    if (this.backgroundMesh) {
      const mat = this.backgroundMesh.material;
      if (Array.isArray(mat)) {
        mat.forEach(m => m.dispose());
      } else {
        mat?.dispose();
      }
      this.backgroundScene?.remove(this.backgroundMesh);
      this.backgroundMesh = null;
    }
    if (this.backgroundScene) {
      this.backgroundScene.clear();
      this.backgroundScene = null;
    }
  
    if (this.composer) {
      this.composer.passes.forEach(pass => {
        if (pass instanceof ShaderPass) {
          pass.material?.dispose();
        }
      });
      this.composer = null;
    }
    if (this.customPass) {
      this.customPass.material?.dispose();
      this.customPass = null;
    }
  
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      const canvas = this.renderer.domElement;
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      this.renderer = null;
    }
  
    this.camera = null;
    this.backgroundCamera = null;
    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }
  
    if (this.pane) {
      this.pane.element.remove();
      this.pane = null;
      this.paneInitialized = false;
      this.paneVisible = false;
    }
  
    if (this.cachedGeometry) {
      this.cachedGeometry.dispose();
      this.cachedGeometry = null;
    }
  
    clearTimeout(this.mouseStopTimer);
  
    this.error$.complete();
    this.fps$.complete();
  }
}