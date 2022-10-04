
import {Entity} from "../../../core/entity/entity";

export class Print extends Entity
{
  title: string = null;
  description: string = null;
  format:string = null;
  orientation:string = null;
  scale:string = null;
  dpi:string = null;
  legend: boolean = false;
  overview: boolean = false;

  /*
   * Class method
   */
  constructor(obj)
  {
    super();
    this.update(obj);
  }
}
