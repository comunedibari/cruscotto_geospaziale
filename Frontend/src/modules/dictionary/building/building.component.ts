import { Component,OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Dictionary } from '../dictionary.entity';

@Component({
  selector: 'dict-building',
  templateUrl: './building.component.html',
  styleUrls: ['./building.component.css']
})

export class BuildingComponent implements OnInit
{
  /* Dictionaries list */
  dicts = [
    {id:"edificioTipo", name:"Tipologia"},
    {id:"edificioStato", name:"Stato"},
    {id:"edificioDiffCatasto", name:"Differenze catasto"},
    {id:"edificioMotCessazione", name:"Motivo cessazione"},
    {id:"edificioUsoPrevalente", name:"Uso prevalente"}
  ];

  /* Table config */
  tableCfg =
  {
    order: "id|ASC",
    toolbar:{
      buttons: {add: {}},
      search: {type: 1, key:['name']}
    },
    entClass: Dictionary,
    maxHeight: 320,
    pagination: {rpp:10, rppArray:[10,15,20]},
    columns:[
      {key:"id", label:"ID", width:"15%", sortable:true, editable:true},
      {key:"name", label:"Descrizione", editable:true, uppercase:true}
    ]
  };

  /*
   * Methods
   */
  constructor(private modalInst:NgbActiveModal) {}

  ngOnInit() {}

  close() {this.modalInst.close();}
}
