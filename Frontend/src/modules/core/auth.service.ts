import { Injectable } from '@angular/core';

import { HttpReaderService } from './http-reader.service';
import { HttpWriterService } from './http-writer.service';

@Injectable({
  providedIn: 'root'
})

export class AuthService
{
  userInfo:object;
  permission:object;

  private token:string;

  /*
   * Methods
   */
  constructor(
    private httpReader:HttpReaderService,
    private httpWriter:HttpWriterService
  ) {}

  setToken(value:string)
  {
    this.token = value;

    this.httpReader.setAuthHeader(value);
    this.httpWriter.setAuthHeader(value);
  }

  getToken(): string
  {
    return this.token;
  }

  allPerm():string[]
  {
    let aRet = [];

    for (let key in this.permission)
        aRet = aRet.concat(this.permission[key].name || []);

    return aRet;
  }

  allPermId():number[]
  {
    let aRet = [];

    for (let key in this.permission)
        aRet = aRet.concat(this.permission[key].id || []);

    return aRet;
  }

  permForModule(name:string):string[]
  {
    if (this.permission && this.permission[name])
      return this.permission[name].name;

    return [];
  }

  permIdForModule(name:string):number[]
  {
    if (this.permission && this.permission[name])
      return this.permission[name].id;

    return [];
  }
}
