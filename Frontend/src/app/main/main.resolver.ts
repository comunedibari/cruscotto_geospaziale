import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';

import { combineLatest,EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { HttpReaderService } from '../../modules/core/http-reader.service';

@Injectable({
  providedIn: 'root'
})

export class MainResolver implements Resolve<any>
{
  constructor(private httpReader:HttpReaderService) {}

  resolve()
  {
    return combineLatest(
      this.httpReader.get("/context/master"),
      this.httpReader.get("/login/userInfo"),
      this.httpReader.get("/auth/userPermission"),
      (ctx,ui,perm) =>
      {
        return {
          context: ctx,
          userInfo: ui,
          permission: perm
        };
      }
    ).pipe(catchError(err =>
    {
      return EMPTY;
    }));
  }
}
