import { Inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FeedbackData } from './feedback.interface';
import {APP_CONFIG, AppConfig} from '../../app.config';

@Injectable({
  providedIn: 'root'
})
export class FeedbackService {
  private apiUrl: string;

  constructor(private http: HttpClient, @Inject(APP_CONFIG) private config: AppConfig) {
    this.apiUrl = config.apiUrl;
  }

  feedback(data: FeedbackData, headers: HttpHeaders): Observable<any> {
    return this.http.post(`${this.apiUrl}create/`, data, { headers, withCredentials: true });
  }

  getCsrfToken(): Observable<any> {
    return this.http.get(`${this.apiUrl}get-csrf-token/`, {
      withCredentials: true,
      observe: 'body'
    });
  }
}