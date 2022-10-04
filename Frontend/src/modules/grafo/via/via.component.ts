import { Component,OnInit,OnChanges,SimpleChanges } from '@angular/core';
import { Input,Output,EventEmitter,ViewChildren,QueryList } from '@angular/core';

import { ModelService }      from '../../core/model.service';
import { HttpWriterService } from '../../core/http-writer.service';
import { FormComponent }     from '../../core/form/form.component';
import { ContextService }    from '../../core/context.service';

import { WebgisService } from '../../webgis/webgis.service';
import { HilightMode,
         StyleType }     from '../../webgis/webgis.util';

import { Via }    from '../entity/via';
import { Arco }   from '../entity/arco';
import { Civico } from '../entity/civico';

@Component({
  selector: 'grafo-via',
  templateUrl: './via.component.html',
  styleUrls: ['./via.component.css']
})
export class ViaComponent implements OnInit,OnChanges
{
  @Input() entity:Via;
  @Output() showMsg = new EventEmitter<any>();
  @ViewChildren(FormComponent) qlFormCmp:QueryList<FormComponent>;

  /* Class attributes */
  renObj:any = null;
  message:string = null;
  //msgStyle = null;

  saveOk:boolean = false;

  /* Forms */
  genFormCfg =
  {
    id:"genForm", fg:
    [
      {
        id:0, rows:
        [
          [
            {
              key: "cod_via",
              type: "number",
              label: "Codice",
              width: 6,
              disabled: true
            },
            {
              key: "id_tipo",
              type: "select",
              label: "Tipo",
              width: 6,
              options: [],
              required: true
            }
          ],
          [
            {
              key: "denom_pura",
              type: "text",
              label: "Descrizione",
              width: 12,
              required: true,
              uppercase: true
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
              key: "denominazione",
              type: "text",
              label: "Descrizione completa",
              width: 12,
              disabled: true
            }
          ],
          [
            {
              key: "denom_breve",
              type: "text",
              label: "Descrizione breve",
              width: 12,
              uppercase: true
            }
          ],
          [
            {
              key: "sottotitolo",
              type: "text",
              label: "Sottotitolo",
              width: 12,
              uppercase: true
            }
          ]
        ]
      },
      {
        id:1, rows:
        [
          [
            {
              key: "localita",
              type: "select",
              label: "Località",
              width: 12,
              options: this.contextSvc.getContext("localita"),
              multiple: true
            }
          ],
          [
            {
              key: "municipio",
              type: "select",
              label: "Municipi",
              width: 12,
              options: this.contextSvc.getContext("municipio"),
              multiple: true
            }
          ]
        ]
      },
      {
        id:2, label:"Descrizioni Alternative", rows:
        [
          [
            {
              key: "descrizione_alt1",
              type: "text",
              width: 6,
              uppercase: true
            },
            {
              key: "descrizione_alt2",
              type: "text",
              width: 6,
              uppercase: true
            }
          ],
          [
            {
              key: "descrizione_alt3",
              type: "text",
              width: 6,
              uppercase: true
            },
            {
              key: "descrizione_alt4",
              type: "text",
              width: 6,
              uppercase: true
            }
          ],
          [
            {
              key: "descrizione_alt5",
              type: "text",
              width: 6,
              uppercase: true
            },
            {
              key: "descrizione_alt6",
              type: "text",
              width: 6,
              uppercase: true
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
              key: "id_tipo_numero",
              type: "select",
              label: "Tipo Numerazione",
              width: 6,
              options: []
            }
          ]
        ]
      },
      {
        id:1, label:"Civico pari", rows:
        [
          [
            {
              key: "civiminp",
              type: "number",
              label: "Minimo",
              width: 6
            },
            {
              key: "civimaxp",
              type: "number",
              label: "Massimo",
              width: 6
            }
          ]
        ]
      },
      {
        id:2, label:"Civico dispari", rows:
        [
          [
            {
              key: "civimind",
              type: "number",
              label: "Minimo",
              width: 6
            },
            {
              key: "civimaxd",
              type: "number",
              label: "Massimo",
              width: 6
            }
          ]
        ]
      }
    ]
  };

  t3FormCfg =
  {
    id:"t3Form", fg:
    [
      {
        id:0, label:"Validità", rows:
        [
          [
            {
              key: "data_inserimento",
              type: "timestamp",
              label: "Data inserimento",
              width: 4,
              subType: "date",
              disabled: true
            },
            {
              key: "data_ini",
              type: "timestamp",
              label: "Dal",
              width: 4,
              subType: "date",
              required: true
            },
            {
              key: "data_fine",
              type: "timestamp",
              label: "Al",
              width: 4,
              subType: "date",
              required: true
            }
          ],
          [
            {
              key: "id_mot_cessazione",
              type: "select",
              label: "Motivo cessazione",
              width: 12,
              options: [],
              required: true
            }
          ]
        ]
      },
      {
        id:1, label:"Delibera", rows:
        [
          [
            {
              key: "num_delib",
              type: "text",
              label: "Numero",
              width: 4
            },
            {
              key: "data_delib",
              type: "timestamp",
              label: "Data",
              width: 4,
              subType: "date"
            },
            {
              key: "data_verbale",
              type: "timestamp",
              label: "Data verbale",
              width: 4,
              subType: "date"
            }
          ]
        ]
      },
      {
        id:2, label:"Precedente", rows:
        [
          [
            {
              key: "prev_via",
              type: "number",
              label: "Codice",
              width: 6
            },
            {
              key: "prev_via_descr", //TODO
              type: "text",
              label: "Descrizione",
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
              key: "id_classificazione",
              type: "select",
              label: "Classificazione",
              width: 12,
              options: []
            }
          ],
          [
            {
              key: "lunghezza",
              type: "number",
              label: "Lunghezza",
              disabled: true,
              width: 6
            },
            {
              key: "larghezza",
              type: "number",
              label: "Larghezza media",
              width: 6
            }
          ],
          [
            {
              key: "nota",
              type: "textarea",
              label: "Descrizione",
              width: 12
            }
          ]
        ]
      }
    ]
  };

  renFormCfg =
  {
    id:"renForm", fg:
    [
      {
        id:0, label:"Via precedente", rows:
        [
          [
            {
              key: "cod_via",
              type: "number",
              width: 4,
              disabled: true
            },
            {
              key: "denominazione",
              type: "text",
              width: 8,
              disabled: true
            }
          ],
          [
            {
              key: "data_fine",
              type: "timestamp",
              label: "Fine validità",
              width: 4,
              subType: "date",
              disabled: true
            },
            {
              key: "id_mot_cessazione",
              type: "select",
              label: "Motivo cessazione",
              width: 8,
              options: [],
              required: true
            }
          ]
        ]
      },
      {
        id:1, label:"Via successiva", rows:
        [
          [
            {
              key: "new_cod_via",
              type: "number",
              label: "Codice",
              width: 4,
              disabled: true
            },
            {
              key: "new_id_tipo",
              type: "select",
              label: "Tipo",
              width: 8,
              options: [],
              required: true
            }
          ],
          [
            {
              key: "new_denom_pura",
              type: "text",
              label: "Descrizione",
              width: 12,
              required: true,
              uppercase: true
            }
          ],
          [
            {
              key: "new_denominazione",
              type: "text",
              label: "Descrizione completa",
              width: 12,
              disabled: true
            }
          ],
          [
            {
              key: "new_data_ini",
              type: "timestamp",
              label: "Inizio validità",
              width: 4,
              subType: "date",
              required: true
            }
          ]
        ]
      }
    ]
  };

  /* Tabs config */
  tabs = [
    {closed:false, formCfg:this.t1FormCfg, title:"Descrizioni"},
    {closed:true,  formCfg:this.t2FormCfg, title:"Civici"},
    {closed:true,  formCfg:this.t3FormCfg, title:"Evoluzione storica"},
    {closed:true,  formCfg:this.t4FormCfg, title:"Altre informazioni"}
  ];

  /*
   * Class methods
   */
  constructor(
    private modelSvc:ModelService,
    private webgisSvc:WebgisService,
    private contextSvc:ContextService,
    private httpWriter:HttpWriterService
  ) {}

  ngOnInit()
  {
    /* Load dictionaries */
    this.modelSvc.master("/via/dictionaries",{}).subscribe(res =>
    {
      if (res)
      {
        this.genFormCfg.fg[0].rows[0][1]["options"] = res["tipo"];
        this.t2FormCfg.fg[0].rows[0][0]["options"] = res["tipoNumero"];
        this.t3FormCfg.fg[0].rows[1][0]["options"] = res["motCessazione"];
        this.t4FormCfg.fg[0].rows[0][0]["options"] = res["classificazione"];

        this.renFormCfg.fg[1].rows[0][1]["options"] = res["tipo"];
        this.renFormCfg.fg[0].rows[1][1]["options"] = res["motCessazione"];
      }
    });
  }

  ngOnChanges(changes:SimpleChanges)
  {
    if (changes.entity && this.entity)
    {
      let mode = this.entity.getMode();

      /* Rename */
      if (this.entity.getMode() == 4)
      {
        this.renObj = {
          cod_via: this.entity.cod_via,
          new_cod_via: null,
          denominazione: this.entity.denominazione
        };

        setTimeout(() =>
        {
          let rf = this.getFormCmp("renForm");
          if (rf)
          {
            // set data_fine to now and new_data_ini to now + 1 day (tomorrow)
            let today = new Date();
            let tomorrow = new Date();
            tomorrow.setDate(today.getDate() + 1);

            rf.setValueForKey("data_fine", today);
            rf.setValueForKey("new_data_ini",tomorrow);
          }
        },10);

        return;
      }

      /* Other mode */
      setTimeout(() =>
      {
        let fg = this.getFormCmp("genForm"),
          f1 = this.getFormCmp("t1Form"),
          f2 = this.getFormCmp("t2Form"),
          f3 = this.getFormCmp("t3Form"),
          f4 = this.getFormCmp("t4Form");

        /* Update forms config */
        fg.disableFields(null,mode > 2);
        fg.disableFields(["cod_via"],true);

        f1.disableFields(["denom_breve","sottotitolo"],mode >= 3);
        f1.disableFieldsGroup([1,2],mode >= 3);

        f3.disableFields(["data_ini"],mode > 1);
        f3.disableFields(["data_fine","id_mot_cessazione"],mode != 3);
        f3.disableFieldsGroup([1,2],mode != 3);

        f2.disableFields(null,mode >= 3);
        f4.disableFields(null,mode >= 3);

        /* Set default values into forms */
        if (mode == 1)
          f3.setValueForKey("data_ini",new Date());
        if (mode == 1)
          f3.setValueForKey("data_inserimento",new Date());

      },10);
    }
  }

  zoomTo()
  {
    this.webgisSvc.setLayerVisibility(Arco.getLayerKey(),true);
    var bbox = this.entity.getBBox();

    if (bbox)
    {
      this.webgisSvc.zoomToBBox(bbox, 32633);
      this.webgisSvc.hilightFeature(Arco.getLayerKey(),'cod_via',this.entity.cod_via, bbox);
    }
  }

  hilightAssociate()
  {
    // we have to hilight civici and archi related to given via

    // civico
    this.webgisSvc.hilightFeature(
      Civico.getLayerKey(),
      'cod_via',
      this.entity.cod_via,
      undefined,
      [{
        type:StyleType.SHAPE,
        id:1,
        size:10,
        color: "#fdd017ff"
      }],
      HilightMode.APPEND
    );

    // arco
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
            strokeWidth: 3,
            strokeColor: "#fdd017ff"
          }],
          HilightMode.APPEND
        );
      }
    }

  }

  save()
  {
    if (this.entity.getMode() == 4)
    {
      this.rename();
      return;
    }

    /*
     * Look for validity and changed keys
     */
    let aFormCmp = this.qlFormCmp.toArray();
    let chObj = {};

    for (let j = 0;j < aFormCmp.length;j++)
    {
      var cmp = aFormCmp[j];

      if (!cmp.isValid())
        return;

      if (cmp.isChanged())
        Object.assign(chObj,cmp.getChangedObj());
    }

    /*
     * Save
     */
    if (Object.keys(chObj).length)
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

  rename()
  {
    let form = this.getFormCmp("renForm");
    if (form)
    {
      if (this.renObj.new_cod_via || !form.isValid() || !form.isChanged())
        return

      /* Rename */
      let chObj = form.getChangedObj();

      this.showMsg.emit({
        msg: "Vuoi salvare le modifiche?",
        title: "Conferma",
        buttons: [
          {id:1, label:"Si", callback:() => {this.mustRename(chObj);}},
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
      case "id_tipo":
      case "denom_pura":
        let fg = this.getFormCmp("genForm");
        let tp = fg.getValueForKey("id_tipo");
        let dp = fg.getValueForKey("denom_pura")
        let ctxTp = this.genFormCfg.fg[0].rows[0][1]["options"];
        let denom = "";

        if (tp != null)
        {
          for (let j = 0;j < ctxTp.length;j++)
          {
            if (ctxTp[j].id == tp)
            {
              denom += `${ctxTp[j].name} `;
              break;
            }
          }
        }

        if (dp != null)
          denom += dp;

        this.getFormCmp("t1Form").setValueForKey(
          "denominazione",denom.toUpperCase());
        break;

      case "new_id_tipo":
      case "new_denom_pura":
        let fr = this.getFormCmp("renForm");
        let tpn = fr.getValueForKey("new_id_tipo");
        let dpn = fr.getValueForKey("new_denom_pura")
        let ctxTpN = this.renFormCfg.fg[1].rows[0][1]["options"];
        let denomNew = "";

        if (tpn != null)
        {
          for (let j = 0;j < ctxTpN.length;j++)
          {
            if (ctxTpN[j].id == tpn)
            {
              denomNew += `${ctxTpN[j].name} `;
              break;
            }
          }
        }

        if (dpn != null)
          denomNew += dpn;

        this.getFormCmp("renForm").setValueForKey(
          "new_denominazione",denomNew.toUpperCase());
        break;

      case "new_data_ini":
        // on data_ini change, set data_fine = new_data_ini - 1 day
        this.getFormCmp("renForm").setValueForKey("data_fine", new Date(obj.val - 86400*1000));
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

  mustSave(chObj:any)
  {
    if (this.entity.isNew())
    {
      // convert denom_pura and denom_breve to upper case
      if (chObj['denom_pura'])
        chObj['denom_pura'] = chObj['denom_pura'].toUpperCase();

      if (chObj['denom_breve'])
        chObj['denom_breve'] = chObj['denom_breve'].toUpperCase();

      /* Insert */
      this.modelSvc.insert("/via/insert",chObj).subscribe(res =>
      {
        if (res)
        {
          this.entity.update(chObj);
          this.entity.cod_via = res["cod_via"];

          this.getFormCmp("genForm").setValueForKey("cod_via",res["cod_via"]);
          this.message = "MESSAGE.INSERT_OK";
          //this.msgStyle = {'color':'#28a745'};
          this.saveOk = true;
        }
        else
        {
          this.message = "MESSAGE.INSERT_ERR";
          //this.msgStyle = {'color':'red'};
          this.saveOk = false;
        }
      });
    }
    else
    {
      /* Update */
      let url = "/via/update/"+this.entity.cod_via;

      // convert denom_pura and denom_breve to upper case
      if (chObj['denom_pura'])
        chObj['denom_pura'] = chObj['denom_pura'].toUpperCase();

      if (chObj['denom_breve'])
        chObj['denom_breve'] = chObj['denom_breve'].toUpperCase();

      this.httpWriter.put(url,chObj).subscribe(res =>
      {
        if (res)
        {
          if (res['error'])
          {
            this.message = "Non è possibile cessare la via in quanto associata a uno o più archi";
            //this.msgStyle = {'color':'red'};
            this.saveOk = false;
          }
          else
          {
            this.entity.update(chObj);
            this.message = "MESSAGE.UPDATE_OK";
            //this.msgStyle = {'color':'#28a745'};
            this.saveOk = true;
          }
        }
        else
        {
          this.message = "MESSAGE.UPDATE_ERR";
          //this.msgStyle = {'color':'red'};
          this.saveOk = false;
        }
      });
    }
  }

  mustRename(chObj:any)
  {
    let url = "/via/rename/"+this.renObj.cod_via;

    // convert denom_pura to upper case
    if (chObj['new_denom_pura'])
      chObj['new_denom_pura'] = chObj['new_denom_pura'].toUpperCase();

    this.modelSvc.update(url,chObj).subscribe(res =>
    {
      if (res)
      {
        this.renObj.new_cod_via = res["cod_via"];
        this.getFormCmp("renForm").setValueForKey("new_cod_via",res["cod_via"]);
        this.saveOk = true;
      }
      else
        this.saveOk = false;

      this.webgisSvc.refreshLayer(Arco.getLayerKey());
      this.webgisSvc.refreshLayer(Civico.getLayerKey());

      this.message = res ? "MESSAGE.UPDATE_OK" : "MESSAGE.UPDATE_ERR";
    });
  }
}
