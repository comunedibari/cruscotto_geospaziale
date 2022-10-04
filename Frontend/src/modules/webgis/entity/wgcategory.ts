/*
 * WGCategory class
 */

export class WGCategory
{
  id: number = null;
  label: string = null;
  _position: number = null;
  permission: string = null;
  manageable: boolean = null;

  /*
   * Methods
   */
  constructor(cfg:object)
  {
  }

  update(cfg:object)
  {
    if (!cfg)
      return;

    for (let key in cfg)
    {
      if (key != "layers" && this[key] !== undefined)
        this[key] = cfg[key];
    }
  }
}
