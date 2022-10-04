import { Component,OnInit,OnChanges,SimpleChanges } from '@angular/core';
import { Input,Output,EventEmitter,ViewChildren,QueryList } from '@angular/core';

import { FormComponent }     from '../../core/form/form.component';
import { ModelService }      from '../../core/model.service';
import { AuthService }       from '../../core/auth.service';
import { HttpReaderService } from '../../core/http-reader.service';

import { Edificio } from '../entity/edificio';
import { Civico }   from '../entity/civico';

import { WebgisService } from '../../webgis/webgis.service';
import { HilightMode,
         StyleType }     from '../../webgis/webgis.util';

@Component({
  selector: 'grafo-edificio',
  templateUrl: './edificio.component.html',
  styleUrls: ['./edificio.component.css']
})

export class EdificioComponent implements OnInit, OnChanges
{
  @Input() entity:Edificio;
  @Output() showMsg = new EventEmitter<any>();
  @ViewChildren(FormComponent) qlFormCmp:QueryList<FormComponent>;

  /* Attributes */
  message:string = null;
  //msgColor:string = null;
  readOnly:boolean = false;

  saveOk:boolean = false;

  // support variable
  thereIsCodComune:boolean = false;

  /* Forms config */
  genFormCfg =
  {
    id:"genForm", fg:
    [
      {
        id:0, rows:
        [
          [
            {
              key: "id",
              type: "number",
              label: "Codice",
              width: 6,
              disabled: true
            }
          ]
        ]
      }
    ]
  };

  t1FormCfg =
  {
    id:"t1Form", fg:
    [
      {
        id:0, rows:
        [
          [
            {
              key: "sotterraneo",
              type: "boolean",
              label: "Sotterraneo",
              width: 6
            }
          ],
          [
            {
              key: "id_stato",
              type: "select",
              label: "Stato",
              width: 6,
              options: [],
              required: true
            },
            {
              key: "id_tipo",
              type: "select",
              label: "Tipo",
              width: 6,
              options: []
            }
          ],
          [
            {
              key: "id_uso_prevalente",
              type: "select",
              label: "Uso prevalente",
              width: 6,
              options: []
            },
            {
              key: "anno_costr",
              type: "number",
              label: "Anno costruzione",
              width: 6
            }
          ]
        ]
      },
      {
        id:1, label:"Dati catastali", rows:
        [
          [
            {
              key: "sezione",
              type: "text",
              label: "Sezione",
              width: 2,
              disabled: true
            },
            {
              key: "foglio",
              type: "text",
              label: "Foglio",
              width: 3,
              disabled: true
            },
            {
              key: "numero",
              type: "text",
              label: "Numero",
              width: 3,
              disabled: true
            },
            {
              key: "btParcelGet",
              type: "button",
              label: "",
              width: 2,
              btnImage: "assets/common/hand.png"
            },
            {
              key: "btParcelDel",
              type: "button",
              label: "",
              width: 2,
              btnImage: "assets/common/delete.png"
            }
          ]
        ]
      }
    ]
  };

  t2FormCfg =
  {
    id:"t2Form", fg:
    [
      {
        id:0, rows:
        [
          [
            {
              key: "data_ini",
              type: "timestamp",
              label: "Data inizio validità",
              width: 6,
              subType: "date",
              required: true
            },
            {
              key: "data_fine",
              type: "timestamp",
              label: "Data fine validità",
              width: 6,
              subType: "date",
              disabled: true
            }
          ]
        ]
      },
      {
        id:1, label:"Pratica di prima istituzione dell'edificio", rows:
        [
          [
            {
              key: "ppi_anno",
              type: "number",
              label: "Anno",
              width: 6
            },
            {
              key: "ppi_numero",
              type: "text",
              label: "Numero",
              width: 6
            }
          ]
        ]
      },
      {
        id:2, label:"Atto di cessazione", rows:
        [
          [
            {
              key: "ac_anno",
              type: "number",
              label: "Anno",
              width: 6
            },
            {
              key: "ac_numero",
              type: "text",
              label: "Numero",
              width: 6
            }
          ]
        ]
      }
    ]
  };

  t4FormCfg =
  {
    id:"t4Form", fg:
    [
      {
        id:0, rows:
        [
          [
            {
              key: "id_diff_catasto",
              type: "select",
              label: "Difformità rispetto al catasto",
              width: 12,
              options: []
            }
          ],
          [
            {
              key: "denominazione",
              type: "text",
              label: "Denominazione",
              width: 12
            }
          ]
        ]
      }
    ]
  };

  /* Table config */
  t3TableCfg =
  {
    data: [],
    columns: [
      {key:"nome_via", label:"Via", width:"30%"},
      {key:"numero", label:"Num"},
      {key:"esponente", label:"Esp"},
      {key:"cod_via", label:"Codice Via", width:"20%"},
      {key:"id", label:"ID Civico", width:"20%"}
    ]
  };

  /* Tabs config */
  tabs = [
    {closed:false, formCfg:this.t1FormCfg, title:"Generale"},
    {closed:true, formCfg:this.t2FormCfg, title:"Evoluzione storica"},
    {closed:true, tableCfg:this.t3TableCfg, title:"Civici principali"},
    {closed:true, formCfg:this.t4FormCfg, title:"Altri"}
  ];

  /*
   * Methods
   */
  constructor(
    private webgisSvc:WebgisService,
    private modelSvc:ModelService,
    private authSvc:AuthService,
    private httpReader: HttpReaderService
  ) {}

  ngOnInit()
  {
    /* Check permission */
    let aPerm = this.authSvc.permForModule("graph");
    this.readOnly = aPerm.indexOf("EDIFICIO_UPDATE") == -1;

    if (this.readOnly)
    {
      setTimeout(() =>
      {
        this.qlFormCmp.forEach(cmp => cmp.disableFields(null,true));
      },10);
    }

    /* Load dictionaries */
    this.modelSvc.master("/edificio/dictionaries",{}).subscribe(res =>
    {
      if (res)
      {
        this.t1FormCfg.fg[0].rows[1][1]["options"] = res["tipo"];
        this.t1FormCfg.fg[0].rows[1][0]["options"] = res["stato"];
        this.t1FormCfg.fg[0].rows[2][0]["options"] = res["usoPrevalente"];
        this.t4FormCfg.fg[0].rows[0][0]["options"] = res["diffCatasto"];
      }
    });
  }

  ngOnChanges(changes:SimpleChanges)
  {
    if (changes.entity && this.entity)
    {
      /* Update civici table */
      this.t3TableCfg.data.splice(0);

      if (this.entity.civici)
        Array.prototype.push.apply(this.t3TableCfg.data,this.entity.civici);

      // read cod_comune
      if (this.entity.mapChange && this.entity.mapChange.cod_comune)
      {
        this.thereIsCodComune = true;

        this.entity.cod_comune = this.entity.mapChange.cod_comune;
        // remove from mapChange because this attribute isn't in the form
        delete this.entity.mapChange.cod_comune;
      }

      /* Update forms */
      if (!this.readOnly)
      {
        setTimeout(() =>
        {
          let mode = this.entity.getMode(),
            f1 = this.getFormCmp("t1Form"),
            f2 = this.getFormCmp("t2Form"),
            f4 = this.getFormCmp("t4Form");

          f1.disableFieldsGroup([0],mode > 3);

          f2.disableFields(["data_ini"],mode > 1);
          f2.disableFieldsGroup([1,2],mode > 3);

          f4.disableFields(null,mode > 3);

          if (mode == 1)
            f2.setValueForKey("data_ini",new Date());

          /* Look for new attributes coming from map */
          if (this.entity.mapChange)
          {
            for (let key in this.entity.mapChange)
            {
              this.formCmpForKey(key).setValueForKey(
                key,this.entity.mapChange[key]
              );
            }

            this.entity.mapChange = null;
          }
        },10);
      }
    }
  }

  zoomTo()
  {
    this.webgisSvc.setLayerVisibility(Edificio.getLayerKey(),true);
    var bbox = this.entity.getBBox();

    if (bbox)
    {
      this.webgisSvc.zoomToBBox(bbox, 32633);
      this.webgisSvc.hilightFeature(Edificio.getLayerKey(),'id',this.entity.id, bbox);
    }
  }

  hilightAssociate()
  {
    // we have to hilight civici related to given edificio
    if (this.entity.civici && this.entity.civici.length > 0)
    {
      for (let idx=0; idx<this.entity.civici.length; idx++)
      {
        let civicoId = this.entity.civici[idx].id;

        this.webgisSvc.hilightFeature(
          Civico.getLayerKey(),
          'id',
          civicoId,
          undefined,
          [{
            type:StyleType.SHAPE,
            id:1,
            size:10,
            color: "#fdd017ff"
          }],
          HilightMode.APPEND
        );
      }
    }
  }

  save()
  {
    /*
     * Look for validity and changed keys
     */
    let aFormCmp = this.qlFormCmp.toArray();
    let chObj = {};
    let geomChanged = false;

    for (let j = 0;j < aFormCmp.length;j++)
    {
      var cmp = aFormCmp[j];

      if (!cmp.isValid())
        return;

      if (cmp.isChanged())
        Object.assign(chObj,cmp.getChangedObj());
    }

    if (this.entity.getExtraAttrByName('geoJSON'))
      geomChanged = true;

    // check if cod_comune is valued from map click to obtain cadastral info
    if (this.thereIsCodComune)
    {
      this.thereIsCodComune = false;
      chObj['cod_comune'] = this.entity.cod_comune;
    }

    /*
     * Save
     */
    if (Object.keys(chObj).length || geomChanged)
    {
      this.showMsg.emit({
        msg: "Vuoi salvare le modifiche?",
        title: "Conferma",
        buttons: [
          {id:1, label:"Si", callback:() => {this.mustSave(chObj);}},
          {id:2, label:"No"}
        ]
      });
    }
  }

  /*
   * Event handler
   */
  onFormChange(obj)
  {
    switch (obj.key)
    {
      case "btParcelGet":
        this.webgisSvc.sendMessage("getFeatureId",
        {
          layerKey: "view_catasto_particelle",
          callback: res => {
            if (!res.id)
            {
              this.showMsg.emit({
                msg: "Non è stata selezionata nessuna particella catastale!\n"+
                  "Ripetere l'operazione.",
                //size: "sm",
                style: "danger",
                title: "Attenzione",
                buttons: [{id:1, label:"Ok"}]
              });
            }
            else
            {
              let form = this.getFormCmp("t1Form");

              let url = "/cadastre/retrieveParcelData/" + res.id;

              this.httpReader.get(url).subscribe(
                res => {
                  form.setValueForKey("sezione",res['sezione']);
                  form.setValueForKey("foglio",res['foglio']+''); // convert foglio to string value
                  form.setValueForKey("numero",res['numero']);

                  this.entity.cod_comune = res['codice_comune'];
                },
                err => {
                  this.showMsg.emit({
                    style: "danger",
                    msg: "Si è verificato un errore durante il recupero delle informazioni catastali",
                    title: "Attenzione",
                    buttons: [
                      {id:1, label:"Ok"}
                    ]
                  });
                }
              );
            }
          }
        });
        break;
      case "btParcelDel":
        let form = this.getFormCmp("t1Form");

        form.setValueForKey("sezione",null);
        form.setValueForKey("foglio",null);
        form.setValueForKey("numero",null);
        break;
    }
  }

  /*
   * Private methods
   */
  private getFormCmp(id)
  {
    return this.qlFormCmp.find(cmp => cmp.id === id);
  }

  private formCmpForKey(key)
  {
    return this.qlFormCmp.find(cmp => cmp.hasKey(key));
  }

  private mustSave(chObj)
  {
    // add geometric attribute
    if (this.entity.extraAttrs)
    {
      Object.keys(this.entity.extraAttrs).forEach(key => 
        chObj[key] = this.entity.getExtraAttrByName(key)
      );
    }

    if (this.entity.isNew())
    {
      /* Insert */
      this.modelSvc.insert("/edificio/insert",chObj).subscribe(res =>
      {
        if (res)
        {
          this.entity.id = res["id"];
          this.entity.update(chObj);

          this.getFormCmp("genForm").setValueForKey("id",res["id"]);
          this.message = "MESSAGE.INSERT_OK";
          //this.msgColor = "#28a745";
          this.saveOk = true;

          this.entity.setExtraAttr('geoJSON',null);
        }
        else
        {
          this.message = "MESSAGE.INSERT_ERR";
          //this.msgColor = "red";
          this.saveOk = false;
        }

        /* Notify to webgis */
        this.webgisSvc.sendMessage("endEdit",{
          entity: this.entity,
          status: this.saveOk ? "D" : "E"
        });
      });
    }
    else
    {
      /* Update */
      let url = "/edificio/update/"+this.entity.id;

      this.modelSvc.update(url,chObj).subscribe(res =>
      {
        if (res)
        {
          this.entity.update(chObj);
          this.message = "MESSAGE.UPDATE_OK";
          //this.msgColor = "#28a745";
          this.saveOk = true;

          this.entity.setExtraAttr('geoJSON',null);
        }
        else
        {
          this.message = "MESSAGE.UPDATE_ERR";
          //this.msgColor = "red";
          this.saveOk = false;
        }

        /* Notify to webgis */
        this.webgisSvc.sendMessage("endEdit",{
          entity: this.entity,
          status: this.saveOk ? "D" : "E"
        });
      });
    }
  }
}
