import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InputService {
  private inputSubject$ = new BehaviorSubject<string>('');

  constructor() { }

  changeInput(term) {
  	console.log(term);
  	this.inputSubject$.next(term);
  }

  getInput(): Observable<string> {
  	return this.inputSubject$.asObservable();
  }
}
