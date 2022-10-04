import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class NavbarService
{
  menuAction = new Subject<string>();

  /*
   * Class method
   */
  constructor() {}

  notifyMenuAction(action:string)
  {
    this.menuAction.next(action);
  }
}
