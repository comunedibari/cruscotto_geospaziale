/*
 * User class
 */
import { Entity } from "../../core/entity/entity";

export class User extends Entity {
  id: number = null;
  name: string = null;
  surname: string = null;
  phone: string = null;
  password: string = null;
  email: string = null;
  username: string = null;
  creation_date: number = null;
  enabled: boolean = null;
  role: number[] = null;
  fullname: string;
  wso2_username: string = null;

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

    if (obj.wso2_username == '')
      this.wso2_username = null;

    if (obj.role && obj.role.hasOwnProperty('add') && obj.role.hasOwnProperty('del'))
      this.role = obj.role.add;

    /* Set custom attribute */
    if(this.name && this.surname)
      this.fullname = this.name+" "+this.surname;
    else if (!this.name)
      this.fullname = this.surname;
    else if (!this.surname)
      this.fullname = this.name;
    else
      this.fullname = null;
  }

  getName()
  {
    return 'user';
  }

  getChangedRole(role)
  {
    // Manage role
    let retObj = {add:[], del:[]};

    if (role)
      retObj.add = role;
    if (this.role)
      retObj.del = this.role;

    return retObj;
  }

}
