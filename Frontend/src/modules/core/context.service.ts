import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})

export class ContextService
{
  private context:object;

  /*
   * Method
   */
  constructor() {}

  update(ctx:object)
  {
    this.context = ctx;
  }

  getContext(name:string):object[]
  {
    return this.context[name];
  }

  getContextObj(name:string,id:any)
  {
    let ctx = this.context[name];
    if (ctx)
    {
      for (let j = 0;j < ctx.length;j++)
        if (ctx[j].id == id)
          return ctx[j];
    }

    return {};
  }
}