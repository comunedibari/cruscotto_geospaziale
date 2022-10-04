import { Component,OnInit,OnChanges,SimpleChanges } from '@angular/core';
import { Input,Output,EventEmitter,ViewChildren,QueryList } from '@angular/core';

import { AuthService }    from '../../core/auth.service';
import { ModelService }   from '../../core/model.service';
import { ContextService } from '../../core/context.service';
import { FormComponent }  from '../../core/form/form.component';

import { WebgisService } from '../../webgis/webgis.service';
import { HilightMode,
         StyleType }     from '../../webgis/webgis.util';

import { Arco }   from '../entity/arco';
import { Civico } from '../entity/civico';

@Component({
  selector: 'grafo-arco',
  templateUrl: './arco.component.html',
  styleUrls: ['./arco.component.css']
})

export class ArcoComponent implements OnInit, OnChanges
{
  @Input() entity:Arco;
  @Output() showMsg = new EventEmitter<any>();
  @ViewChildren(FormComponent) qlFormCmp:QueryList<FormComponent>;

  /* Attributes */
  message:string = null;
  //msgColor:string = null;
  readOnly:boolean = false;

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
              key: "cod_arco",
              type: "number",
              label: "Codice arco",
              width: 6,
              disabled: true
            },
            {
              key: "cod_via",
              type: "number",
              label: "Codice via",
              width: 6,
              disabled: true
            }
          ],
          [
            {
              key: "nome_via",
              type: "text",
              label: "Nome via",
              width: 12,
              disabled: true
            }
          ],
          [
            {
              key: "cod_via_new",
              type: "searchSelect",
              label: "Nome via",
              width: 12,
              hidden: true,
              options:[],
              required: true,
              optionValue: "cod_via",
              optionLabel: "denominazione",
              subOptionLabel: ['localita_val', 'municipio_val'],
              searchUrl: "/via/masterActive?ord=denominazione|ASC",
              searchKey: ["denominazione"]
            }
          ]
        ]
      }
    ]
  };

  t1FormCfg =
  {
    id:"t1Form",fg:
    [
      {
        id:0, rows:
        [
          [
            {
              key: "data_ini",
              type: "timestamp",
              label: "Inizio validità",
              width: 6,
              subType: "date"
            },
            {
              key: "data_fine",
              type: "timestamp",
              label: "Fine validità",
              width: 6,
              subType: "date",
              disabled: true
            }
          ],
          [
            {
              key: "prog_x_via",
              type: "number",
              label: "Prog. nella via",
              width: 4,
              disabled: true
            },
            {
              key: "mt_da",
              type: "number",
              label: "Da metro",
              width: 4,
              disabled: true
            },
            {
              key: "mt_a",
              type: "number",
              label: "A metro",
              width: 4,
              disabled: true
            }
          ],
          [
            {
              key: "nodo_da",
              type: "number",
              label: "Nodo da",
              width: 4,
              disabled: true
            },
            {
              key: "nodo_a",
              type: "number",
              label: "Nodo a",
              width: 4,
              disabled: true
            },
            {
              key: "corsie",
              type: "number",
              label: "N° corsie",
              width: 4
            }
          ],
          [
            {
              key: "lunghezza",
              type: "number",
              label: "Lunghezza (m)",
              width: 4
            },
            {
              key: "larghezza",
              type: "number",
              label: "Larghezza (m)",
              width: 4
            },
            {
              key: "superficie",
              type: "number",
              label: "Superficie (mq)",
              width: 4
            }
          ],
          [
            {
              key: "cod_via_da",
              type: "select",
              label: "Via da",
              width: 12,
              options:[],
              optionValue: "cod_via",
              optionLabel: "denominazione"
            }
          ],
          [
            {
              key: "cod_via_a",
              type: "select",
              label: "Via a",
              width: 12,
              options:[],
              optionValue: "cod_via",
              optionLabel: "denominazione"
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
        id:0, label:"Lato Pari", rows:
        [
          [
            {
              key: "civiminp",
              type: "number",
              label: "Civico min",
              width: 3,
              disabled: true
            },
            {
              key: "espominp",
              type: "text",
              label: "Esp. min",
              width: 3,
              disabled: true
            },
            {
              key: "civimaxp",
              type: "number",
              label: "Civico max",
              width: 3,
              disabled: true
            },
            {
              key: "espomaxp",
              type: "text",
              label: "Esp. max",
              width: 3,
              disabled: true
            }
          ],
          [
            {
              key: "id_quart_pari",
              type: "select",
              label: "Località",
              width: 6,
              options: this.ctxSvc.getContext("localita")
            },
            {
              key: "id_muni_pari",
              type: "select",
              label: "Municipio",
              width: 6,
              options: this.ctxSvc.getContext("municipio")
            }
          ]
        ]
      },
      {
        id:1, label:"Lato Dispari", rows:
        [
          [
            {
              key: "civimind",
              type: "number",
              label: "Civico min",
              width: 3,
              disabled: true
            },
            {
              key: "espomind",
              type: "text",
              label: "Esp. min",
              width: 3,
              disabled: true
            },
            {
              key: "civimaxd",
              type: "number",
              label: "Civico max",
              width: 3,
              disabled: true
            },
            {
              key: "espomaxd",
              type: "text",
              label: "Esp. max",
              width: 3,
              disabled: true
            }
          ],
          [
            {
              key: "id_quart_disp",
              type: "select",
              label: "Località",
              width: 6,
              options: this.ctxSvc.getContext("localita")
            },
            {
              key: "id_muni_disp",
              type: "select",
              label: "Municipio",
              width: 6,
              options: this.ctxSvc.getContext("municipio")
            }
          ]
        ]
      },
      {
        id:2, label:"", rows:
        [
          [
            {
              key: "estr_verif",
              type: "boolean",
              label: "Estremi verificati",
              width: 6
            },
            {
              key: "cresciv",
              type: "select",
              label: "Verso dei civici",
              width: 6,
              options: [] //TODO
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
        id:0, rows:
        [
          [
            {
              key: "id_uso",
              type: "select",
              label: "Uso",
              width: 12,
              options: []
            }
          ],
          [
            {
              key: "id_classe",
              type: "select",
              label: "Classe",
              width: 12,
              options: []
            }
          ],
          [
            {
              key: "id_tipo",
              type: "select",
              label: "Tipo",
              width: 12,
              options: []
            }
          ],
          [
            {
              key: "id_sede",
              type: "select",
              label: "Sede",
              width: 12,
              options: []
            }
          ],
          [
            {
              key: "id_livello",
              type: "select",
              label: "Livello",
              width: 12,
              options: []
            }
          ],
          [
            {
              key: "id_paviment",
              type: "select",
              label: "Pavimentazione",
              width: 12,
              options: []
            }
          ],
          [
            {
              key: "id_portata",
              type: "select",
              label: "Portata",
              width: 12,
              options: []
            }
          ],
          [
            {
              key: "id_stato_cons",
              type: "select",
              label: "Stato conservazione",
              width: 12,
              options: []
            }
          ],
          [
            {
              key: "id_sezione",
              type: "select",
              label: "Sezione",
              width: 12,
              options: []
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
              key: "id_tipologia",
              type: "select",
              label: "Tipologia",
              width: 12,
              options: []
            }
          ],
          [
            {
              key: "id_proprieta",
              type: "select",
              label: "Proprietà",
              width: 12,
              options: []
            }
          ],
          [
            {
              key: "id_delib_propr",
              type: "select",
              label: "Delib. di propr.",
              width: 12,
              options: [] //TODO
            }
          ],
          [
            {
              key: "id_senso_percorrenza",
              type: "select",
              label: "Senso percorrenza",
              width: 12,
              options: []
            }
          ],
          [
            {
              key: "id_stra_cs",
              type: "select",
              label: "Classe di percorrenza",
              width: 12,
              options: []
            }
          ]
        ]
      }
    ]
  };

  t5FormCfg =
  {
    id:"t5Form", fg:
    [
      {
        id:0, rows:
        [
          [
            {
              key: "id_funzionalita",
              type: "select",
              label: "Funzionalità",
              width: 12,
              options: []
            }
          ],
          [
            {
              key: "id_tipo_lim_amm",
              type: "select",
              label: "Limite amministrativo",
              width: 12,
              options: this.ctxSvc.getContext("tipoLimAmm")
            }
          ],
          [
            {
              key: "id_class_funz",
              type: "select",
              label: "Classe funzionale",
              width: 12,
              options: []
            }
          ],
          [
            {
              key: "id_fondo",
              type: "select",
              label: "Fondo",
              width: 12,
              options: []
            }
          ],
          [
            {
              key: "id_carreggiata",
              type: "select",
              label: "Carreggiata",
              width: 12,
              options: []
            }
          ],
          [
            {
              key: "id_marcia",
              type: "select",
              label: "Marcia",
              width: 12,
              options: []
            }
          ],
          [
            {
              key: "id_stato_esercizio",
              type: "select",
              label: "Stato esercizio",
              width: 12,
              options: []
            }
          ],
          [
            {
              key: "id_origine",
              type: "select",
              label: "Origine",
              width: 12,
              options: []
            }
          ],
          [
            {
              key: "id_fonte",
              type: "select",
              label: "Fonte",
              width: 12,
              options: []
            }
          ]
        ]
      }
    ]
  };

  /* Tabs config */
  tabs = [
    {closed:false, formCfg:this.t1FormCfg, title:"Generali"},
    {closed:true, formCfg:this.t2FormCfg, title:"Civici"},
    {closed:true, formCfg:this.t3FormCfg, title:"Fisiche"},
    {closed:true, formCfg:this.t4FormCfg, title:"Classificazioni"},
    {closed:true, formCfg:this.t5FormCfg, title:"Dati Intesa"}
  ];

  /*
   * Class methods
   */
  constructor(
    private ctxSvc:ContextService,
    private authSvc:AuthService,
    private modelSvc:ModelService,
    private webgisSvc:WebgisService
  ) {}

  ngOnInit()
  {
    /* Check permission */
    let aPerm = this.authSvc.permForModule("graph");
    this.readOnly = aPerm.indexOf("ARCO_UPDATE") == -1;

    if (this.readOnly)
    {
      setTimeout(() =>
      {
        this.qlFormCmp.forEach(cmp => cmp.disableFields(null,true));
      },10);
    }

    /* Load via master */
    this.modelSvc.master("/via/master",{ord:"denominazione|ASC"}).subscribe(
    res =>
    {
      this.genFormCfg.fg[0].rows[2][0]["options"] = res || [];
    });

    /* Load dictionaries */
    this.modelSvc.master("/arcoDizionari/master",{}).subscribe(res =>
    {
      this.t3FormCfg.fg[0].rows[0][0]["options"] = res["arco_uso"];
      this.t3FormCfg.fg[0].rows[1][0]["options"] = res["arco_classe"];
      this.t3FormCfg.fg[0].rows[2][0]["options"] = res["arco_tipo"];
      this.t3FormCfg.fg[0].rows[3][0]["options"] = res["arco_sede"];
      this.t3FormCfg.fg[0].rows[4][0]["options"] = res["arco_livello"];
      this.t3FormCfg.fg[0].rows[5][0]["options"] = res["arco_pavimentazione"];
      this.t3FormCfg.fg[0].rows[6][0]["options"] = res["arco_portata"];
      this.t3FormCfg.fg[0].rows[7][0]["options"] = res["arco_stato_cons"];
      this.t3FormCfg.fg[0].rows[8][0]["options"] = res["arco_sezione"];

      this.t4FormCfg.fg[0].rows[0][0]["options"] = res["arco_tipologia"];
      this.t4FormCfg.fg[0].rows[1][0]["options"] = res["arco_proprieta"];
      this.t4FormCfg.fg[0].rows[3][0]["options"] = res["arco_senso_percorrenza"];
      this.t4FormCfg.fg[0].rows[4][0]["options"] = res["arco_strada_cs"];

      this.t5FormCfg.fg[0].rows[0][0]["options"] = res["arco_funzionalita"];
      this.t5FormCfg.fg[0].rows[2][0]["options"] = res["arco_class_funz"];
      this.t5FormCfg.fg[0].rows[3][0]["options"] = res["arco_fondo"];
      this.t5FormCfg.fg[0].rows[4][0]["options"] = res["arco_carreggiata"];
      this.t5FormCfg.fg[0].rows[5][0]["options"] = res["arco_marcia"];
      this.t5FormCfg.fg[0].rows[6][0]["options"] = res["arco_stato_esercizio"];
      this.t5FormCfg.fg[0].rows[7][0]["options"] = res["arco_origine"];
      this.t5FormCfg.fg[0].rows[8][0]["options"] = res["arco_fonte"];
    });
  }

  ngOnChanges(changes:SimpleChanges)
  {
    if (changes.entity && this.entity)
    {
      var mapChange = this.entity.mapChange || {},
        nodo_da = mapChange.nodo_da || this.entity.nodo_da,
        nodo_a = mapChange.nodo_a || this.entity.nodo_a;

      // Only on insert one or both nodes can be null
      if (!this.entity.isNew() && (!nodo_da || !nodo_a))
      {
        console.warn("NULL nodes for arc " + this.entity.cod_arco);
        return;
      }

      /* Load street for arco nodes */
      var nodes = {nodo_da:nodo_da, nodo_a:nodo_a, arco:this.entity.cod_arco};

      this.modelSvc.master("/arco/streetForNode", nodes).subscribe(res =>
      {
        if (res)
        {
          /* Update via_da and via_a options */
          this.t1FormCfg.fg[0].rows[4][0]["options"] = res["nodo_da"] || [];
          this.t1FormCfg.fg[0].rows[5][0]["options"] = res["nodo_a"] || [];

          if (this.entity.isNew() &&
              this.t1FormCfg.fg[0].rows[4][0]["options"].length == 1)
          {
            this.getFormCmp("t1Form").setValueForKey(
              "cod_via_da",
              this.t1FormCfg.fg[0].rows[4][0]["options"][0]['cod_via']
            );
          }

          if (this.entity.isNew() &&
              this.t1FormCfg.fg[0].rows[5][0]["options"].length == 1)
          {
            this.getFormCmp("t1Form").setValueForKey(
              "cod_via_a",
              this.t1FormCfg.fg[0].rows[5][0]["options"][0]['cod_via']
            );
          }
        }
      });

      /* Load street for arco (valid only in insert mode) */
      // if nodo_da and/or nodo_a are null ->
      // we search via of arco to break for insert new node(s)
      if (this.entity.isNew())
      {
        var arco_da = nodo_da ? null : this.entity.nodeFrom['arco'];
        var arco_a  = nodo_a ? null : this.entity.nodeTo['arco'];

        var arco = {arco_da:arco_da, arco_a:arco_a};

        this.modelSvc.master("/arco/streetForArco", arco).subscribe(res =>
        {
          if (res)
          {
            /* Update via_da and via_a options */
            if (arco.arco_da)
              this.t1FormCfg.fg[0].rows[4][0]["options"] = res["arco_da"] || [];

            if (arco.arco_a)
              this.t1FormCfg.fg[0].rows[5][0]["options"] = res["arco_a"] || [];

            // if array have only one element -> we set it into select
            if (this.t1FormCfg.fg[0].rows[4][0]["options"].length == 1)
            {
              this.getFormCmp("t1Form").setValueForKey(
                "cod_via_da",
                this.t1FormCfg.fg[0].rows[4][0]["options"][0]['cod_via']
              );
            }

            if (this.t1FormCfg.fg[0].rows[5][0]["options"].length == 1)
            {
              this.getFormCmp("t1Form").setValueForKey(
                "cod_via_a",
                this.t1FormCfg.fg[0].rows[5][0]["options"][0]['cod_via']
              );
            }
          }
        });
      }

      /* Update forms */
      if (!this.readOnly)
      {
        setTimeout(() =>
        {
          let mode = this.entity.getMode(),
            fg = this.getFormCmp("genForm"),
            f1 = this.getFormCmp("t1Form"),
            f2 = this.getFormCmp("t2Form"),
            f3 = this.getFormCmp("t3Form"),
            f4 = this.getFormCmp("t4Form"),
            f5 = this.getFormCmp("t5Form");

          fg.hiddenFields(["nome_via"],mode == 1);
          fg.hiddenFields(["cod_via_new"],mode > 1);

          f1.disableFields(["data_ini"],mode > 1);
          f1.disableFields(["corsie","lunghezza","larghezza","superficie",
            "cod_via_da","cod_via_a"],mode > 3
          );

          f2.disableFields(["id_quart_pari","id_quart_disp",
            "estr_verif","cresciv"],mode > 3
          );

          f3.disableFields(null,mode > 3);
          f4.disableFields(null,mode > 3);
          f5.disableFields(null,mode > 3);

          if (mode == 1)
            f1.setValueForKey("data_ini",new Date());

          /* Set map change on t1Form */
          for (let key in mapChange)
            f1.setValueForKey(key,mapChange[key]);

          this.entity.mapChange = null;
        },10);
      }
    }
  }

  zoomTo()
  {
    this.webgisSvc.setLayerVisibility(Arco.getLayerKey(),true);
    var bbox = this.entity.getBBox();

    if (bbox)
    {
      this.webgisSvc.zoomToBBox(bbox, 32633);
      this.webgisSvc.hilightFeature(Arco.getLayerKey(),'cod_arco',this.entity.cod_arco, bbox);
    }
  }

  hilightAssociate()
  {
    // we have to hilight civici related to given arco
    this.webgisSvc.hilightFeature(
      Civico.getLayerKey(),
      'cod_arco',
      this.entity.cod_arco,
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

  save()
  {
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

    /* Remove extra attributes */
    delete chObj["cod_via_new"];

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

  /*
   * Event handler
   */
  onFormChange(obj)
  {
    let form = this.getFormCmp(obj.id);

    if (obj.id == "genForm")
    {
      switch (obj.key)
      {
        case "cod_via_new":
          form.setValueForKey("cod_via",obj.val);
          break;
      }
    }
  }

  /*
   * Private methods
   */
  private getFormCmp(id)
  {
    return this.qlFormCmp.find(cmp => cmp.id === id);
  }

  private mustSave(chObj:any)
  {
    // insert new arco (and execute related operations)
    if (this.entity.isNew())
    {
      // object to post
      let obj = {};

      // Add nodo_da and nodo_a (they are not always valued)
      if (this.entity.nodo_da)
        chObj["nodo_da"] = this.entity.nodo_da;

      if (this.entity.nodo_a)
        chObj["nodo_a"] = this.entity.nodo_a;

      chObj["lunghezza"] = this.entity.lunghezza;

      // alphanumeric attributes of new arco
      obj["newArcoAttrs"] = chObj;

      // Add extra attributes
      obj["nodeFrom"]    = this.entity.nodeFrom;
      obj["nodeTo"]      = this.entity.nodeTo;
      obj["newArcoPoints"] = this.entity.points;

      /* Insert */
      this.modelSvc.insert("/arco/create",obj).subscribe(res =>
      {
        if (res)
        {
          this.message = "MESSAGE.INSERT_OK";
          //this.msgColor = "#28a745";
          this.saveOk = true;

          /* Update entity */
          this.entity.update(chObj);

          // set cod_arco
          this.entity.cod_arco = res["cod_arco"];
          this.getFormCmp("genForm").setValueForKey("cod_arco",res["cod_arco"]);

          // set nodo_da (if not valued at the time of entry)
          if (!this.entity.nodo_da)
          {
            this.entity.nodo_da = res["nodo_da"];
            this.getFormCmp("t1Form").setValueForKey("nodo_da",res["nodo_da"]);
          }

          // set nodo_a (if not valued at the time of entry)
          if (!this.entity.nodo_a)
          {
            this.entity.nodo_a = res["nodo_a"];
            this.getFormCmp("t1Form").setValueForKey("nodo_a",res["nodo_a"]);
          }

          /* Send message to reset edit to consistent status */
          this.webgisSvc.sendMessage("endEdit", {
            status: "D", // D <=> close edit operations with success
            entity: new Arco({},2)
          });

          // refresh related map layer
          this.webgisSvc.refreshLayer("arco");
          this.webgisSvc.refreshLayer("nodo");
          this.webgisSvc.refreshLayer("proiezione");
        }
        else
        {
          this.message = "MESSAGE.INSERT_ERR";
          //this.msgColor = "red";
          this.saveOk = false;
        }
      });
    }
    else
    {
      /* Update */
      let url = "/arco/update/"+this.entity.cod_arco;

      // Add geom as extra attributes (if presents)
      if (this.entity.points)
        chObj['arcoPoints'] = this.entity.points;

      this.modelSvc.update(url,chObj).subscribe(res =>
      {
        if (res)
        {
          this.entity.update(chObj);
          this.message = "MESSAGE.UPDATE_OK";
          //this.msgColor = "#28a745";
          this.saveOk = true;

          // send message to reset edit to consistent status
          this.webgisSvc.sendMessage("endEdit", {
            status: "E", // E <=> close edit operations with error
            entity: new Arco({},2)
          });

          // refresh map layer
          this.webgisSvc.refreshLayer("arco");
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
}
