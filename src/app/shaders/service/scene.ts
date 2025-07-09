import * as THREE from 'three';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SceneService {
  updateFire(fire: THREE.Mesh): void {
    fire.scale.y = THREE.MathUtils.randFloat(0.04, 0.07);
  }

  lerp(object: any, prop: string, destination: number): void {
    if (object && object[prop] !== destination) {
      object[prop] += (destination - object[prop]) * 0.1;
      if (Math.abs(destination - object[prop]) < 0.01) {
        object[prop] = destination;
      }
    }
  }
}