import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpReaderService } from './http-reader.service';
import { HttpWriterService } from './http-writer.service';

@Injectable({
  providedIn: 'root'
})

export class ModelService
{
  constructor(
    private httpReader:HttpReaderService,
    private httpWriter:HttpWriterService
  ) {}

  //count(url:string,callback:(res:number) => void)
  count(url:string,obj:object):Observable<number>
  {
    return new Observable(observer =>
    {
      this.httpReader.post(url,obj || {}).subscribe(
        res => {observer.next(res["count"] || null);},
        err => {observer.next(null);}
      );
    });
  }

  master(url:string,obj:object):Observable<object[]>
  {
    return new Observable(observer =>
    {
      this.httpReader.post(url,obj || {}).subscribe(
        res => {observer.next(res["result"] || null);},
        err => {observer.next(null);}
      );
    });
  }

  detail(url:string,obj?:object):Observable<any>
  {
    let method = obj ? "post" : "get",
      args = arguments;

    return new Observable(observer =>
    {
      this.httpReader[method].apply(this.httpReader,args).subscribe(
        res => {observer.next(res["result"] || null);},
        err => {observer.next(null);}
      );
    });
  }

  insert(url:string,obj:object):Observable<object>
  {
    return new Observable(observer =>
    {
      this.httpWriter.post(url,obj).subscribe(
        res => {observer.next(res["result"] || null);},
        err => {observer.next(null);}
      );
    });
  }

  update(url:string,obj:object):Observable<object>
  {
    return new Observable(observer =>
    {
      this.httpWriter.put(url,obj).subscribe(
        res => {observer.next(res["result"] || null);},
        err => {observer.next(null);}
      );
    });
  }

  delete(url:string):Observable<object>
  {
    return new Observable(observer =>
    {
      this.httpWriter.delete(url).subscribe(
        res => {observer.next(res["result"] || null);},
        err => {observer.next(null);}
      );
    });
  }

  upload(url:string,file:File,obj:any):Observable<object>
  {
    if (!obj) obj = {};
    obj["file[]"] = file;

    return new Observable(observer =>
    {
      this.httpWriter.upload(url,obj).subscribe(
        res => {observer.next(res["result"] || null);},
        err => {observer.next(null);}
      );
    });
  }
}
