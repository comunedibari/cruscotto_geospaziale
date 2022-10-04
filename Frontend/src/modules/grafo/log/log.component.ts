import { Component,OnInit,ViewChild } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { ModelService } from '../../core/model.service';
import { PaginationComponent } from '../../core/pagination/pagination.component';

@Component({
  selector: 'grafo-log',
  templateUrl: './log.component.html',
  styleUrls: ['./log.component.css']
})

export class LogComponent implements OnInit
{
  @ViewChild(PaginationComponent) pagCmp: PaginationComponent;

  /*
   * Attributes
   */
  cols: any[];
  data: any[];
  pagCfg:any;
  configSearch: any;
  userObj:any = {};

  /*
   * Methods
   */
  constructor(
    private modalInst:NgbActiveModal,
    private modelSvc:ModelService
  ) {}

  ngOnInit()
  {
    this.cols = [
      {id:"date",     header:"Data",      width:"15%",sortable:true},
      {id:"user_id",  header:"Utente",    width:"30%"},
      {id:"entity",   header:"Entità",    width:"10%"},
      {id:"entity_id",header:"Codice",    width:"15%"},
      {id:"operation",header:"Operazione",width:"25%"}
    ];

    this.pagCfg = {
      rppArray: [10,15,20],
      entity: "grafoLog",
      order: "date|DESC",
      rpp: 10
    };

    this.configSearch = {
      simple: {key: ['operation', 'entity']},
      advanced: {
        source:[
          {
            id: "user_id",
            type: "select",
            name: "WORD.USER",
            otions: [],
            operators: ["EQ"]
          },
          {
            id: "entity",
            type: "text",
            name: "WORD.ENTITY",
            operators: ["EQ","ILIKE"]
          },
          {
            id: "entity_id",
            type: "number",
            name: "WORD.CODE",
            operators: ["EQ"]
          },
          {
            id: "date",
            name: "WORD.DATE",
            type: "timestamp",
            subType: "date",
            operators: ["EQ","GT","LT","GE", "LE"]
          }
        ]
      }
    };
    /* Load user master */
    this.modelSvc.master("/user/master",{}).subscribe(res =>
    {
      if (res)
      {
        this.configSearch['advanced']['source'][0]['options'] = [];
        for (let j = 0;j < res.length;j++)
        {
          let usr:any = res[j];
          this.userObj[usr.id] = `${usr.name} ${usr.surname}`;
          this.configSearch['advanced']['source'][0]['options'].push({
            id: usr.id,
            name: this.userObj[usr.id]
          })
        }
      }
    });
  }

  ngAfterViewInit()
  {
    this.pagCmp.load();
  }

  tdRender(col,val)
  {
    switch (col.id)
    {
      case "date":
        return val ? new Date(val).datetimeString() : null;
      case "user_id":
        return this.userObj[val];
      default:
        return val;
    }
  }

  changeValRender(key,val)
  {
    if (key == "geom")
      return "";

    if (key && val && key.startsWith("data_"))
      return new Date(val).dateString();

    return val;
  }

  close()
  {
    this.modalInst.close();
  }

  /*
   * Event handlers
   */
  onPageLoaded(data)
  {
    this.data = data || [];
  }

  onTableSort(opt)
  {
    this.pagCmp.setOrder(`${opt.field}|${opt.order > 0 ? "ASC" : "DESC"}`);
  }

  onKeydownSimpleSearch(ev)
  {
    this.pagCmp.setFilter(ev);
  }

  onClearSimpleSearch()
  {
    this.pagCmp.setFilter(null);
  }

  onFilterAdvancedSearch(event)
  {
    this.pagCmp.setFilter(event);
  }
}
