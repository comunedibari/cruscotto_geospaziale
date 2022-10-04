import { Entity } from "../../core/entity/entity";

/*
 * Edificio entity.
 * mode can be: 1|insert, 2|update, 3|remove
 */
export class Edificio extends Entity
{
  id:number = null;
  id_tipo:number = null;
  id_stato:number = null;
  id_diff_catasto:number = null;
  id_uso_prevalente:number = null;
  id_mot_cessazione:number = null;

  ac_anno:number = null;
  anno_costr:number = null;
  ppi_anno:number = null;
  denominatore:number = null;

  data_ini:number = null;
  data_fine:number = null;
  data_ri_mappa:number = null;
  data_ins_mappa:number = null;

  foglio:string = null;
  numero:string = null;
  sezione:string = null;
  ac_numero:string = null;
  ppi_numero:string = null;
  cod_comune:string = null;
  edificialita:string = null;
  denominazione:string = null;
  sezione_urbana:string = null;

  sotterraneo:boolean = null;

  x_min:number = null;
  x_max:number = null;
  y_min:number = null;
  y_max:number = null;

  /* UNUSED
  lnba:number = null;
  lnba_qualita:number = null;
  ppi_qualita:number = null;
  qualita_anno_costr:number = null;
  qualita_uso_prevalente:number = null;
  */

  /* Civici array (read only) */
  civici:{
    id: number,
    numero: number,
    cod_via: number,
    nome_via: string,
    esponente: string
  }[] = null;

  // extra attributes
  extraAttrs:{} = null;

  /* Object used to store map changed attributes */
  mapChange:any;

  /* Private attributes */
  private mode:number;

  /*
   * Static method
   */
  static getName()
  {
    return "edificio";
  }

  static getLayerKey():string
  {
    return "edificio";
  }

  static getSearchOpt(obj)
  {
    if (obj.id)
    {
      return {filter: "id|EQ|"+obj.id};
    }
    else
    {
      let strFilter = "";

      if (obj.sezione)
        strFilter = "sezione|EQ|"+obj.sezione;

      if (obj.foglio)
      {
        if (obj.sezione)
          strFilter += ";";

        strFilter +=  "foglio|EQ|"+obj.foglio;
      }

      if (obj.numero)
      {
        if (obj.sezione || obj.foglio)
          strFilter += ";";

        strFilter +=  "numero|EQ|"+obj.numero;
      }

      return {filter:strFilter};
    }
  }

  /*
   * Class method
   */
  constructor(obj,mode)
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
    return 4;
  }

  getMode():number
  {
    return this.data_fine || this.mode;
  }

  getTitle():string
  {
    let title = "Scheda edificio: " + (this.id || "");

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
    if (!this.x_min || !this.y_min || !this.x_max || !this.y_max)
      return null;

    return [this.x_min,this.y_min,this.x_max,this.y_max];
  }

  detailUrl():string
  {
    return "/edificio/detail/"+this.id;
  }

  setId(id:number)
  {
    this.id = id;
  }

  getExtraAttrByName(attrName:string):any
  {
    if (this.extraAttrs && this.extraAttrs.hasOwnProperty(attrName))
    {
      return this.extraAttrs[attrName];
    }

    return null;
  }

  setExtraAttr(attrName:string, attrValue:any):void
  {
    if (!this.extraAttrs)
      this.extraAttrs = {};

    this.extraAttrs[attrName] = attrValue
  }
}
