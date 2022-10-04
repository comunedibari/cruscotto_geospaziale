/*
 * Entity interface
 */

export class Entity
{
  constructor() {}

  update(data:object)
  {
    for (let key in data)
    {
      if (this[key] !== undefined)
        this[key] = data[key];
    }
  }
}
