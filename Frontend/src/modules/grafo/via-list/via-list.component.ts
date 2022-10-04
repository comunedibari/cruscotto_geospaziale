import { Component,OnInit,ViewChild } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { ModelService } from '../../core/model.service';
import { TableComponent } from '../../core/table/table.component';

@Component({
  selector: 'grafo-via-list',
  templateUrl: './via-list.component.html',
  styleUrls: ['./via-list.component.css']
})

export class ViaListComponent implements OnInit
{
  @ViewChild(TableComponent) tableCmp:TableComponent;

  /* Table config */
  tableCfg =
  {
    order: "denom_pura|ASC",
    toolbar: {
      search: {
        type: 3,
        key: ["denom_pura"],
        source:
        [
          {
            id: "denom_pura",
            type: "text",
            name: "Descrizione",
            operators: ["EQ","ILIKE"]
          },
          {
            id: "archi",
            type: "number",
            name: "N° Archi",
            operators: ["EQ"]
          },
          {
            id: "data_fine",
            name: "Data cess.",
            type: "timestamp",
            subType: "date",
            operators: ["IS_NULL","IS_NOT"]
          },
          {
            id: "municipio_val",
            name: "Municipi",
            type: "text",
            operators: ["IS_NULL","IS_NOT"]
          },
          {
            id: "localita_val",
            name: "Località",
            type: "text",
            operators: ["IS_NULL","IS_NOT"]
          }
        ]
      }
    },
    countUrl: "/via/count",
    masterUrl: "/via/master",
    maxHeight: 320,
    pagination: {rpp:10, rppArray:[10,15,20]},
    columns:[
      {key:"cod_via", label:"Codice", sortable:true},
      {key:"id_tipo", label:"Tipo", type:"object", source:[]},
      {key:"denom_pura", label:"Descrizione", width:"20%", sortable:true},
      {key:"localita_val", label:"Località", type:"array", charJoin:"\n"},
      {key:"municipio_val", label:"Municipi", type:"array", charJoin:"\n"},
      {key:"data_fine", label:"Data cess.", type:"date"},
      {key:"archi", label:"N° Archi"}
    ]
  };

  /*
   * Methods
   */
  constructor(
    private modalInst:NgbActiveModal,
    private modelSvc:ModelService
  ) {}

  ngOnInit()
  {
    this.modelSvc.master("/viaTipo/master",{ord:"name|ASC"}).subscribe(res =>
    {
      this.tableCfg.columns[1].source = res || [];
      this.tableCmp.reload();
    });
  }

  close()
  {
    this.modalInst.close();
  }
}
