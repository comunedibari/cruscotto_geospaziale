/*
 * WGStyle class
 */

import { WGStyleRole }   from './wgStyleRole';
import { WGStyleSymbol } from './wgStyleSymbol';

export class WGStyle
{
  type: number = null;
  label: WGStyleSymbol = null;
  rules: Array<WGStyleRole> = null;

  /* Local attributes */
  hasLabel:boolean;
  symbolType:string;

  /* Private attributes */
  private configObj:any = {};

  /*
   * Static method
   */
  static typeCtx()
  {
    return [
      {id:1, name:"Semplice"},
      {id:2, name:"Categorizzato"},
      {id:3, name:"A regole"}
    ];
  }

  /*
   * Methods
   */
  constructor(cfg:any)
  {
    this.update(cfg);
  }

  update(cfg:any)
  {
    if (!cfg)
      return;

    if (cfg.type) this.type = cfg.type;
    if (cfg.label) this.label = new WGStyleSymbol(cfg.label);

    /* Look for rules */
    this.rules = [];

    if (cfg.rules)
    {
      for (let j = 0;j < cfg.rules.length;j++)
        this.rules.push(new WGStyleRole(cfg.rules[j]));
    }

    /* Set local attributes */
    this.hasLabel = this.label != null;
    this.symbolType = this.getSymbolType();

    /* Update config object */
    Object.assign(this.configObj,cfg);
  }

  getConfig():any
  {
    return Object.assign({},this.configObj);
  }

  isValid():boolean
  {
    for (let j = 0;j < this.rules.length;j++)
    {
      if (!this.rules[j].isValid(this.symbolType))
        return false;
    }

    return true;
  }

  isChanged():boolean
  {
    let aOldRule = this.configObj.rules || [];

    if (this.rules.length != aOldRule.length)
      return true;

    for (let j = 0;j < this.rules.length;j++)
    {
      if (this.rules[j].isChanged(this.symbolType))
        return true;
    }

    return false;
  }

  serialize():any
  {
    let retObj = {
      type: this.type,
      rules: []
    };

    for (let j = 0;j < this.rules.length;j++)
      retObj.rules.push(this.rules[j].serialize(this.symbolType));

    return retObj;
  }

  addNewRule():WGStyleRole
  {
    /* Create and add rule */
    let rule = new WGStyleRole({op:"AND",symbol:{},conditions:[]});

    this.rules.push(rule);

    /* Return rule */
    return rule;
  }

  manageLabel()
  {
    if (this.hasLabel && !this.label)
      this.label = new WGStyleSymbol({type:"text"});
  }

  getOLType():string
  {
    if (this.label && this.label.hasDynamicAttribute())
      return 'STYLE';
    else if (this.type == 1) // Semplice
      return 'FIXED';
    else
      return 'PROPERTY'; // Categorizzato o A regole
  }

  getSymbolType():string
  {
    if (this.rules && this.rules[0] && this.rules[0].symbol)
      return this.rules[0].symbol.type;

    return null;
  }

  objForStyle1():any
  {
    if (this.rules && this.rules[0] && this.rules[0].symbol)
      return this.rules[0].symbol;

    return {};
  }

  objForStyle2():any
  {
    let retObj:any = {rules:[]};

    if (this.rules)
    {
      for (let j = 0;j < this.rules.length;j++)
        retObj.rules.push(this.rules[j].objForStyle2());

      if (this.rules[0])
      {
        if (this.rules[0].conditions && this.rules[0].conditions[0])
          retObj.attribute = this.rules[0].conditions[0].name;

        let sym = this.rules[0].symbol;
        if (sym)
        {
          retObj.id = sym.id;
          retObj.size = sym.size;
          retObj.offsetX = sym.offsetX;
          retObj.offsetY = sym.offsetY;
          retObj.strokeColor = sym.strokeColor;
          retObj.strokeWidth = sym.strokeWidth;
        }
      }
    }

    return retObj;
  }
}
