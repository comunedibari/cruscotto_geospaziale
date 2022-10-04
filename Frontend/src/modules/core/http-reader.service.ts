import { Injectable } from '@angular/core';
import { HttpClient,HttpHeaders } from '@angular/common/http';

import { ConfigService } from './config.service'

/*
 * Define get/delete option
 */
const gdOpt =
{
  headers: {}
};

/*
 * Define post/put option
 */
const ppOpt =
{
  headers: {"Content-Type":"application/json"}
};

/*
 * Http reader service
 */
@Injectable({
  providedIn: 'root'
})

export class HttpReaderService
{
  private prefix:string;

  constructor(private http:HttpClient,private configSvc:ConfigService)
  {
    this.prefix = this.configSvc.urlPrefix.er || "";
  }

  setAuthHeader(value:string)
  {
    gdOpt.headers["it_app_auth"] = value;
    ppOpt.headers["it_app_auth"] = value;
  }

  get(url:string)
  {
    return this.http.get(this.prefix+url,gdOpt);
  }

  post(url:string,body:any)
  {
    return this.http.post(this.prefix+url,body,ppOpt);
  }
}
