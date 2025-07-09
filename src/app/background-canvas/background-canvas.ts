import {AfterViewInit, Component, OnDestroy} from '@angular/core';
import {RouterOutlet} from '@angular/router';

interface Options {
  startingHue: number;
  clickLimiter: number;
  timerInterval: number;
  showTargets: boolean;
  rocketSpeed: number;
  rocketAcceleration: number;
  particleFriction: number;
  particleGravity: number;
  particleMinCount: number;
  particleMaxCount: number;
  particleMinRadius: number;
  particleMaxRadius: number;
}

interface Mouse {
  down: boolean;
  x: number;
  y: number;
}

@Component({
  selector: 'app-background-canvas',
  imports: [RouterOutlet],
  templateUrl: './background-canvas.html',
  styleUrl: './background-canvas.scss'
})

export class BackgroundCanvas implements AfterViewInit, OnDestroy{
  public options: Options = {
    startingHue: 120,
    clickLimiter: 5,
    timerInterval: 40,
    showTargets: true,
    rocketSpeed: 2,
    rocketAcceleration: 1.03,
    particleFriction: 0.95,
    particleGravity: 1,
    particleMinCount: 25,
    particleMaxCount: 40,
    particleMinRadius: 3,
    particleMaxRadius: 5
  };

  public fireworks: Firework[] = [];
  public particles: Particle[] = [];
  public mouse: Mouse = { down: false, x: 0, y: 0 };
  public currentHue = this.options.startingHue;
  public clickLimiterTick = 0;
  public timerTick = 0;
  public cntRocketsLaunched = 0;

  public canvas!: HTMLCanvasElement;
  public canvasCtx!: CanvasRenderingContext2D;
  public canvasWidth!: number;
  public canvasHeight!: number;
  public animationFrameId: number = 0;

  ngAfterViewInit() {
    this.initFireworks();
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.onResize);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
    cancelAnimationFrame(this.animationFrameId);
  }

  public initFireworks() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.canvasWidth = window.innerWidth;
    this.canvasHeight = window.innerHeight;
    this.canvasCtx = this.canvas.getContext('2d')!;
    this.resizeCanvas();

    window.addEventListener('resize', this.onResize);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mouseup', this.onMouseUp);

    this.gameLoop();
    console.log('gameLoop tick', this.fireworks.length, this.particles.length, this.timerTick);
  }

  public onResize = () => {
    this.canvasWidth = window.innerWidth;
    this.canvasHeight = window.innerHeight;
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
  };

  public onMouseMove = (e: MouseEvent) => {
    e.preventDefault();
    this.mouse.x = e.pageX - this.canvas.offsetLeft;
    this.mouse.y = e.pageY - this.canvas.offsetTop;
  };

  public onMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    this.mouse.down = true;
  };

  public onMouseUp = (e: MouseEvent) => {
    e.preventDefault();
    this.mouse.down = false;
  };

  public resizeCanvas() {
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
  }

  public random(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  public calculateDistance(p1x: number, p1y: number, p2x: number, p2y: number): number {
    const xDistance = p1x - p2x;
    const yDistance = p1y - p2y;
    return Math.sqrt(xDistance * xDistance + yDistance * yDistance);
  }

  public createParticles = (x: number, y: number) => {
    const particleCount = Math.round(this.random(this.options.particleMinCount, this.options.particleMaxCount));
    for (let i = 0; i < particleCount; i++) {
      this.particles.push(new Particle(x, y, this));
    }
  };

  public gameLoop = () => {
    this.animationFrameId = requestAnimationFrame(this.gameLoop);

    this.currentHue += 0.5;

    this.canvasCtx.globalCompositeOperation = 'destination-out';
    this.canvasCtx.fillStyle = 'rgb(0, 0, 0)';
    this.canvasCtx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    this.canvasCtx.globalCompositeOperation = 'lighter';

    for (let i = this.fireworks.length - 1; i >= 0; i--) {
      this.fireworks[i].draw();
      this.fireworks[i].update(i);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].draw();
      this.particles[i].update(i);
    }

    this.canvasCtx.fillStyle = 'white';
    this.canvasCtx.font = '20px Arial';

    if (this.timerTick >= this.options.timerInterval) {
      if (!this.mouse.down) {
        this.fireworks.push(new Firework(
          this.canvasWidth / 2,
          this.canvasHeight,
          this.random(0, this.canvasWidth),
          this.random(0, this.canvasHeight / 2),
          this
        ));
        this.timerTick = 0;
      }
    } else {
      this.timerTick++;
    }

    if (this.clickLimiterTick >= this.options.clickLimiter) {
      if (this.mouse.down) {
        this.fireworks.push(new Firework(
          this.canvasWidth / 2,
          this.canvasHeight,
          this.mouse.x,
          this.mouse.y,
          this
        ));
        this.clickLimiterTick = 0;
      }
    } else {
      this.clickLimiterTick++;
    }
  };
}

// --- Firework class ---
class Firework {
  x: number;
  y: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  distanceToTarget: number;
  distanceTraveled: number;
  coordinates: [number, number][];
  coordinateCount: number;
  angle: number;
  speed: number;
  acceleration: number;
  brightness: number;
  hue: number;
  targetRadius: number;
  targetDirection: boolean;
  public app: BackgroundCanvas;

  constructor(sx: number, sy: number, tx: number, ty: number, app: BackgroundCanvas) {
    this.app = app;
    this.x = this.sx = sx;
    this.y = this.sy = sy;
    this.tx = tx;
    this.ty = ty;
    this.distanceToTarget = app.calculateDistance(sx, sy, tx, ty);
    this.distanceTraveled = 0;
    this.coordinateCount = 3;
    this.coordinates = [];
    while (this.coordinateCount--) {
      this.coordinates.push([this.x, this.y]);
    }
    this.angle = Math.atan2(ty - sy, tx - sx);
    this.speed = app.options.rocketSpeed;
    this.acceleration = app.options.rocketAcceleration;
    this.brightness = app.random(100, 100);
    this.hue = app.currentHue;
    this.targetRadius = 1;
    this.targetDirection = false;
    app.cntRocketsLaunched++;
  }

  update(index: number) {
    this.coordinates.pop();
    this.coordinates.unshift([this.x, this.y]);

    if (!this.targetDirection) {
      if (this.targetRadius < 10)
        this.targetRadius += 0.15;
      else
        this.targetDirection = true;
    } else {
      if (this.targetRadius > 1)
        this.targetRadius -= 0.15;
      else
        this.targetDirection = false;
    }

    this.speed *= this.acceleration;

    const vx = Math.cos(this.angle) * this.speed;
    const vy = Math.sin(this.angle) * this.speed;
    this.distanceTraveled = this.app.calculateDistance(this.sx, this.sy, this.x + vx, this.y + vy);

    if (this.distanceTraveled >= this.distanceToTarget) {
      this.app.createParticles(this.tx, this.ty);
      this.app.fireworks.splice(index, 1);
    } else {
      this.x += vx;
      this.y += vy;
    }
  }

  draw() {
    const ctx = this.app.canvasCtx;
    const lastCoordinate = this.coordinates[this.coordinates.length - 1];
    ctx.beginPath();
    ctx.moveTo(lastCoordinate[0], lastCoordinate[1]);
    ctx.lineTo(this.x, this.y);
    ctx.strokeStyle = `hsl(${this.hue},100%,${this.brightness}%)`;
    ctx.stroke();

    if (this.app.options.showTargets) {
      ctx.beginPath();
      ctx.arc(this.tx, this.ty, this.targetRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

// --- Particle class ---
class Particle {
  x: number;
  y: number;
  coordinates: [number, number][];
  coordinateCount: number;
  angle: number;
  speed: number;
  friction: number;
  gravity: number;
  hue: number;
  brightness: number;
  alpha: number;
  decay: number;
  public app: BackgroundCanvas;

  constructor(x: number, y: number, app: BackgroundCanvas) {
    this.app = app;
    this.x = x;
    this.y = y;
    this.coordinateCount = 5;
    this.coordinates = [];
    while (this.coordinateCount--) {
      this.coordinates.push([this.x, this.y]);
    }
    this.angle = app.random(0, Math.PI * 2);
    this.speed = app.random(1, 10);
    this.friction = app.options.particleFriction;
    this.gravity = app.options.particleGravity;
    this.hue = app.random(app.currentHue - 20, app.currentHue + 20);
    this.brightness = app.random(50, 80);
    this.alpha = 1;
    this.decay = app.random(0.01, 0.03);
  }

  update(index: number) {
    this.coordinates.pop();
    this.coordinates.unshift([this.x, this.y]);
    this.speed *= this.friction;
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed + this.gravity;
    this.alpha -= this.decay;
    if (this.alpha <= this.decay) {
      this.app.particles.splice(index, 1);
    }
  }

  draw() {
    const ctx = this.app.canvasCtx;
    const lastCoordinate = this.coordinates[this.coordinates.length - 1];
    const radius = Math.round(this.app.random(this.app.options.particleMinRadius, this.app.options.particleMaxRadius));
    const gradient = ctx.createRadialGradient(this.x, this.y, 2, this.x, this.y, radius);
    gradient.addColorStop(0.0, 'white');
    gradient.addColorStop(0.2, 'white');
    gradient.addColorStop(1.0, 'black');
    ctx.beginPath();
    ctx.fillStyle = gradient;
    ctx.arc(this.x, this.y, radius, -2, Math.PI * 2, false);
    ctx.fill();
  }
}
