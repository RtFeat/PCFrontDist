export interface Animal {
  id: number;
  name: string;
  description: string;
  status: string;
  imageUrl: string;
}

export interface NavigationItem {
  index: number;
  isActive: boolean;
}

export interface SliderConfig {
  autoSlide: boolean;
  autoSlideInterval: number;
  animationDuration: number;
}

export type SliderDirection = 'next' | 'prev';

export interface SliderState {
  currentSlide: number;
  totalSlides: number;
  isAnimating: boolean;
}