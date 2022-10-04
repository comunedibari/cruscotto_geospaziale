import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()

export class ConfigService
{
  urlPrefix: any;

  /*
   * Methods
   */
  constructor(private http:HttpClient) {}

  load()
  {
    return new Promise((resolve,reject) =>
    {
      this.http.get("assets/config.json").subscribe
      (
        res =>
        {
          this.urlPrefix = res["urlPrefix"];
          resolve();
        },
        err => {reject(err);}
      );
    });
  }
}
