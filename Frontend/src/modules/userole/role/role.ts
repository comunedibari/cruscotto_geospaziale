/*
 * Role class
 */
import { Entity } from "../../core/entity/entity";

export class Role extends Entity  {
  id: number = null;
  name: string = null;
  descr: string = null;
  creation_date: number = null;
  permission: number[] = null;
  readonly: boolean = null;
  permObj: Object = {};

  constructor(objCfg)
  {
    super();
    this.update(objCfg);
  }

  update(obj)
  {
    if (!obj)
      obj = {};

    /* Call entity update */
    super.update(obj);

    if (obj.permission && obj.permission.hasOwnProperty('add') && obj.permission.hasOwnProperty('del'))
      this.updateChangedPermission();

    if (!obj.permission)
      obj.permission = [];

    // Process permission
    for (let i = 0;i < obj.permission.length;i++)
      this.permObj[obj.permission[i]] = true;

  }

  getChangedPermission(retObj)
  {
    if (!retObj)
      retObj = {};

    retObj['permission'] = {add:[], del:[]};

    // Look for permission
    for (let key in this.permObj)
    {
      var pId = Number(key), pVal = this.permObj[key];

      if (this.permission)
      {
        if (pVal == false && this.permission.indexOf(pId) >= 0)
          retObj['permission']['del'].push(pId);
        else if (pVal == true && this.permission.indexOf(pId) < 0)
          retObj['permission']['add'].push(pId);
      }
      else
        retObj['permission']['add'].push(pId);
    }

    if (!retObj['permission']['add'].length && !retObj['permission']['del'].length)
    {
      delete retObj['permission'];

      // Look for if the retObj is empty
      if (Object.keys(retObj).length == 0)
        retObj = null;
    }

    return retObj;

  }

  getName()
  {
    return 'role';
  }

  private updateChangedPermission()
  {
    this.permission = [];
    for (let id in this.permObj)
    {
      if (this.permObj[id] == true)
        this.permission.push(Number(id));
      else
        delete this.permObj[id];
    }
  }
}

