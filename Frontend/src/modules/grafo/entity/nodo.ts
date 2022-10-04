import { Entity } from "../../core/entity/entity";

/*
 * Nodo entity.
 * mode can be: 1|insert, 2|update
 */
export class Nodo extends Entity
{
  id:number = null;
  id_tipo:number = null;
  id_tipo_lim_amm:number = null;

  x:number = null;
  y:number = null;
  data_ini:number = null;
  data_fine: number = null;

  nota:string = null;
  toponomastica:boolean = null;

  /* Archi array (read only) */
  archi:{cod_arco:number,cod_via:number,nome_via:string}[] = null;

  /* Private attributes */
  private mode:number;

  /*
   * Static method
   */
  static getName()
  {
    return "nodo";
  }

  static getLayerKey():string
  {
    return "nodo";
  }

  static getSearchOpt(obj)
  {
    return {filter: "id|EQ|"+obj.id};
  }

  /*
   * Class method
   */
  constructor(obj:any,mode:number)
  {
    super();

    this.mode = mode;
    this.update(obj);
  }

  isNew():boolean
  {
    return this.id == null;
  }

  getType():number
  {
    return 5;
  }

  getMode():number
  {
    return this.mode;
  }

  getTitle():string
  {
    let title = "Scheda nodo: " + (this.id || "");

    if (this.data_fine && this.data_fine < new Date().getTime())
      title += " (CESSATO)";

    return title;
  }

  getDescr():number
  {
    return this.id;
  }

  getBBox():number[]
  {
    if (!this.x || !this.y)
      return null;

    /* Create bbox centered in (x,y) */
    let off = 30;

    return [this.x - off,this.y - off,this.x + off,this.y + off];
  }

  detailUrl():string
  {
    return "/nodo/detail/"+this.id;
  }

  setId(id:number)
  {
    this.id = id;
  }
}
