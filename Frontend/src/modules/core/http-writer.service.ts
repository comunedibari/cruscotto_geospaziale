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
 * Define put/post option
 */
const ppOpt =
{
  headers: {"Content-Type":"application/json"}
};

/*
 * Http writer service
 */
@Injectable({
  providedIn: 'root'
})

export class HttpWriterService
{
  private prefix:string;

  constructor(private http:HttpClient,private configSvc:ConfigService)
  {
    this.prefix = this.configSvc.urlPrefix.ew || "";
  }

  setAuthHeader(value:string)
  {
    gdOpt.headers["it_app_auth"] = value;
    ppOpt.headers["it_app_auth"] = value;
  }

  put(url:string,body:any)
  {
    return this.http.put(this.prefix+url,body,ppOpt);
  }

  post(url:string,body:any)
  {
    return this.http.post(this.prefix+url,body,ppOpt);
  }

  delete(url:string)
  {
    return this.http.delete(this.prefix+url,gdOpt);
  }

  upload(url:string,body:any)
  {
    /* Prepare body */
    let fd = new FormData();

    for (var key in body)
      fd.append(key,body[key]);

    /* Prepare option */
    let opt = {
      headers: {"it_app_auth": ppOpt.headers["it_app_auth"]}
    };

    /* Exec post */
    return this.http.post(this.prefix+url,fd,opt);
  }
}
