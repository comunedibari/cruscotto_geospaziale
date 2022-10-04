/*
 * WGStyleRole class
 * WGStyleRuleCond class
 */

import { WGStyleSymbol } from './wgStyleSymbol';

export class WGStyleRole
{
  op: string = null;
  name: string = null;
  symbol: WGStyleSymbol = null;
  conditions: Array<WGStyleRuleCond> = null;

  /* Private attributes */
  private initialCfg:any = {};

  /*
   * Methods
   */
  constructor(cfg:any)
  {
    Object.assign(this.initialCfg,cfg);

    this.update(cfg);
  }

  update(cfg:any)
  {
    this.conditions = [];

    for (let key in cfg)
    {
      switch (key)
      {
        case "symbol":
          this.symbol = new WGStyleSymbol(cfg.symbol);
          break;
        case "conditions":
          if (cfg.conditions)
          {
            for (let i = 0;i < cfg.conditions.length;i++)
              this.conditions.push(new WGStyleRuleCond(cfg.conditions[i]));
          }
          break;
        default:
          this[key] = cfg[key];
          break;
      }
    }
  }

  isValid(symbolType:string):boolean
  {
    let retVal = this.op != null && this.name != null && this.name != "" &&
      this.symbol.isValid(symbolType);

    if (retVal && this.conditions)
    {
      for (let j = 0;j < this.conditions.length;j++)
        if (!this.conditions[j].isValid())
          return false;
    }

    return retVal;
  }

  isChanged(symbolType:string):boolean
  {
    let retVal = this.op != this.initialCfg.op ||
      this.name != this.initialCfg.name ||
      this.symbol.isChanged(symbolType);

    if (!retVal && this.conditions)
    {
      let aOldCond = this.initialCfg.conditions || [];

      if (this.conditions.length != aOldCond.length)
        return true;

      for (let j = 0;j < this.conditions.length;j++)
        if (this.conditions[j].isChanged())
          return true;
    }

    return retVal;
  }

  serialize(symbolType:string):any
  {
    let retObj = {
      op: this.op,
      name: this.name,
      symbol: this.symbol.serialize(symbolType),
      conditions: []
    };

    if (this.conditions)
    {
      for (let j = 0;j < this.conditions.length;j++)
        retObj.conditions.push(this.conditions[j].serialize());
    }

    return retObj;
  }

  objForStyle2():any
  {
    let retObj = {
      val: null,
      lbl: this.name,
      src: null,
      color: null,
      strokeColor: null
    };

    if (this.conditions && this.conditions[0])
      retObj.val = this.conditions[0].value;

    if (this.symbol)
    {
      retObj.src = this.symbol.src;
      retObj.color = this.symbol.color;
      retObj.strokeColor = this.symbol.strokeColor;
    }

    return retObj;
  }
}

export class WGStyleRuleCond
{
  op: string;
  name: string;
  value: any;

  /* Private attributes */
  private initialCfg:any = {};

  /*
   * Methods
   */
  constructor(cfg:any)
  {
    Object.assign(this.initialCfg,cfg);

    if (cfg)
    {
      this.op = cfg.op;
      this.name = cfg.name;
      this.value = cfg.value;
    }
  }

  isValid():boolean
  {
    if (this.op == 'IS_NULL' || this.op == 'IS_NOT')
      return this.op != null && this.name != null;
    else
      return this.op != null && this.name != null &&
        this.value != null && this.value != "";
  }

  isChanged():boolean
  {
    return this.op != this.initialCfg.op ||
      this.name != this.initialCfg.name ||
      this.value != this.initialCfg.value;
  }

  serialize():any
  {
    return {
      op: this.op,
      name: this.name,
      value: this.value
    };
  }
}
