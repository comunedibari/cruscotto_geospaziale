import { Component,OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Dictionary } from '../dictionary.entity';

@Component({
  selector: 'dict-street',
  templateUrl: './street.component.html',
  styleUrls: ['./street.component.css']
})

export class StreetComponent implements OnInit
{
  /* Dictionaries list */
  dicts = [
    {id:"viaTipo", name:"Tipologia"},
    {id:"viaTipoNumero", name:"Tipologia numeri"},
    {id:"viaClassificazione", name:"Classificazione"},
    {id:"viaMotCessazione", name:"Motivo cessazione"}
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
