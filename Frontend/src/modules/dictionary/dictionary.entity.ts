export class Dictionary
{
  id:number;
  name:string;
  config:{id:number,name:string};

  /*
   * Method
   */
  constructor(obj)
  {
    if (!obj)
      obj = {};

    this.id = obj.id;
    this.name = obj.name;
    this.config = obj;
  }

  update()
  {
    this.config.id = this.id;
    this.config.name = this.name;
  }

  restore()
  {
    this.id = this.config.id;
    this.name = this.config.name;
  }

  changedObj()
  {
    var aKey = ["id","name"], retObj = {};

    for (var j = 0;j < aKey.length;j++)
    {
      var key = aKey[j];

      if (this[key] != this.config[key])
        retObj[key] = this[key];
    }

    return Object.keys(retObj).length ? retObj : null;
  }
}
