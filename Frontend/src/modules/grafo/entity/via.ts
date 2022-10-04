import { Entity } from "../../core/entity/entity";

/*
 * Via entity.
 * mode can be: 1|insert, 2|update, 3|cease, 4|rename
 */
export class Via extends Entity
{
  cod_via:number = null;
  id_tipo:number = null;
  id_tipo_numero:number = null;
  id_mot_cessazione:number = null;
  id_classificazione:number = null;

  denominazione:string = null;
  denom_breve:string = null;
  sottotitolo:string = null;
  denom_pura:string = null;
  larghezza:number = null;

  data_verbale:number = null;
  data_delib:number = null;
  num_delib:string = null;
  data_fine:number = null;
  data_ini:number = null;
  data_inserimento:number = null;
  prev_via:number = null;
  nota:string = null;

  descrizione_alt1:string = null;
  descrizione_alt2:string = null;
  descrizione_alt3:string = null;
  descrizione_alt4:string = null;
  descrizione_alt5:string = null;
  descrizione_alt6:string = null;

  localita:string[] = null;
  municipio:string[] = null;

  /* Read only attributes (comes from arco) */
  lunghezza:number = null;
  civiminp:number = null;
  civimaxp:number = null;
  civimind:number = null;
  civimaxd:number = null;
  extent:number[] = null;

  /* Archi array (read only) */
  archi:{
    cod_arco: number,
    cod_via: string
  }[] = null;

  /* Private attributes */
  private mode:number;

  /*
   * Static method
   */
  static getName()
  {
    return "via";
  }

  static getLayerKey():string
  {
    return "arco";
  }

  static getSearchOpt(obj)
  {
    if (!obj || (!obj.cod_via && !obj.denominazione))
      return;

    return {
      ord: "denominazione|ASC",
      filter: obj.cod_via ?
        `cod_via|EQ|${obj.cod_via}` :
        `denominazione|ILIKE|%${obj.denominazione}%`
    };
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
    return this.cod_via == null;
  }

  getType():number
  {
    return 1;
  }

  getMode():number
  {
    return this.data_fine || this.mode;
  }

  getTitle():string
  {
    if (this.mode == 4)
      return "Ridenominazione via";

    let title = "Scheda via: " + (this.denom_pura || "");

    if (this.data_fine && this.data_fine < new Date().getTime())
      title += " (CESSATA)";

    return title;
  }

  getDescr():string
  {
    return this.cod_via+" - "+this.denominazione;
  }

  getBBox():number[]
  {
    return this.extent;
  }

  detailUrl():string
  {
    return "/via/detail/"+this.cod_via;
  }
}
