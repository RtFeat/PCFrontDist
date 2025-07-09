import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { SmokeTransition } from './shaders/components/smoke-transition/smoke-transition';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, FormsModule, ReactiveFormsModule, SmokeTransition],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {

  ngOnInit(): void {
   
  }
}