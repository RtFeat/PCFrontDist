import { Component, ElementRef, NgZone, OnDestroy, OnInit, Renderer2, ViewChild } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as TWEEN from '@tweenjs/tween.js';
import { Particles } from '../shaders/particles';
import { ShaderService } from '../shaders/service/shader';
import { SceneService } from '../shaders/service/scene';
import { RouterOutlet } from '@angular/router';
import { BackgroundCanvas } from '../background-canvas/background-canvas';
import { Router } from '@angular/router';
import { TransitionService } from '../shaders/service/transition.service';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { ActivatedRoute } from '@angular/router';

interface Uniforms {
  offset: { value: number };
  color: { value: THREE.Color };
  alpha: { value: number };
}

@Component({
  selector: 'app-test-page',
  templateUrl: './test-page.html',
  styleUrls: ['./test-page.scss'],
  imports: [RouterOutlet, BackgroundCanvas],
  standalone: true
})
export class TestPage implements OnInit, OnDestroy {
  @ViewChild('container', { static: true }) container!: ElementRef<HTMLDivElement>;

  private renderer!: THREE.WebGLRenderer;
  private camera!: THREE.PerspectiveCamera;
  private scene!: THREE.Scene;
  private controls!: OrbitControls;
  private rocketGroup!: THREE.Group;
  private stars!: Particles;
  private fire!: THREE.Mesh;
  private clock = new THREE.Clock();
  private mouse = new THREE.Vector2();
  private raycaster = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private rocketTarget = new THREE.Vector3();
  private cameraTarget = new THREE.Vector3();
  private targetRoute: string = '/cosmos'; // по умолчанию
  private destroyed = false;
  private bgAudio: HTMLAudioElement | null = null;
  private starAudio: HTMLAudioElement | null = null;
  private lastStarSoundTime = 0;
  private fireHeightValue = 1;

  constructor(
    private renderer2: Renderer2,
    private ngZone: NgZone,
    private shaderService: ShaderService,
    private sceneService: SceneService,
    private router: Router,
    private transitionService: TransitionService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Получаем путь из state, если он есть
    const finalTarget = this.transitionService.getFinalTarget();
    if (finalTarget) {
      this.targetRoute = finalTarget;
    }

    this.initScene();
    this.initRocket();
    this.initStars();
    this.setupEventListeners();
    this.animate();
    setTimeout(() => {
      this.transitionService.goWithSmoke(this.targetRoute);
    }, 10000); // 10 секунд на тестовой странице

    this.bgAudio = new Audio('/images/advertisers/audio/rocket.mp3');
    this.bgAudio.loop = true;
    this.bgAudio.volume = 1; // Можно изменить громкость
    this.bgAudio.play().catch(() => {}); // Безопасный запуск

    this.starAudio = new Audio('/images/advertisers/audio/rocket_push.mp3');
  }

  private initScene(): void {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100000);
    this.camera.position.set(5, -15, 3);
    this.cameraTarget.copy(this.camera.position);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.domElement.style.cursor = 'crosshair';
    this.renderer2.appendChild(this.container.nativeElement, this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.y = 1;
    this.controls.enableDamping = true;
    this.controls.enabled = false;

    const ambientLight = new THREE.AmbientLight(0x555555);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(0.7, 1, 1);
    this.scene.add(directionalLight);

    this.renderer.setClearColor(0x000000, 0); // 0 — полностью прозрачный
  }

  private initRocket(): void {
    this.rocketGroup = new THREE.Group();
    this.scene.add(this.rocketGroup);

    const mtlLoader = new MTLLoader();
    mtlLoader.setPath('3d/rocket/');
    mtlLoader.load('Rocket.mtl', (materials) => {
      materials.preload();

      const objLoader = new OBJLoader();
      objLoader.setMaterials(materials);
      objLoader.setPath('3d/rocket/');
      objLoader.load('Rocket.obj', (object) => {
        object.scale.set(0.1, 0.1, 0.1);
        object.position.y = -1;
        this.rocketGroup.add(object);
      
        // Добавляем огонь (примерно как было раньше)
        const firePoints: THREE.Vector2[] = [];
        for (let i = 0; i <= 10; i++) {
          firePoints.push(new THREE.Vector2(Math.sin(i * 0.18) * 10, (-1 + i) * 2.5));
        }
        const fireGeo = new THREE.LatheGeometry(firePoints, 32);
        const fireMat = this.shaderService.createFireMaterial();
        this.fire = new THREE.Mesh(fireGeo, fireMat);
        this.fire.scale.setScalar(0.1);
        this.rocketGroup.add(this.fire);

        // Если нужно добавить огонь или свет, делайте это здесь
        // Например:
        // this.fire = ...;
        // this.rocketGroup.add(this.fire);
      });
    });
  }

  private initStars(): void {
    this.stars = new Particles({
      color: 0xffffff,
      size: 0.2,
      rangeH: 20,
      rangeV: 20,
      pointCount: 400,
      speed: 0.1
    });
    this.stars.points.position.y = 0;
    this.scene.add(this.stars);
  }

  private setupEventListeners(): void {
    this.renderer2.listen(this.renderer.domElement, 'mousemove', (e: MouseEvent) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      this.cameraTarget.x = -this.mouse.x * 1;
      this.cameraTarget.z = 3 + this.mouse.y * 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      this.raycaster.ray.intersectPlane(this.plane, this.rocketTarget);
    });

    this.renderer2.listen(this.renderer.domElement, 'mousedown', (e: MouseEvent) => {
      const now = Date.now();
      if (this.starAudio && now - this.lastStarSoundTime > 1000) {
        this.starAudio.currentTime = 0;
        this.starAudio.play().catch(() => {});
        this.lastStarSoundTime = now;
      }
      e.preventDefault();
      TWEEN.removeAll();

      // Ускоряем rocket.mp3
      if (this.bgAudio) {
        this.bgAudio.playbackRate = 1.5;
      }

      // Плавно увеличиваем длину огня
      new TWEEN.Tween({ value: this.fireHeightValue })
        .to({ value: 3 }, 500)
        .easing(TWEEN.Easing.Cubic.Out)
        .onUpdate(obj => {
          this.fireHeightValue = obj.value;
          this.shaderService.setFireHeight(this.fireHeightValue);
        })
        .start();

      const dir = this.mouse.x < 0 ? -1 : 1;
      new TWEEN.Tween(this.rocketGroup.rotation)
        .to({ y: dir * Math.PI}, 900)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .start();

      new TWEEN.Tween(this.rocketGroup.scale)
        .to({ x: 0.9, y: 1.9, z: 0.9 }, 400)
        .easing(TWEEN.Easing.Cubic.InOut)
        .start();

      this.stars.speedTarget = 0.5;
      this.renderer.domElement.style.cursor = 'none';
    });

    this.renderer2.listen(this.renderer.domElement, 'mouseup', () => {
      // Возвращаем скорость rocket.mp3 к 1
      if (this.bgAudio) {
        this.bgAudio.playbackRate = 1;
      }

      // Плавно возвращаем длину огня к обычной
      new TWEEN.Tween({ value: this.fireHeightValue })
        .to({ value: 1 }, 500)
        .easing(TWEEN.Easing.Cubic.Out)
        .onUpdate(obj => {
          this.fireHeightValue = obj.value;
          this.shaderService.setFireHeight(this.fireHeightValue);
        })
        .start();

      new TWEEN.Tween(this.rocketGroup.scale)
        .to({ x: 1, y: 1, z: 1 }, 400)
        .easing(TWEEN.Easing.Cubic.InOut)
        .start();

      this.stars.speedTarget = 0.05;
      this.renderer.domElement.style.cursor = 'crosshair';
    });

    this.renderer2.listen(window, 'resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private animate(): void {
    this.ngZone.runOutsideAngular(() => {
      const loop = () => {
        if (this.destroyed) return;
        requestAnimationFrame(loop);
        TWEEN.update();
        this.controls.update();

        const time = this.clock.getDelta();
        if (this.fire) {
          this.sceneService.updateFire(this.fire);
        }
        this.stars.updateConstant();

        this.sceneService.lerp(this.rocketGroup.position, 'y', this.rocketTarget.y);
        this.sceneService.lerp(this.rocketGroup.position, 'x', this.rocketTarget.x);
        this.sceneService.lerp(this.camera.position, 'x', this.cameraTarget.x);
        this.sceneService.lerp(this.camera.position, 'z', this.cameraTarget.z);
        this.sceneService.lerp(this.stars, 'speed', this.stars.speedTarget);

        this.renderer.render(this.scene, this.camera);
      };
      loop();
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    TWEEN.removeAll();
    this.stars.points.geometry?.dispose();
    if (Array.isArray(this.fire?.material)) {
      this.fire.material.forEach(mat => mat.dispose());
    } else {
      this.fire?.material?.dispose();
    }
    this.rocketGroup?.children.forEach(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        child.material?.dispose();
      }
    });
    this.scene?.clear();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer.domElement.remove();
    }
    this.renderer = null as any;
    this.scene = null as any;
    this.camera = null as any;
    this.controls = null as any;
    this.rocketGroup = null as any;
    this.stars = null as any;
    this.fire = null as any;

    if (this.bgAudio) {
      this.bgAudio.pause();
      this.bgAudio.currentTime = 0;
      this.bgAudio = null;
    }
    if (this.starAudio) {
      this.starAudio.pause();
      this.starAudio.currentTime = 0;
      this.starAudio = null;
    }
  }
}