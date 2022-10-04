import { Entity } from "../../core/entity/entity";

/*
 * Arco entity.
 * mode can be: 1|insert, 2|update, 3|remove
 */
export class Arco extends Entity
{
  cod_arco:number = null;
  cod_via:number = null;
  nome_via:string = null;

  corsie:number = null;
  cresciv:number = null;
  lunghezza:number = null;
  larghezza:number = null;
  superficie:number = null;
  determ_valore:number = null;
  id_delib_denom:number = null;
  id_delib_propr:number = null;

  mt_a:number = null;
  mt_da:number = null;
  nodo_a:number = null;
  nodo_da:number = null;
  cod_via_a:number = null;
  cod_via_da:number = null;
  prog_x_via:number = null;
  prev_arco:number = null;
  prev_arco_suppl:number = null;

  data_imm:number = null;
  data_ini:number = null;
  data_fine:number = null;
  data_ri_mappa:number = null;
  data_pros_int:number = null;

  id_uso:number = null;
  id_tipo:number = null;
  id_sede:number = null;
  id_fondo:number = null;
  id_fonte:number = null;
  id_classe:number = null;
  id_marcia:number = null;
  id_origine:number = null;
  id_livello:number = null;
  id_portata:number = null;
  id_sezione:number = null;
  id_stra_cs:number = null;
  id_paviment:number = null;
  id_proprieta:number = null;
  id_tipologia:number = null;
  id_viabilita:number = null;
  id_fondazione:number = null;
  id_class_funz:string = null;
  id_stato_cons:number = null;
  id_quart_pari:number = null;
  id_quart_disp:number = null;
  id_muni_pari:number = null;
  id_muni_disp:number = null;
  id_carreggiata:number = null;
  id_corpi_illum:number = null;
  id_funzionalita:number = null;
  id_tipo_lim_amm:number = null;
  id_stato_esercizio:number = null;
  id_senso_percorrenza:number = null;

  civiminp:number = null;
  espominp:string = null;
  civimaxp:number = null;
  espomaxp:string = null;
  civimind:number = null;
  espomind:string = null;
  civimaxd:number = null;
  espomaxd:string = null;

  estr_verif:boolean = null;
  senso_perc:boolean = null;

  x_min:number = null;
  x_max:number = null;
  y_min:number = null;
  y_max:number = null;

  points:number[] = null;

  nodeFrom:object = null;
  nodeTo:object = null;

  /* UNUSED
  testo:string = null;
  ora_vari:string = null;
  localita:string = null;
  data_ult_man:number = null;
  zigzag:boolean = null;
  acqued:boolean = null;
  gasdot:boolean = null;
  elettr:boolean = null;
  scolina:boolean = null;
  telefoni:boolean = null;
  guardrail:boolean = null;
  pista_cicl:boolean = null;
  fogne_nere:boolean = null;
  operedarte:boolean = null;
  marciapiede:boolean = null;
  centro_edif:boolean = null;
  fogne_bianche:boolean = null;
  segnaletica_vert:boolean = null;
  segnaletica_oriz:boolean = null;
  id_fondaz_1:number = null;
  id_fondaz_2:number = null;
  id_fondaz_3:number = null;
  id_fondaz_4:number = null;
  prof_fondaz_1:number = null;
  prof_fondaz_2:number = null;
  prof_fondaz_3:number = null;
  prof_fondaz_4:number = null;
  */

  /* Object used to store map changed attributes */
  mapChange:any;

  /* Private attributes */
  private mode:number;

  /*
   * Static method
   */
  static getName()
  {
    return "arco";
  }

  static getLayerKey():string
  {
    return "arco";
  }

  static getSearchOpt(obj)
  {
    if (!obj)
      return null;

    if (!obj.cod_arco && !obj.cod_via)
      return null;

    return {
      ord: "cod_arco|ASC",
      filter: obj.cod_arco ?
        `cod_arco|EQ|${obj.cod_arco}` :
        `cod_via|EQ|${obj.cod_via}`
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
    return this.cod_arco == null;
  }

  getType():number
  {
    return 2;
  }

  getMode():number
  {
    return this.data_fine || this.mode;
  }

  getTitle():string
  {
    let title = "Scheda arco: " + (this.cod_arco || "");

    if (this.data_fine && this.data_fine < new Date().getTime())
      title += " (CESSATO)";

    return title;
  }

  getDescr():string
  {
    return "Codice: "+this.cod_arco+" - Codice via: "+this.cod_via;
  }

  getBBox():number[]
  {
    if (!this.x_min || !this.y_min || !this.x_max || !this.y_max)
      return null;

    return [this.x_min,this.y_min,this.x_max,this.y_max];
  }

  detailUrl():string
  {
    return "/arco/detail/"+this.cod_arco;
  }

  setId(id:number)
  {
    this.cod_arco = id;
  }
}
