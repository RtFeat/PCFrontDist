import {AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import * as THREE from 'three';
import {createNoise2D, NoiseFunction2D} from 'simplex-noise';
// @ts-ignore
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RouterOutlet, RouterLink, Router} from '@angular/router';
import { BackgroundCanvas } from '../background-canvas/background-canvas';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { TransitionService } from '../shaders/service/transition.service';
import { CommonModule } from '@angular/common';

interface ParticleConfig {
  size: number;
  total: number;
  transparent?: boolean;
  max?: number;
  min?: number;
  pointY?: number;
}

@Component({
  selector: 'app-home-page',
  imports: [
    RouterOutlet,
    BackgroundCanvas,
    RouterLink,
    CommonModule
  ],
  templateUrl: './home-page.html',
  standalone: true,
  styleUrl: './home-page.scss'
})

export class HomePage implements AfterViewInit, OnDestroy {
  @ViewChild('webglCanvas', { static: false }) webglCanvas!: ElementRef<HTMLDivElement>;
  @ViewChild('destinationTitle') destinationTitleRef!: ElementRef<HTMLHeadingElement>;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private clock!: THREE.Clock;
  private nucleus!: THREE.Mesh;
  private sphereBg!: THREE.Mesh;
  private pointStars!: THREE.Points;
  private pointStars2!: THREE.Points;
  private pointComet1!: THREE.Points;
  private planet1!: THREE.Points;
  private planet2!: THREE.Points;
  private planet3!: THREE.Points;
  private stars!: THREE.Points;
  private textures: { [key: string]: THREE.Texture } = {};
  private noise!: NoiseFunction2D;
  private blobScale = 2;
  private originalPositions!: Float32Array;
  private nucleusPosition!: THREE.BufferAttribute;
  private originalY!: THREE.BufferAttribute;
  private positionsStar!: THREE.BufferAttribute;
  private velocitiesStar!: THREE.BufferAttribute;
  private startPositions!: THREE.BufferAttribute;
  private time!: number;
  private delta = 0;
  private hasInteracted = false;
  private resizeObserver: ResizeObserver | undefined;
  private rafId: number | null = null;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private hoveredPlanet: THREE.Object3D | null = null;
  private planetSizes = new Map<THREE.Object3D, { current: number, target: number, base: number }>();
  isHovering = false;
  private isAnimationPaused = false;

  private animationStartTime3 = Date.now() + 6000;
  private animationStartTime6 = Date.now() + 15000;
  private expansionStartTime = Date.now() + 9000;
  private contractionStartTime = Date.now() + 20000;
  private centeringStartTime = Date.now() + 25000;
  private pointStarsContractStartTime = Date.now() + 25000;
  private readonly MAX_EXPANSION_DISTANCE = 95;
  private readonly contractionDuration = 8000;
  private readonly centeringDuration = 8000;
  private readonly pointStarsContractDuration = 6000;
  private readonly TARGET_RADIUS = 95;

  private rocket: THREE.Object3D | null = null;
  private rocketAngle = 0;
  private audio: HTMLAudioElement | null = null;
  private hoverAudio: HTMLAudioElement | null = null;

  constructor(
    public router: Router,
    private transitionService: TransitionService
  ) {}

  ngAfterViewInit(): void {
    if (this.webglCanvas) {
      this.init();
      this.setupMouseEvents(); // Добавляем обработку событий мыши
      this.raycaster.params.Points.threshold = 15; // Увеличиваем радиус пересечения для точек (планет)
    } else {
      console.error('webglCanvas is not defined. Check the template.');
    }
    // Воспроизведение аудио при запуске
    this.audio = new Audio('/images/advertisers/audio/cosmos.mp3');
    this.audio.loop = true;
    this.audio.volume = 0.5;
    this.audio.play().catch(e => {
      // В некоторых браузерах автозапуск может быть заблокирован
      console.warn('Автовоспроизведение аудио заблокировано браузером:', e);
    });
    // Инициализация аудио для наведения
    this.hoverAudio = new Audio('/images/advertisers/audio/preloader-2s.mp3');
    this.hoverAudio.volume = 0.2;
  }

  ngOnDestroy(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.renderer) this.renderer.dispose();

    // Остановить и очистить аудио
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
    }

    // Очистка hoverAudio
    if (this.hoverAudio) {
      this.hoverAudio.pause();
      this.hoverAudio.currentTime = 0;
      this.hoverAudio = null;
    }

    Object.values(this.textures).forEach(texture => texture.dispose());

    const disposeObject = (object: THREE.Object3D) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
        object.geometry?.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach(mat => mat.dispose());
        } else {
          object.material?.dispose();
        }
      }
      object.children.forEach(child => disposeObject(child));
    };
    
    disposeObject(this.scene);
    this.scene.clear();
    
    // Очистка WebGL контекста
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer.domElement.remove();
    }
    
    // Очистка ссылок
    this.renderer = null as any;
    this.scene = null as any;
    this.camera = null as any;
    this.controls = null as any;
    this.nucleus = null as any;
    this.sphereBg = null as any;
    this.pointStars = null as any;
    this.pointStars2 = null as any;
    this.pointComet1 = null as any;
    this.planet1 = null as any;
    this.planet2 = null as any;
    this.planet3 = null as any;
    this.stars = null as any;
    this.rocket = null as any;
  }

  private async init(): Promise<void> {
    this.threeInit();
    await this.textureLoader();
    this.createElements();
    this.createMovingStars();
    this.createPointElement();
    this.initFullscreenButton();
    this.bannerInit();
    this.assignTextures();
    this.setupResizeObserver();
    this.limitFPS(1 / 90);
    await this.loadRocketModel();
  }

  private threeInit(): void {
    if (!this.webglCanvas?.nativeElement) {
      console.error('webglCanvas nativeElement is undefined');
      return;
    }
    const container = this.webglCanvas.nativeElement;
    this.renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      alpha: true,
      antialias: true,
      stencil: false
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.01, 1000);
    this.camera.position.set(0, 0, 150);
    this.clock = new THREE.Clock();

    const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
    directionalLight.position.set(0, 50, -20);
    this.scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    ambientLight.position.set(0, -20, -40);
    this.scene.add(ambientLight);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 5;
    this.controls.maxDistance = 350;
    this.controls.minDistance = 150;
    this.controls.enablePan = false;
  }

  private async textureLoader(): Promise<void> {
    const textureLoader = new THREE.TextureLoader();
    const textureMap: { [key: string]: string } = {
      sky: '/images/cosmos/sky.jpg',
      star: '/images/cosmos/sun.png',
      flare1: '/images/cosmos/p1.png',
      flare2: '/images/cosmos/p2.png',
      flare3: '/images/cosmos/p3.png',
      planet1: '/images/cosmos/earth.png',
      planet2: '/images/cosmos/mars.png',
      planet3: '/images/cosmos/moon.png'
    };

    await Promise.all(
      Object.entries(textureMap).map(([key, path]) =>
        new Promise<void>((resolve, reject) => {
          textureLoader.load(
            path,
            (texture) => {
              texture.colorSpace = THREE.SRGBColorSpace;
              texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
              if (key === 'sky') {
                texture.wrapS = THREE.MirroredRepeatWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                texture.repeat.x = 1;
                texture.offset.x = 0;
              }
              this.textures[key] = texture;
              resolve();
            },
            undefined,
            (error) => reject(`Error loading texture ${path}: ${error}`)
          );
        })
      )
    );
  }

  private assignTextures(): void {
    (this.pointStars.material as THREE.PointsMaterial).map = this.textures['flare1'];
    (this.pointStars2.material as THREE.PointsMaterial).map = this.textures['flare2'];
    (this.pointComet1.material as THREE.PointsMaterial).map = this.textures['flare3'];
    (this.planet1.material as THREE.PointsMaterial).map = this.textures['planet1'];
    (this.planet2.material as THREE.PointsMaterial).map = this.textures['planet2'];
    (this.planet3.material as THREE.PointsMaterial).map = this.textures['planet3'];
    (this.nucleus.material as THREE.MeshPhongMaterial).map = this.textures['star'];
    (this.sphereBg.material as THREE.MeshBasicMaterial).map = this.textures['sky'];
    (this.stars.material as THREE.PointsMaterial).map = this.textures['flare2'];
  }

  private createElements(): void {
    const icosahedronGeometry = new THREE.IcosahedronGeometry(20, 28);
    this.originalPositions = new Float32Array(icosahedronGeometry.attributes['position'].array);
    const lambertMaterial = new THREE.MeshPhongMaterial({});
    this.nucleus = new THREE.Mesh(icosahedronGeometry, lambertMaterial);
    this.nucleus.position.set(0, 0, 0);
    this.scene.add(this.nucleus);
    this.noise = createNoise2D();

    const geometrySphereBg = new THREE.SphereGeometry(90, 64, 32);
    const materialSphereBg = new THREE.MeshBasicMaterial({ side: THREE.BackSide,  transparent: false, depthWrite: true });
    this.sphereBg = new THREE.Mesh(geometrySphereBg, materialSphereBg);
    this.sphereBg.position.set(0, 0, 0);
    this.scene.add(this.sphereBg);

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private createPointElement(): void {
    this.pointStars = this.createPointParticles({ size: 0.5, total: 200, transparent: true, max: 130, min: 130 });
    this.pointStars2 = this.createPointParticles({ size: 3, total: 600, transparent: true, max: 33, min: 25, pointY: 0 });
    this.pointComet1 = this.createPointParticles({ size: 12, total: 1, transparent: true, max: 25, min: 25 });
    this.planet1 = this.createPointParticles({ size: 20, total: 1, transparent: false, max: 60, min: 40 });
    this.planet2 = this.createPointParticles({ size: 24, total: 1, transparent: false, max: 60, min: 40 });
    this.planet3 = this.createPointParticles({ size: 18, total: 1, transparent: false, max: 60, min: 40 });

    // Инициализация размеров для анимации
    [this.planet1, this.planet2, this.planet3].forEach(planet => {
      const size = (planet.material as THREE.PointsMaterial).size;
      this.planetSizes.set(planet, { current: size, target: size, base: size });
    });

    this.scene.add(this.pointStars, this.pointStars2, this.pointComet1, this.planet1, this.planet2, this.planet3);
  }

  private createPointParticles(config: ParticleConfig): THREE.Points {
    const { size, total, transparent = true, max = 150, min = 70, pointY } = config;
    const positions = new Float32Array(total * 3);
    const originalY = new Float32Array(total);

    for (let i = 0; i < total; i++) {
      const point = this.randomPointSphere(THREE.MathUtils.randInt(min, max));
      const idx = i * 3;
      positions[idx] = point.x;
      positions[idx + 2] = point.z;
      positions[idx + 1] = pointY !== undefined ? pointY : point.y;
      originalY[i] = point.y;
    }

    const pointGeometry = new THREE.BufferGeometry();
    pointGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointGeometry.setAttribute('originalY', new THREE.BufferAttribute(originalY, 1));

    const blending = transparent ? THREE.AdditiveBlending : THREE.NormalBlending;
    const pointMaterial = new THREE.PointsMaterial({
      size,
      blending,
      transparent: true,
      depthWrite: false
    });

    return new THREE.Points(pointGeometry, pointMaterial);
  }

  private createMovingStars(): void {
    const totalStars = 5;
    const positions = new Float32Array(totalStars * 3);
    const velocities = new Float32Array(totalStars);
    const startPositions = new Float32Array(totalStars * 3);

    for (let i = 0; i < totalStars; i++) {
      const radius = THREE.MathUtils.randFloat(200, 300);
      const point = this.randomPointSphere(radius);
      const idx = i * 3;
      positions[idx] = point.x;
      positions[idx + 1] = point.y;
      positions[idx + 2] = point.z;
      startPositions[idx] = point.x;
      startPositions[idx + 1] = point.y;
      startPositions[idx + 2] = point.z;
      velocities[i] = THREE.MathUtils.randInt(50, 400);
    }

    const starsGeometry = new THREE.BufferGeometry();
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starsGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1));
    starsGeometry.setAttribute('startPosition', new THREE.BufferAttribute(startPositions, 3));

    const starsMaterial = new THREE.PointsMaterial({
      size: 14,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.stars = new THREE.Points(starsGeometry, starsMaterial);
    this.stars.name = 'moving_stars';
    this.stars.visible = false;
    this.scene.add(this.stars);
  }

  private randomPointSphere(radius: number): THREE.Vector3 {
    const theta = 2 * Math.PI * Math.random();
    const phi = Math.acos(2 * Math.random() - 1);
    const dx = radius * Math.sin(phi) * Math.cos(theta);
    const dy = radius * Math.sin(phi) * Math.sin(theta);
    const dz = radius * Math.cos(phi);
    return new THREE.Vector3(dx, dy, dz);
  }

  private initFullscreenButton(): void {
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    fullscreenBtn?.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.error(`Fullscreen error: ${err.message}`));
      } else {
        document.exitFullscreen?.();
      }
    });
  }

  private bannerInit(): void {
    const banner = document.querySelector('.banner') as HTMLElement;
    const hideBanner = () => {
      if (!this.hasInteracted && banner) {
        banner.style.opacity = '0';
        banner.style.transition = 'opacity 0.5s ease';
        setTimeout(() => banner.remove(), 500);
        this.hasInteracted = true;
      }
    };

    window.addEventListener('wheel', hideBanner, { once: true });
    this.renderer.domElement.addEventListener('pointerdown', hideBanner, { once: true });
  }

  private setupResizeObserver(): void {
    if (this.webglCanvas?.nativeElement) {
      this.resizeObserver = new ResizeObserver(() => this.onResize());
      this.resizeObserver.observe(this.webglCanvas.nativeElement);
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private async loadRocketModel(): Promise<void> {
    const mtlLoader = new MTLLoader();
    const objLoader = new OBJLoader();
  
    // Загрузка материалов
    const materials = await new Promise((resolve, reject) => {
      mtlLoader.setPath('3d/rocket/');
      mtlLoader.load('Rocket.mtl', resolve, undefined, reject);
    });
    (materials as any).preload();
    objLoader.setMaterials(materials as any);
  
    // Загрузка OBJ
    this.rocket = await new Promise<THREE.Object3D>((resolve, reject) => {
      objLoader.setPath('3d/rocket/');
      objLoader.load('Rocket.obj', resolve, undefined, reject);
    });
  
    this.rocket.scale.set(0.1, 0.1, 0.1); // подбери нужный масштаб
    this.rocket.rotation.x = Math.PI / -2;
    this.scene.add(this.rocket);
    const base = 0.1; // The rocket's base scale
    this.planetSizes.set(this.rocket, { current: base, target: base, base });
  }

  private limitFPS(interval: number): void {
    this.rafId = requestAnimationFrame(() => this.limitFPS(interval));
    this.delta += this.clock.getDelta();

    if (this.delta > interval) {
      this.loop();
      this.delta %= interval;
    }
  }

  private setupMouseEvents(): void {
    this.renderer.domElement.addEventListener('pointermove', (event) => {
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const objectsToIntersect = [this.planet1, this.planet2, this.planet3, this.rocket].filter(Boolean) as THREE.Object3D[];
      if (this.rocket) {
        objectsToIntersect.push(this.rocket);
      }
      const intersects = this.raycaster.intersectObjects(objectsToIntersect, true);

      let hovered: THREE.Object3D | null = null;
      if (intersects.length > 0) {
        const intersectedObj = intersects[0].object;
        if (intersectedObj === this.planet1 || intersectedObj === this.planet2 || intersectedObj === this.planet3) {
          hovered = intersectedObj;
        } else if (this.rocket) {
          let isRocketPart = false;
          intersectedObj.traverseAncestors((ancestor) => {
            if (ancestor === this.rocket) {
              isRocketPart = true;
              hovered = this.rocket;
            }
          });
          if (intersectedObj === this.rocket) {
            isRocketPart = true;
            hovered = this.rocket
          }
        }
      }

      if (this.hoveredPlanet !== hovered) {
        // Воспроизведение звука при наведении на новый объект
        if (hovered && this.hoverAudio) {
          try {
            this.hoverAudio.currentTime = 0;
            this.hoverAudio.play();
          } catch (e) {
            // В некоторых браузерах автозапуск может быть заблокирован
            // Можно проигнорировать ошибку
          }
        }
        if (this.hoveredPlanet) {
          const prev = this.planetSizes.get(this.hoveredPlanet);
          if (prev) prev.target = prev.base;
          this.isAnimationPaused = false;
          this.controls.autoRotate = true;
          this.isHovering = false;
        }

        if (hovered) {
          const curr = this.planetSizes.get(hovered);
          if (curr) curr.target = curr.base * 1.8;
          this.isAnimationPaused = true;
          this.controls.autoRotate = false;
          this.isHovering = true;
          this.updateDestinationText(hovered);
        }
        this.hoveredPlanet = hovered;
      }
    });

    // Добавляем обработчик клика
    this.renderer.domElement.addEventListener('click', () => {
      if (this.hoveredPlanet) {
        let targetRoute = '';
        if (this.hoveredPlanet === this.planet1) {
          targetRoute = '/earth';
        } else if (this.hoveredPlanet === this.planet2) {
          targetRoute = '/mars';
        } else if (this.hoveredPlanet === this.planet3) {
          targetRoute = '/moon';
        } else if (this.hoveredPlanet === this.rocket) {
          targetRoute = '/';
        }

        if (targetRoute) {
          this.transitionService.goWithSmoke('/flight', targetRoute);
        }
      }
    });
  }

  private updateDestinationText(object: THREE.Object3D): void {
    let text = '';
    if (object === this.planet1) {
      text = 'Рекламодатели';
    } else if (object === this.planet2) {
      text = 'Помогаем и поддерживаем';
    } else if (object === this.planet3) {
      text = 'История';
    } else if (object === this.rocket) {
      text = 'Взойти на борт';
    }

    if (this.destinationTitleRef?.nativeElement) {
      this.destinationTitleRef.nativeElement.textContent = text;
    }
  }

  private updateNucleus(): void {
    if (Date.now() < this.animationStartTime3) return;

    const animationEasing1 = Math.min(1, (Date.now() - this.animationStartTime3) / 2000);
    const positions = this.nucleusPosition.array;

    for (let i = 0; i < this.nucleusPosition.count; i++) {
      const x = this.originalPositions[i * 3];
      const y = this.originalPositions[i * 3 + 1];
      const z = this.originalPositions[i * 3 + 2];
      const length = Math.sqrt(x * x + y * y + z * z);
      const nx = x / length;
      const ny = y / length;
      const nz = z / length;

      const distance = 20 + this.noise(nx + this.time * 0.0004, ny + this.time * 0.0004) * this.blobScale * animationEasing1;
      positions[i * 3] = nx * distance;
      positions[i * 3 + 1] = ny * distance;
      positions[i * 3 + 2] = nz * distance;
    }

    this.nucleusPosition.needsUpdate = true;
    this.nucleus.geometry.computeVertexNormals();
  }

  private updateMovingStars(): void {
    if (Date.now() < this.animationStartTime6) return;

    const easing = Math.min(1, (Date.now() - this.animationStartTime6) / 2000);
    const positions = this.positionsStar.array;
    const velocities = this.velocitiesStar.array;

    for (let i = 0; i < this.positionsStar.count; i++) {
      const idx = i * 3;
      const moveAmount = easing * ((0 - positions[idx]) / velocities[i]);
      positions[idx] += moveAmount;
      positions[idx + 1] += easing * ((0 - positions[idx + 1]) / velocities[i]);
      positions[idx + 2] += easing * ((0 - positions[idx + 2]) / velocities[i]);
      velocities[i] -= 0.1 * easing;

      if (
        positions[idx] <= 2 && positions[idx] >= -2 &&
        positions[idx + 2] <= 2 && positions[idx + 2] >= -2
      ) {
        positions[idx] = this.startPositions.array[idx];
        positions[idx + 1] = this.startPositions.array[idx + 1];
        positions[idx + 2] = this.startPositions.array[idx + 2];
        velocities[i] = 120;
      }
    }

    this.positionsStar.needsUpdate = true;
    this.velocitiesStar.needsUpdate = true;
  }

  private updatePointStars2(): void {
    const positions = this.pointStars2.geometry.attributes['position'] as THREE.BufferAttribute;
    for (let i = 0; i < this.originalY.count; i++) {
      const currentY = positions.array[i * 3 + 1];
      const targetY = this.originalY.array[i];

      if (Date.now() >= this.animationStartTime3) {
        positions.array[i * 3 + 1] = currentY + (targetY - currentY) * 0.02;
      }

      if (Date.now() >= this.expansionStartTime && Date.now() < this.contractionStartTime) {
        const x = positions.array[i * 3];
        const y = positions.array[i * 3 + 1];
        const z = positions.array[i * 3 + 2];
        const currentDistance = Math.sqrt(x * x + y * y + z * z);

        if (currentDistance < this.MAX_EXPANSION_DISTANCE) {
          const distanceRatio = currentDistance / this.MAX_EXPANSION_DISTANCE;
          const expansionFactor = 1 + 0.008 * (1 - distanceRatio);
          positions.array[i * 3] = x * expansionFactor;
          positions.array[i * 3 + 1] = y * expansionFactor;
          positions.array[i * 3 + 2] = z * expansionFactor;
        }
      }

      if (Date.now() >= this.contractionStartTime) {
        const timeSinceStart = Date.now() - this.contractionStartTime;
        const easing = Math.min(1, timeSinceStart / this.contractionDuration);
        const x = positions.array[i * 3];
        const y = positions.array[i * 3 + 1];
        const z = positions.array[i * 3 + 2];
        const currentDistance = Math.sqrt(x * x + y * y + z * z);
        const originalRadius = THREE.MathUtils.randFloat(25, 33);
        const nx = (x / currentDistance) * originalRadius;
        const ny = (y / currentDistance) * originalRadius;
        const nz = (z / currentDistance) * originalRadius;
        const contractionSpeed = 0.02 * easing;

        positions.array[i * 3] = x + (nx - x) * contractionSpeed;
        positions.array[i * 3 + 1] = y + (ny - y) * contractionSpeed;
        positions.array[i * 3 + 2] = z + (nz - z) * contractionSpeed;
      }

      if (Date.now() >= this.centeringStartTime) {
        const timeSinceStart = Date.now() - this.centeringStartTime;
        const easing = Math.min(1, timeSinceStart / this.centeringDuration);
        const x = positions.array[i * 3];
        const y = positions.array[i * 3 + 1];
        const z = positions.array[i * 3 + 2];
        const centeringSpeed = 0.02 * easing;

        positions.array[i * 3] = x + (0 - x) * centeringSpeed;
        positions.array[i * 3 + 1] = y + (0 - y) * centeringSpeed;
        positions.array[i * 3 + 2] = z + (0 - z) * centeringSpeed;

        (this.pointStars2.material as THREE.PointsMaterial).opacity = 1 - easing;
        if (easing >= 1) {
          this.pointStars2.visible = false;
          this.stars.visible = true;
        }
      }
    }
    positions.needsUpdate = true;
  }

  private updatePointStarsContraction(): void {
    const timeSinceStart = Date.now() - this.pointStarsContractStartTime;
    const easing = Math.min(1, timeSinceStart / this.pointStarsContractDuration);
    const positions = this.pointStars.geometry.attributes['position'] as THREE.BufferAttribute;

    (this.pointStars.material as THREE.PointsMaterial).size = 0.4 + 0.7 * easing;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.array[i * 3];
      const y = positions.array[i * 3 + 1];
      const z = positions.array[i * 3 + 2];
      const currentDistance = Math.sqrt(x * x + y * y + z * z);
      const nx = x / currentDistance;
      const ny = y / currentDistance;
      const nz = z / currentDistance;
      const targetX = nx * this.TARGET_RADIUS;
      const targetY = ny * this.TARGET_RADIUS;
      const targetZ = nz * this.TARGET_RADIUS;
      const contractionSpeed = 0.02 * easing;

      positions.array[i * 3] = x + (targetX - x) * contractionSpeed;
      positions.array[i * 3 + 1] = y + (targetY - y) * contractionSpeed;
      positions.array[i * 3 + 2] = z + (targetZ - z) * contractionSpeed;
    }

    positions.needsUpdate = true;
  }

  private updateRotations(): void {
    this.pointStars.rotation.y -= 0.0007;
    this.pointComet1.rotation.z -= 0.01;
    this.pointComet1.rotation.y += 0.001;
    this.pointStars2.rotation.x -= 0.001;
    this.planet1.rotation.y += 0.001;
    this.planet2.rotation.z += 0.003;
    this.planet3.rotation.x += 0.0005;
  }

  private loop(): void {
    this.nucleusPosition = this.nucleus.geometry.attributes['position'] as THREE.BufferAttribute;
    this.originalY = this.pointStars2.geometry.attributes['originalY'] as THREE.BufferAttribute;
    this.time = Date.now();
    this.positionsStar = this.stars.geometry.attributes['position'] as THREE.BufferAttribute;
    this.velocitiesStar = this.stars.geometry.attributes['velocity'] as THREE.BufferAttribute;
    this.startPositions = this.stars.geometry.attributes['startPosition'] as THREE.BufferAttribute;

    // Анимация размера планет и nucleus
    const objectsToAnimate: THREE.Object3D[] = [this.planet1, this.planet2, this.planet3];
    if (this.rocket) {
      objectsToAnimate.push(this.rocket);
    }
    objectsToAnimate.forEach(planet => {
      const sizes = this.planetSizes.get(planet);
      if (sizes) {
        // Линейная интерполяция
        sizes.current += (sizes.target - sizes.current) * 0.15;
        if (planet instanceof THREE.Points) {
          (planet.material as THREE.PointsMaterial).size = sizes.current;
        } else {
          planet.scale.set(sizes.current, sizes.current, sizes.current);
        }
      }
    });

    if (!this.isAnimationPaused) {
      this.updateNucleus();
      this.updateMovingStars();
      this.updatePointStars2();
      this.updateRotations();
  
      if (Date.now() >= this.pointStarsContractStartTime) {
        this.updatePointStarsContraction();
      }
  

    }

    if (this.rocket) {
      const radius = 80;
      this.rocket.position.set(
        Math.cos(this.rocketAngle) * radius,
        0,
        Math.sin(this.rocketAngle) * radius
      );
    // чтобы ракета «смотрела» по траектории
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
