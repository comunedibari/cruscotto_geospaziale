import { Entity } from "../../core/entity/entity";

/*
 * Civico entity.
 * mode can be: 1|insert, 2|update 3|remove, 4|renumber, 5|move
 */
export class Civico extends Entity
{
  id:number = null;
  numero:number = null;
  cod_via:number = null;
  cod_arco:number = null;
  id_edificio:number[] = null;
  id_lato_strada:number = null;
  id_tipo_ingresso:number = null;
  id_mot_cessazione:number = null;
  id_mot_inserimento:number = null;
  id_civico_principale:number = null;

  nota:string = null;
  nome_via:string = null;
  esponente:string = null;
  tipo_ingr:string = null;
  estensione:string = null;
  numero_delib:string = null;

  x:number = null;
  y:number = null;
  cap:number = null;
  targa_x:number = null;
  targa_y:number = null;
  targa_ang:number = null;
  prev_civico:number = null;
  proiezione_x:number = null;
  proiezione_y:number = null;

  serv_rsu:boolean = null;
  carrabile:boolean = null;
  provvisorio:boolean = null;
  accesso_multiplo:boolean = null;

  data_ini:number = null;
  data_fine:number = null;
  data_ri_mappa:number = null;
  data_ins_mappa:number = null;
  data_inserimento:number = null;

  /* Particelle */
  particelle:{
    id_civico:number,
    sezione:string,
    allegato:string,
    foglio:string,
    numero:string
  }[] = null;

  /* Zone */
  zone:{id_zona:number,name:string,descr:string,valore:string}[] = null;
  localita:string = null;
  municipio:string = null;

  /* Edifici cadastre info */
  catasto_edifici:{id:number,sezione:string,foglio:string,numero:string}[] = null;

  /* Estensioni (read only) */
  estensioni:{estensione:string,x:number,y:number}[] = null;

  /* Object used to store map changed attributes */
  mapChange:any;

  /* Local attributes */
  bEstensione:boolean;
  bSaveParticelle:boolean;

  /* Private attributes */
  private mode:number;

  /*
   * Static method
   */
  static getName()
  {
    return "civico";
  }

  static getLayerKey():string
  {
    return "civico";
  }

  static getSearchOpt(obj)
  {
    /* Check */
    if (!obj || !obj.id && !obj.nome_via)
      return null;

    /* Prepare opt */
    let retObj = {
      ord: "nome_via|ASC;numero|ASC;esponente|ASC",
      filter: null
    };

    if (obj.id)
    {
      retObj.filter = "id|EQ|"+obj.id;
    }
    else
    {
      retObj.filter = "nome_via|ILIKE|%"+obj.nome_via+"%";
      if (obj.numero) retObj.filter += ";numero|EQ|"+obj.numero;
      if (obj.esponente) retObj.filter += ";esponente|EQ|"+obj.esponente.toUpperCase();
    }

    return retObj;
  }

  /*
   * Method
   */
  constructor(obj,mode)
  {
    super();

    this.mode = mode;
    this.update(obj);
  }

  update(cfg:object)
  {
    super.update(cfg);

    this.bEstensione = this.estensione ? true : false;
    this.bSaveParticelle = false;
  }

  isNew():boolean
  {
    return this.id == null;
  }

  getType():number
  {
    return 3;
  }

  getMode():number
  {
    return this.data_fine || this.mode;
  }

  getTitle():string
  {
    let title = "Scheda civico: " + (this.nome_via || "");

    if (this.numero)
      title += ", "+this.numero;

    if (this.esponente)
      title += "/"+this.esponente;

    if (this.data_fine && this.data_fine < new Date().getTime())
      title += " (CESSATO)";

    return title;
  }

  getDescr():string
  {
    let descr = this.nome_via || "";

    if (this.numero)
      descr += ", "+this.numero;

    if (this.esponente)
      descr += "/"+this.esponente;

    if (this.estensione)
      descr += " "+this.estensione;

    return descr;
  }

  getBBox():number[]
  {
    if (!this.x || !this.y)
      return null;

    let off = 30;

    return [this.x - off,this.y - off,this.x + off,this.y + off];
  }

  detailUrl():string
  {
    return "/civico/detail/"+this.id;
  }

  getChangedZone(newZone:any[]):number[]
  {
    if (!newZone)
      return [];

    /* Look for zone change */
    let bChange = false;

    if (!this.zone || this.zone.length != newZone.length)
    {
      bChange = true;
    }
    else
    {
      for (let j = 0;j < newZone.length;j++)
      {
        let curId = newZone[j].id_zona;

        if (!this.zone.find(item => item.id_zona == curId))
        {
          bChange = true;
          break;
        }
      }
    }

    if (!bChange)
      return null;

    /* Get new zone id */
    let zoneId = [];

    for (let j = 0;j < newZone.length;j++)
      zoneId.push(newZone[j].id_zona);

    return zoneId;
  }

  setId(id:number)
  {
    this.id = id;
  }
}
