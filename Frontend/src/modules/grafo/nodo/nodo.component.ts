import { Component,OnInit,OnChanges,SimpleChanges } from '@angular/core';
import { Input,Output,EventEmitter,ViewChild } from '@angular/core';

import { ContextService } from '../../core/context.service';
import { ModelService }   from '../../core/model.service';
import { AuthService }    from '../../core/auth.service';
import { FormComponent }  from '../../core/form/form.component';

import { Nodo } from '../entity/nodo';
import { Arco } from '../entity/arco';

import { WebgisService } from '../../webgis/webgis.service';
import { HilightMode,
         StyleType }     from '../../webgis/webgis.util';

@Component({
  selector: 'grafo-nodo',
  templateUrl: './nodo.component.html',
  styleUrls: ['./nodo.component.css']
})

export class NodoComponent implements OnInit,OnChanges
{
  @Input() entity:Nodo;
  @Output() showMsg = new EventEmitter<any>();
  @ViewChild(FormComponent) formCmp:FormComponent;

  /* Attributes */
  message:string = null;
  //msgColor:string = null;
  readOnly:boolean = false;

  saveOk:boolean = false;

  /* Form config */
  formCfg =
  {
    id:"form", fg:
    [
      {
        id:0, rows:
        [
          [
            {
              key: "id",
              type: "number",
              label: "Codice",
              width: 4,
              disabled: true
            },
            {
              key: "data_ini",
              type: "timestamp",
              label: "Inizio validità",
              width: 4,
              subType: "date",
              disabled: true
            },
            {
              key: "data_fine",
              type: "timestamp",
              label: "Fine validità",
              width: 4,
              subType: "date",
              disabled: true
            }
          ]
        ]
      },
      {
        id:1, label:"Dati intesa", rows:
        [
          [
            {
              key: "id_tipo",
              type: "select",
              label: "Tipo",
              width: 12,
              options: this.contextSvc.getContext("nodoTipo")
            }
          ],
          [
            {
              key: "id_tipo_lim_amm",
              type: "select",
              label: "Limite amministrativo",
              width: 12,
              options: this.contextSvc.getContext("tipoLimAmm")
            }
          ],
          [
            {
              key: "toponomastica",
              type: "boolean",
              label: "Toponomastica",
              width: 12
            }
          ]
        ]
      },
      {
        id:2, label:"Note", rows:
        [
          [
            {
              key: "nota",
              type: "textarea",
              label: null,
              width: 12
            }
          ]
        ]
      },
      {
        id:3, label:"Vie interessate", rows:[]
      }
    ]
  };

  /* Arcs table */
  arcsTable =
  {
    data: [],
    columns: [
      {key:"cod_arco",label:"Arco", width:"25%"},
      {key:"cod_via", label:"Cod. via", width:"25%"},
      {key:"nome_via",label:"Nome via", width:"50%"}
    ]
  };

  /*
   * Methods
   */
  constructor(
    private contextSvc:ContextService,
    private webgisSvc:WebgisService,
    private modelSvc:ModelService,
    private authSvc:AuthService,
  ) {}

  ngOnInit()
  {
    /* Get permission */
    let aPerm = this.authSvc.permForModule("graph");
    this.readOnly = aPerm.indexOf("NODO_UPDATE") == -1;
  }

  ngOnChanges(changes:SimpleChanges)
  {
    if (changes.entity && this.entity)
    {
      /* Update arcs table */
      this.arcsTable.data.splice(0);

      if (this.entity.archi)
        Array.prototype.push.apply(this.arcsTable.data,this.entity.archi);

      /* Update form */
      setTimeout(() =>
      {
        if (this.readOnly)
          this.formCmp.disableFields(null,true);
        else
          this.formCmp.disableFieldsGroup([1,2],this.entity.data_fine != null);
      },10);
    }
  }

  zoomTo()
  {
    this.webgisSvc.setLayerVisibility(Nodo.getLayerKey(),true);
    var bbox = this.entity.getBBox();

    if (bbox)
    {
      this.webgisSvc.zoomToBBox(bbox, 32633);
      this.webgisSvc.hilightFeature(Nodo.getLayerKey(),'id',this.entity.id, bbox);
    }
  }

  hilightAssociate()
  {
    // we have to hilight archi related to given nodo
    if (this.entity.archi && this.entity.archi.length > 0)
    {
      for (let idx=0; idx<this.entity.archi.length; idx++)
      {
        let arcoId = this.entity.archi[idx].cod_arco;

        this.webgisSvc.hilightFeature(
          Arco.getLayerKey(),
          'cod_arco',
          arcoId,
          undefined,
          [{
            type:StyleType.LINE,
            id:1,
            strokeColor: "#fdd017ff",
            strokeWidth: 3
          }],
          HilightMode.APPEND
        );
      }
    }
  }

  save()
  {
    /* Look for validity and change */
    if (!this.formCmp.isValid() || !this.formCmp.isChanged())
      return;

    /* Ask to save */
    this.showMsg.emit({
      msg: "Vuoi salvare le modifiche?",
      title: "Conferma",
      buttons: [
        {id:1, label:"Si", callback:() => {this.mustSave();}},
        {id:2, label:"No"}
      ]
    });
  }

  /*
   * Private methods
   */
  private mustSave()
  {
    let url = "/nodo/update/" + this.entity.id,
      chObj = this.formCmp.getChangedObj();

    this.modelSvc.update(url,chObj).subscribe(res =>
    {
      if (res)
      {
        this.entity.update(chObj);
        this.message = "MESSAGE.UPDATE_OK";
        //this.msgColor = "#28a745";
        this.saveOk = true;
      }
      else
      {
        this.message = "MESSAGE.UPDATE_ERR";
        //this.msgColor = "red";
        this.saveOk = false;
      }
    });
  }
}
