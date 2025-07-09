import * as THREE from 'three';

interface ParticleOptions {
  color?: number;
  size?: number;
  pointCount?: number;
  rangeH?: number;
  rangeV?: number;
  speed?: number;
}

export class Particles extends THREE.Group {
  color: number;
  size: number;
  pointCount: number;
  rangeH: number;
  rangeV: number;
  speed: number;
  speedTarget: number;
  points: THREE.Points;

  constructor(options: ParticleOptions) {
    super();
    this.color = options.color || 0x333333;
    this.size = options.size || 0.4;
    this.pointCount = options.pointCount || 40;
    this.rangeH = options.rangeH || 1;
    this.rangeV = options.rangeV || 2;
    this.speed = this.speedTarget = options.speed || 0.0005;

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 3;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = '#fff';
    ctx.fill();

    const texture = new THREE.Texture(canvas);
    texture.premultiplyAlpha = true;
    texture.needsUpdate = true;

    const pointsGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.pointCount * 3);
    const velocities = new Float32Array(this.pointCount * 3);

    for (let p = 0; p < this.pointCount; p++) {
      positions[p * 3] = THREE.MathUtils.randFloatSpread(this.rangeH);
      positions[p * 3 + 1] = THREE.MathUtils.randFloatSpread(this.rangeV);
      positions[p * 3 + 2] = THREE.MathUtils.randFloatSpread(this.rangeH);
      velocities[p * 3 + 1] = -Math.random() * this.speed * 100;
    }

    pointsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointsGeo.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

    const pointsMat = new THREE.PointsMaterial({
      color: this.color,
      size: this.size,
      map: texture,
      transparent: true,
      depthWrite: false
    });

    this.points = new THREE.Points(pointsGeo, pointsMat);
    this.points.position.y = -this.rangeV / 2;
    this.add(this.points);
  }

  updateConstant(): void {
    const positions = this.points.geometry.attributes['position'].array as Float32Array;
    const velocities = this.points.geometry.attributes['velocity'].array as Float32Array;

    for (let p = 0; p < this.pointCount; p++) {
      const y = positions[p * 3 + 1];
      if (y < -this.rangeV / 2) {
        positions[p * 3 + 1] = this.rangeV / 2;
      }
      positions[p * 3 + 1] -= this.speed;
    }

    this.points.geometry.attributes['position'].needsUpdate = true;
  }
}