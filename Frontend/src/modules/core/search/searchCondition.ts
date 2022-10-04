export class SearchCond
{
  id: number = null;
  attr: string = null;
  op: string = null;
  value: any = null;

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

  serialize()
  {
    let value = this.value;
    if(this.op == "ILIKE" || this.op == "LIKE") // Add % before and after value
      value = "%" + value + "%";

    if (this.op === 'IS_NOT' || this.op === 'IS_NULL')
      return this.op === 'IS_NULL' ? this.attr + "|IS|null" : this.attr + "|" + this.op + "|null";
    else
      return this.attr + "|" + this.op + "|" + value;
  }
}
