import { Component,OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Dictionary } from '../dictionary.entity';

@Component({
  selector: 'dict-arc',
  templateUrl: './arc.component.html',
  styleUrls: ['./arc.component.css']
})

export class ArcComponent implements OnInit
{
  /* Dictionaries list */
  dicts = [
    {id:"arcoDizionari",dict:"arco_carreggiata",      name:"Carreggiata"},
    {id:"arcoDizionari",dict:"arco_classe",           name:"Classe"},
    {id:"arcoDizionari",dict:"arco_class_funz",       name:"Classe funzionale"},
    {id:"arcoDizionari",dict:"arco_fondazione",       name:"Fondazione"},
    {id:"arcoDizionari",dict:"arco_fondo",            name:"Fondo"},
    {id:"arcoDizionari",dict:"arco_fonte",            name:"Fonte"},
    {id:"arcoDizionari",dict:"arco_funzionalita",     name:"Funzionalità"},
    {id:"arcoDizionari",dict:"arco_livello",          name:"Livello"},
    {id:"arcoDizionari",dict:"arco_marcia",           name:"Marcia"},
    {id:"arcoDizionari",dict:"arco_origine",          name:"Origine"},
    {id:"arcoDizionari",dict:"arco_pavimentazione",   name:"Pavimentazione"},
    {id:"arcoDizionari",dict:"arco_portata",          name:"Portata"},
    {id:"arcoDizionari",dict:"arco_proprieta",        name:"Proprietà"},
    {id:"arcoDizionari",dict:"arco_sede",             name:"Sede"},
    {id:"arcoDizionari",dict:"arco_senso_percorrenza",name:"Senso percorrenza"},
    {id:"arcoDizionari",dict:"arco_sezione",          name:"Sezione"},
    {id:"arcoDizionari",dict:"arco_stato_cons",       name:"Stato conservazione"},
    {id:"arcoDizionari",dict:"arco_stato_esercizio",  name:"Stato esercizio"},
    {id:"arcoDizionari",dict:"arco_strada_cs",        name:"Starda cs"},
    {id:"arcoDizionari",dict:"arco_tipo",             name:"Tipo"},
    {id:"arcoDizionari",dict:"arco_tipologia",        name:"Tipologia"},
    {id:"arcoDizionari",dict:"arco_uso",              name:"Uso"},
    {id:"arcoDizionari",dict:"arco_viabilita",        name:"Viabilità"}
  ];

  /* Table config */
  tableCfg =
  {
    order: "id|ASC",
    entClass: Dictionary,
    maxHeight: 320,
    pagination: {rpp:10, rppArray:[10,15,20]},
    columns:[
      {key:"id", label:"ID", width:"15%", sortable:true, editable:true},
      {key:"name", label:"Descrizione", editable:true, uppercase:true}
    ],
    toolbar:{
      buttons: {add: {}},
      search: {type: 1, key:['name']}
    }
  };

  /*
   * Methods
   */
  constructor(private modalInst:NgbActiveModal) {}

  ngOnInit() {}

  close() {this.modalInst.close();}
}
