import * as THREE from 'three';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ShaderService {
  private fireMaterial: THREE.ShaderMaterial | null = null;

  createOutlineMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        offset: { value: 0.3 },
        color: { value: new THREE.Color('#000000') },
        alpha: { value: 1.0 }
      },
      vertexShader: `
        uniform float offset;
        void main() {
          vec4 pos = modelViewMatrix * vec4(position + normal * offset, 1.0);
          gl_Position = projectionMatrix * pos;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float alpha;
        void main() {
          gl_FragColor = vec4(color, alpha);
        }
      `,
      side: THREE.BackSide
    });
  }

  createFireMaterial(): THREE.ShaderMaterial {
    this.fireMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        intensity: { value: 1.0 },
        fireHeight: { value: 1.0 },
        baseColor: { value: new THREE.Color(0x330000) }, // темно-красный
        midColor: { value: new THREE.Color(0xff4400) },  // оранжевый
        topColor: { value: new THREE.Color(0xffff88) },  // желто-белый
        hotColor: { value: new THREE.Color(0x88ccff) }   // голубой для самых горячих участков
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float intensity;
        uniform float fireHeight;
        uniform vec3 baseColor;
        uniform vec3 midColor;
        uniform vec3 topColor;
        uniform vec3 hotColor;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        
        // Простая функция шума
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }
        
        // Смешанный шум
        float noise(vec2 st) {
          vec2 i = floor(st);
          vec2 f = fract(st);
          
          float a = random(i);
          float b = random(i + vec2(1.0, 0.0));
          float c = random(i + vec2(0.0, 1.0));
          float d = random(i + vec2(1.0, 1.0));
          
          vec2 u = f * f * (3.0 - 2.0 * f);
          
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }
        
        // Фрактальный шум (fBm - fractional Brownian motion)
        float fbm(vec2 st) {
          float value = 0.0;
          float amplitude = 1.0;
          float frequency = 1.0;
          
          for(int i = 0; i < 4; i++) {
            value += amplitude * noise(st * frequency);
            amplitude *= 0.5;
            frequency *= 2.0;
          }
          
          return value;
        }
        
        void main() {
          vec2 st = vUv;
          
          // Применяем fireHeight к высоте огня
          float scaledY = st.y / fireHeight;
          
          // Создаем основную форму огня
          float fireShape = 1.0 - scaledY;
          fireShape *= (1.0 - abs(st.x - 0.5) * 2.0); // сужаем к краям
          
          // Добавляем анимированный шум для создания "танца" огня
          vec2 distortion = vec2(
            fbm(st * 3.0 + vec2(time * 0.5, time * 0.8)) * 0.3,
            fbm(st * 2.0 + vec2(time * 0.3, time * 0.6)) * 0.4
          );
          
          // Применяем искажение
          vec2 distortedUV = st + distortion * fireShape;
          
          // Создаем турбулентность
          float turbulence = fbm(distortedUV * 6.0 + vec2(time * 1.2, time * 0.9));
          turbulence += fbm(distortedUV * 12.0 + vec2(time * 2.1, time * 1.4)) * 0.5;
          
          // Основная интенсивность огня
          float fireIntensity = fireShape * turbulence * intensity;
          
          // Создаем градиент температуры по высоте
          float temperatureGradient = smoothstep(0.0, 1.0, scaledY);
          
          // Добавляем мерцание
          float flicker = 0.9 + 0.1 * sin(time * 8.0 + st.x * 10.0) * sin(time * 6.0 + st.y * 8.0);
          fireIntensity *= flicker;
          
          // Определяем цвет в зависимости от интенсивности и высоты
          vec3 fireColor;
          
          if(temperatureGradient < 0.3) {
            // Низ огня - темно-красный к оранжевому
            fireColor = mix(baseColor, midColor, temperatureGradient / 0.3);
          } else if(temperatureGradient < 0.7) {
            // Середина - оранжевый к желтому
            fireColor = mix(midColor, topColor, (temperatureGradient - 0.3) / 0.4);
          } else {
            // Верх - желтый к белому/голубому для самых горячих участков
            float hotFactor = (temperatureGradient - 0.7) / 0.3;
            fireColor = mix(topColor, hotColor, hotFactor * fireIntensity);
          }
          
          // Добавляем немного синего для очень горячих участков
          float hotSpots = smoothstep(0.8, 1.0, fireIntensity) * smoothstep(0.6, 1.0, temperatureGradient);
          fireColor = mix(fireColor, hotColor, hotSpots * 0.3);
          
          // Рассчитываем прозрачность
          float alpha = fireIntensity * (1.0 - temperatureGradient * 0.3);
          alpha = smoothstep(0.1, 0.8, alpha);
          
          // Добавляем эффект "исчезновения" на краях
          float edgeFade = 1.0 - smoothstep(0.3, 0.5, abs(st.x - 0.5));
          alpha *= edgeFade;
          
          gl_FragColor = vec4(fireColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    return this.fireMaterial;
  }

  // Метод для обновления времени (вызывайте в анимационном цикле)
  updateFireTime(deltaTime: number): void {
    if (this.fireMaterial) {
      this.fireMaterial.uniforms['time'].value += deltaTime;
    }
  }

  // Методы для настройки параметров огня
  setFireIntensity(intensity: number): void {
    if (this.fireMaterial) {
      this.fireMaterial.uniforms['intensity'].value = intensity;
    }
  }

  setFireHeight(height: number): void {
    if (this.fireMaterial) {
      this.fireMaterial.uniforms['fireHeight'].value = height;
    }
  }

  // Метод для настройки цветов огня
  setFireColors(base: string, mid: string, top: string, hot: string): void {
    if (this.fireMaterial) {
      this.fireMaterial.uniforms['baseColor'].value.setHex(parseInt(base.replace('#', '0x')));
      this.fireMaterial.uniforms['midColor'].value.setHex(parseInt(mid.replace('#', '0x')));
      this.fireMaterial.uniforms['topColor'].value.setHex(parseInt(top.replace('#', '0x')));
      this.fireMaterial.uniforms['hotColor'].value.setHex(parseInt(hot.replace('#', '0x')));
    }
  }
}