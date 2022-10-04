/*
 * WGStyleSymbol class
 */

export class WGStyleSymbol
{
  id: number = null;
  size: number = null;
  offsetX: number = null;
  offsetY: number = null;
  strokeWidth: number = null;

  src: string = null;
  type: string = null;
  color: string = null;
  strokeColor: string = null;

  text: string = null;
  textTo: number = null;
  textFrom: number = null;
  fontSize: number = null;
  textColor: string = null;
  textBackColor: string = null;

  /* Local attribute */
  geometry: number = null;;

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
    for (let key in cfg)
    {
      if (this[key] !== undefined)
        this[key] = cfg[key];
    }
  }

  isValid(type:string):boolean
  {
    let aKey = this.requiredKeysForType(type);

    for (let j = 0;j < aKey.length;j++)
      if (!this[aKey[j]])
        return false;

    return true;
  }

  isChanged(type:string):boolean
  {
    let aKey = this.keysForType(type);

    for (let j = 0;j < aKey.length;j++)
    {
      let key = aKey[j];

      if (this[key] != this.initialCfg[key])
        return true;
    }

    return false;
  }

  serialize(type:string):any
  {
    let aKey = this.keysForType(type),
      retObj = {type: type};

    for (let j = 0;j < aKey.length;j++)
      retObj[aKey[j]] = this[aKey[j]];

    return retObj;
  }

  keysForType(type:string):Array<string>
  {
    let aKey = [];

    switch (type)
    {
      case "shape":
        aKey.push("strokeWidth","strokeColor");
      case "line":
        aKey.push("id","size","color");
        break;
      case "image":
        aKey.push("src","offsetX","offsetY");
        break;
      case "polygon":
        aKey.push("id","color","strokeWidth","strokeColor");
        break;
    }

    return aKey;
  }

  requiredKeysForType(type:string):Array<string>
  {
    let aKey = [];

    switch (type)
    {
      case "line":
      case "shape":
        aKey.push("id","size","color");
        break;
      case "image":
        aKey.push("src");
        break;
      case "polygon":
        aKey.push("id","color");
        break;
    }

    return aKey;
  }

  hasDynamicAttribute():boolean
  {
    let regExpr = new RegExp(/(\$\{.*?\})/, 'g');
    let foundedArray = regExpr.exec(this.text);

    if (!foundedArray)
      return false; //Text hasn't dinamic attribute

    //Text has dinamic attribute
    return true;
  }

  getDynamicAttribute(): Array<string>
  {
    // regular expression to retrieve attributes
    let regExprAttrDin = new RegExp(/(\$\{.*?\})/, 'g');

    // array of founded attributes
    let attrsFoundedArray = this.text.match(regExprAttrDin);

    let attrNameArray = [];

    if (attrsFoundedArray == null)
      return null;
    else
    {
      for (let i = 0; i < attrsFoundedArray.length; i++)
      {
        //remove ${...} from the begin and the end to retrieve attribute name
        attrNameArray[i] = attrsFoundedArray[i].substring(2, attrsFoundedArray[i].length-1);
      }
      return attrNameArray;
    }
  }

  getSeparatorAttribute(): Array<string>
  {
    // regular expression to retrieve separators
    let regExprSep = new RegExp(/(\}.*?\$\{.*?)/, 'g');

    // array of founded separators
    let sepFoundedArray = this.text.match(regExprSep);

    let sepArray = [];

    if (sepFoundedArray == null)
      return null;
    else
    {
      for (let i = 0; i < sepFoundedArray.length; i++)
      {
        //remove }...${ from the begin and the end to retrieve separator
        sepArray[i] = sepFoundedArray[i].substring(1,sepFoundedArray[i].length-2);
      }
      return sepArray;
    }
  }
}
