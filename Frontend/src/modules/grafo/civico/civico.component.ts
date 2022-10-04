import { Component,OnInit,OnChanges,SimpleChanges } from '@angular/core';
import { Input,Output,EventEmitter,ViewChildren,QueryList } from '@angular/core';

import { ContextService }    from '../../core/context.service';
import { ModelService }      from '../../core/model.service';
import { AuthService }       from '../../core/auth.service';
import { HttpReaderService } from '../../core/http-reader.service';
import { FormComponent }     from '../../core/form/form.component';

import { WebgisService } from '../../webgis/webgis.service';
import { HilightMode,
         StyleType }     from '../../webgis/webgis.util';

import { Arco }     from '../entity/arco';
import { Civico }   from '../entity/civico';
import { Edificio } from '../entity/edificio';

@Component({
  selector: 'grafo-civico',
  templateUrl: './civico.component.html',
  styleUrls: ['./civico.component.css']
})
export class CivicoComponent implements OnInit, OnChanges
{
  @Input() entity:Civico;
  @Output() showMsg = new EventEmitter<any>();
  @ViewChildren(FormComponent) qlFormCmp:QueryList<FormComponent>;

  /* Attributes */
  message:string = null;
  //msgColor:string = null;
  readOnly:boolean = false;

  saveOk:boolean = false;

  /* Forms config */
  genFormCfg =
  {
    id:"genForm", fg:
    [
      {
        id:0,rows:
        [
          [
            {
              key: "numero",
              type: "number",
              label: "N. Civico",
              width: 3,
              onlyNumber: true,
              required: true
            },
            {
              key: "esponente",
              type: "text",
              label: "Esponente",
              width: 3,
              uppercase: true,
              onlyLetter: true,
              onlyNumber: true,
              required: false
            },
            {
              key: "bEstensione",
              type: "boolean",
              label: "Estensione",
              width: 4,
              required: true
            },
            {
              key: "btEstensione",
              type: "button",
              label: "",
              width: 2,
              btnImage: "assets/common/hand.png"
            }
          ]
        ]
      },
      {
        id:1, rows:
        [
          [
            {
              key: "estensione",
              type: "text",
              uppercase: true,
              onlyLetter: true,
              onlyNumber: true,
              label: "Descrizione estensione",
              width: 12,
              required: true
            }
          ]
        ]
      },
      {
        id:2, rows:
        [
          [
            {
              key: "cod_via",
              type: "number",
              label: "Via",
              width: 4,
              disabled: true
            },
            {
              key: "nome_via",
              type: "text",
              label: "",
              width: 8,
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
              key: "cod_arco",
              type: "number",
              label: "ID arco",
              width: 10,
              disabled: true
            },
            {
              key: "btArcoGet",
              type: "button",
              label: "",
              width: 2,
              btnImage: "assets/common/hand.png"
            }
          ],
          [
            {
              key: "id_edificio",
              type: "select",
              label: "ID edificio",
              width: 10,
              options: [],
              multiple: true
            },
            {
              key: "btEdifGet",
              type: "button",
              label: "",
              width: 2,
              btnImage: "assets/common/hand.png"
            }
          ]
        ]
      },
      {
        id:1, label:"Posizione civico", rows:
        [
          [
            {
              key: "x",
              type: "number",
              label: "X",
              width: 6,
              disabled: true
            },
            {
              key: "y",
              type: "number",
              label: "Y",
              width: 6,
              disabled: true
            }
          ]
        ]
      },
      {
        id:2, label:"Posizione proiezione civico", rows:
        [
          [
            {
              key: "proiezione_x",
              type: "number",
              label: "X",
              width: 5,
              disabled: true
            },
            {
              key: "proiezione_y",
              type: "number",
              label: "Y",
              width: 5,
              disabled: true
            },
            {
              key: "btProjGet",
              type: "button",
              label: "",
              width: 2,
              btnImage: "assets/common/hand.png"
            }
          ]
        ]
      },
      {
        id:3, label:"Catasto edifici", rows:[[]]
      }
    ]
  };

  t3FormCfg =
  {
    id:"t3Form", fg:
    [
      {
        id:0,rows:
        [
          [
            {
              key: "btParcelSpan",
              label: null,
              width: 10
            },
            {
              key: "btParcel",
              type: "button",
              label: null,
              width: 2,
              btnImage: "assets/common/hand.png"
            }
          ]
        ]
      }
    ]
  };

  t6FormCfg =
  {
    id:"t6Form", fg:
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
              key: "data_inserimento",
              type: "timestamp",
              label: "Data inserimento",
              width: 6,
              subType: "date",
              disabled: true
            }
          ],
          [
            {
              key: "id_mot_inserimento",
              type: "select",
              label: "Motivo inserimento",
              width: 12,
              options: []
            }
          ],
          [
            {
              key: "numero_delib",
              type: "text",
              label: "Estremi delibera attribuzione",
              width: 12
            }
          ]
        ]
      },
      {
        id:1, rows:
        [
          [
            {
              key: "data_fine",
              type: "timestamp",
              label: "Data fine validità",
              width: 6,
              subType: "date"
            },
            {
              key: "id_mot_cessazione",
              type: "select",
              label: "Motivo cessazione",
              width: 6,
              options: []
            }
          ]
        ]
      },
      {
        id:2, rows:
        [
          [
            {
              key: "prev_civico",
              type: "number",
              label: "ID civico precedente",
              width: 6,
              disabled: true
            },
            {
              key: "id_lato_strada",
              type: "select",
              label: "Lato strada",
              width: 6,
              options: this.contextSvc.getContext("civicoLatoStrada")
            }
          ],
          [
            {
              key: "provvisorio",
              type: "boolean",
              label: "Provvisorio",
              width: 6
            },
            {
              key: "serv_rsu",
              type: "boolean",
              label: "Servito da raccolta rifiuti",
              width: 6
            }
          ],
          [
            {
              key: "accesso_multiplo",
              type: "boolean",
              label: "Accesso multiplo",
              width: 6
            },
            {
              key: "carrabile",
              type: "boolean",
              label: "Carrabile",
              width: 6
            }
          ],
          [
            {
              key: "cap",
              type: "number",
              label: "CAP",
              width: 6
            },
            {
              key: "id_tipo_ingresso",
              type: "select",
              label: "Tipo ingresso",
              width: 6,
              options: []
            }
          ],
          [
            {
              key: "nota",
              type: "textarea",
              label: "Note",
              width: 12
            }
          ]
        ]
      }
    ]
  };

  /* Catasto edifici table config */
  t1TableCfg =
  {
    data: [],
    columns: [
      {key:"id", label:"ID edificio"},
      {key:"sezione", label:"Sezione"},
      {key:"foglio", label:"Foglio"},
      {key:"numero", label:"Numero"}
    ]
  };

  /* Estensioni table config */
  t2TableCfg =
  {
    data: [],
    columns: [{key:"estensione", label:"Nome"}]
  };

  /* Particelle table config */
  t3TableCfg =
  {
    id: "t3Table",
    data: [],
    buttonsRow: ["D"],
    columns: [
      {key:"sezione", label:"Sezione", editable:true},
      {key:"allegato",label:"Allegato"},
      {key:"foglio", label:"Foglio"},
      {key:"numero", label:"Numero"}
    ]
  };

  /* Zone table config */
  t4TableCfg =
  {
    data: [],
    columns: [
      {key:"name", label:"Nome"},
      {key:"descr", label:"Descrizione"},
      {key:"valore", label:"Valore"}
    ]
  };

  /* Tabs config */
  tabs =
  [
    {
      title:"Generale", closed:false,
      formCfg:this.t1FormCfg, tableCfg:this.t1TableCfg
    },
    {
      title:"Estensioni", closed:true,
      tableCfg:this.t2TableCfg
    },
    {
      title:"Particelle terreni", closed:true,
      tableCfg: this.t3TableCfg, formCfgBot:this.t3FormCfg
    },
    {
      title:"Zone", closed:true,
      tableCfg: this.t4TableCfg
    },
    {
      title:"Altri", closed:true,
      formCfg: this.t6FormCfg
    }
  ];

  /*
   * Methods
   */
  constructor (
    private authSvc:AuthService,
    private modelSvc:ModelService,
    private webgisSvc:WebgisService,
    private contextSvc:ContextService,
    private httpReader: HttpReaderService
  ) {}

  ngOnInit()
  {
    /* Check permission */
    let aPerm = this.authSvc.permForModule("graph");
    this.readOnly = aPerm.indexOf("CIVICO_UPDATE") == -1;

    if (this.readOnly)
    {
      setTimeout(() =>
      {
        this.qlFormCmp.forEach(cmp => cmp.disableFields(null,true));
      },10);
    }

    /* Load dictionaries */
    this.modelSvc.master("/civico/dictionaries",{}).subscribe(res =>
    {
      if (res)
      {
        this.t6FormCfg.fg[0].rows[1][0]["options"] = res["motInserimento"];
        this.t6FormCfg.fg[1].rows[0][1]["options"] = res["motCessazione"];
        this.t6FormCfg.fg[2].rows[3][1]["options"] = res["tipoIngresso"];
      }
    });
  }

  ngOnChanges(changes:SimpleChanges)
  {
    if (changes.entity && this.entity)
    {
      /* Update zone table */
      let zone = this.entity.zone;

      if (this.entity.mapChange && this.entity.mapChange.zone)
      {
        zone = this.entity.mapChange.zone;
        delete this.entity.mapChange.zone;
      }

      this.t4TableCfg.data.splice(0);
      if (zone) Array.prototype.push.apply(this.t4TableCfg.data,zone);

      /* Update catasto edifici table */
      let catasto_edifici = this.entity.catasto_edifici;

      if (this.entity.mapChange && this.entity.mapChange.catasto_edifici)
      {
        catasto_edifici = this.entity.mapChange.catasto_edifici;
        delete this.entity.mapChange.catasto_edifici;
      }

      this.t1TableCfg.data.splice(0);

      if (catasto_edifici)
        Array.prototype.push.apply(this.t1TableCfg.data, catasto_edifici);

      /* Update estensioni table */
      this.t2TableCfg.data.splice(0);

      if (this.entity.estensioni)
        Array.prototype.push.apply(this.t2TableCfg.data,this.entity.estensioni);

      /* Update particelle table */
      let particelle = this.entity.particelle;

      if (this.entity.mapChange && this.entity.mapChange.particelle)
      {
        particelle = this.entity.mapChange.particelle;
        delete this.entity.mapChange.particelle;

        this.entity.bSaveParticelle = true;
      }

      this.t3TableCfg.data.splice(0);

      if (particelle)
        Array.prototype.push.apply(this.t3TableCfg.data, particelle);

      /* Update id_edificio options */
      let edOpt = [], edIdArr = this.entity.id_edificio ||
        (this.entity.mapChange ? this.entity.mapChange.id_edificio : null);

      if (edIdArr)
        for (let j = 0;j < edIdArr.length;j++)
          edOpt.push({id:edIdArr[j], name:edIdArr[j]+""});

      this.t1FormCfg.fg[0].rows[1][0]["options"] = edOpt;

      /*
       * Update forms
       */
      if (!this.readOnly)
      {
        setTimeout(() =>
        {
          let mode = this.entity.getMode(),
            fg = this.getFormCmp("genForm"),
            f1 = this.getFormCmp("t1Form"),
            f6 = this.getFormCmp("t6Form");

          fg.disableFieldsGroup([0],mode > 1);
          fg.hiddenFieldsGroup([1],this.entity.bEstensione != true);

          f1.disableFields(["btArcoGet","id_edificio","btEdifGet"],mode > 5);
          f1.disableFields(["btProjGet"],mode != 2);

          //f6.disableFieldsGroup([0],mode > 1);
          f6.disableFields(["data_ini", "data_inserimento", "id_mot_inserimento"],mode > 1);
          f6.disableFields(["data_inserimento"],true);
          f6.disableFieldsGroup([1],mode != 3);
          f6.disableFieldsGroup([2],mode > 5);
          f6.disableFields(["prev_civico"],true);

          if (mode == 1)
            f6.setValueForKey("data_ini",new Date());

          if (mode == 1)
            f6.setValueForKey("data_inserimento",new Date());

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
    this.webgisSvc.setLayerVisibility(Civico.getLayerKey(),true);
    var bbox = this.entity.getBBox();

    if (bbox)
    {
      this.webgisSvc.zoomToBBox(bbox, 32633);
      this.webgisSvc.hilightFeature(Civico.getLayerKey(),'id',this.entity.id, bbox);
    }
  }

  hilightAssociate()
  {
    // we have to hilight edificio, arco, proiezione, estensioni related to given civico

    // edifici (1:N relation)
    if (this.entity.id_edificio && this.entity.id_edificio.length > 0)
    {
      for (let idx=0; idx<this.entity.id_edificio.length; idx++)
      {
        let edificioId = this.entity.id_edificio[idx];

        this.webgisSvc.hilightFeature(
          Edificio.getLayerKey(),
          'id',
          edificioId,
          undefined,
          [{
            type:StyleType.POLYGON,
            id:1,
            color: "#fdd017aa",
            strokeColor: "#fdd017ff",
            strokeWidth: 3
          }],
          HilightMode.APPEND
        );
      }
    }

    // arco
    this.webgisSvc.hilightFeature(
      Arco.getLayerKey(),
      'cod_arco',
      this.entity.cod_arco,
      undefined,
      [{
        type:StyleType.LINE,
        id:1,
        strokeColor: "#fdd017ff",
        strokeWidth: 3
      }],
      HilightMode.APPEND
    );

    // proiezione
    this.webgisSvc.hilightFeature(
      'proiezione',
      'id',
      this.entity.id,
      undefined,
      [{
        type:StyleType.SHAPE,
        id:1,
        size:10,
        color: "#fdd017ff"
      }],
      HilightMode.APPEND
    );

    // estensioni
    this.webgisSvc.hilightFeature(
      Civico.getLayerKey(),
      'id_civico_principale',
      this.entity.id,
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

    /*
     * For extensions we must not save civico projections
     */
    if (chObj["bEstensione"])
    {
      delete chObj["proiezione_x"];
      delete chObj["proiezione_y"];
    }

    /*
     * Look for changed particelle
     */
    if (this.entity.bSaveParticelle)
      chObj["particelle"] = this.t3TableCfg.data;

    /*
     * Look for changed zone
     */
    let id_zone = this.entity.getChangedZone(this.t4TableCfg.data);
    if (id_zone) chObj["id_zone"] = id_zone;

    /*
     * Process extra attributes
     */
    if (chObj["nome_via"])
    {
      this.entity.nome_via = chObj["nome_via"];
      delete chObj["nome_via"];
    }

    if (chObj["estensione"] && !chObj["bEstensione"] && !this.entity.bEstensione)
      chObj["estensione"] = null;

    if (chObj["bEstensione"] !== undefined)
    {
      if (chObj["bEstensione"] && !chObj["numero"])
      {
        this.showMsg.emit({
          msg: "Selezionare il civico principale!",
          title: "Attenzione",
          style: "warning",
          buttons: [{id:1, label:"Ok"}]
        });
        return;
      }

      chObj["id_civico_principale"] = chObj["bEstensione"] ?
        this.entity.id_civico_principale : null;

      delete chObj["bEstensione"];
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

  /*
   * Event handler
   */
  onFormChange(obj)
  {
    let form = this.getFormCmp(obj.id);

    switch (obj.key)
    {
      case "bEstensione":
        form.setValueForKey("numero",null);
        form.setValueForKey("esponente",null);

        form.disableFields(["btEstensione"],obj.val != true);
        form.disableFields(["numero","esponente"],obj.val == true);
        form.hiddenFieldsGroup([1],obj.val != true);

        let formGen = this.getFormCmp("t1Form");
        formGen.hiddenFieldsGroup([2],obj.val == true);
        break;
      case "btEstensione":
        this.webgisSvc.sendMessage("getFeatureId",
        {
          layerKey: "civico",
          callback: res =>
          {
            if (res && res.id)
            {
              // retrieve detail of civico principale to associate at the extension
              this.modelSvc.detail("/civico/detail/"+res.id).subscribe(det =>
              {
                if (det)
                {
                  let formGen = this.getFormCmp("t1Form");

                  // if cod_arco of civico principale is different, we have to
                  // reproject extension on this cod_arco
                  if (det.cod_arco != formGen.getValueForKey("cod_arco"))
                  {
                    // Get new projection info
                    let url = "/civico/retrieveProjOnArco", body = {
                      x: formGen.getValueForKey("x"),
                      y: formGen.getValueForKey("y"),
                      cod_arco: det.cod_arco
                    };

                    this.modelSvc.detail(url,body).subscribe(proj =>
                    {
                      if (!proj)
                      {
                        console.info("ERROR on " + url);
                        //return;
                      }

                      // Update form fields
                      formGen.setValueForKey("proiezione_x",proj.proiezione_x);
                      formGen.setValueForKey("proiezione_y",proj.proiezione_y);
                    });
                  }

                  this.entity.id_civico_principale = det.id;

                  /* Update form fields */
                  form.setValueForKey("numero",det.numero);
                  form.setValueForKey("cod_via",det.cod_via);
                  form.setValueForKey("nome_via",det.nome_via);
                  form.setValueForKey("esponente",det.esponente);

                  formGen.setValueForKey("cod_arco",det.cod_arco);
                }
              });
            }
          }
        });
        break;
      case "btArcoGet":
        this.webgisSvc.sendMessage("getFeatureId",
        {
          layerKey: "arco",
          // add filter condition to select arco of given via
          // if entity mode is not an insert (mode value is 1)
          filterCond: (this.entity.getMode() > 1) ?
            [{attr:"cod_via", value:form.entity.cod_via}] : null,
          callback: res => {
            // if res.id is null, selected feature doesn't verify the filterCond
            if (!res.id)
            {
              this.showMsg.emit({
                msg: "E' stato selezionato un arco stradale appartenente "+
                  "ad una via diversa da quella corrente!\n"+
                  "Ripetere l'operazione.",
                //size: "sm",
                style: "danger",
                title: "Attenzione",
                buttons: [{id:1, label:"Ok"}]
              });
            }
            else
            {
              /* Get new projection info */
              let url = "/civico/retrieveProjOnArco", body = {
                x: form.getValueForKey("x"),
                y: form.getValueForKey("y"),
                cod_arco: res.id
              };

              this.modelSvc.detail(url,body).subscribe(proj =>
              {
                if (!proj)
                {
                  console.info("ERROR on "+url);
                  return;
                }

                /* Update form fields */
                let fg = this.getFormCmp("genForm");

                fg.setValueForKey("cod_via",proj.cod_via);
                fg.setValueForKey("nome_via",proj.nome_via);

                form.setValueForKey("cod_arco",res.id);
                form.setValueForKey("proiezione_x",proj.proiezione_x);
                form.setValueForKey("proiezione_y",proj.proiezione_y);
              });
            }
          }
        });
        break;
      case "btProjGet":
        this.webgisSvc.setLayerVisibility('proiezione', true);
        this.webgisSvc.mapComponent.map.once('singleclick', (evt) =>
          {
            form.setValueForKey("proiezione_x",evt.coordinate[0].toFixed(2)*1);
            form.setValueForKey("proiezione_y",evt.coordinate[1].toFixed(2)*1);
          }
        );
        break;
      case "id_edificio":
        /* Edificio is removed from multiselect:
           remove it from catasto edifici table too */
        let aCatEdi = this.t1TableCfg.data || [];

        for (let j = aCatEdi.length-1;j >= 0;j--)
        {
          if (obj.val.indexOf(aCatEdi[j].id) < 0)
            aCatEdi.splice(j,1);
        }

        break;
      case "btEdifGet":
        this.webgisSvc.sendMessage("getFeatureId",
        {
          layerKey: "edificio",
          filterCond: null,
          callback: res => {
            let ediArr = form.getValueForKey("id_edificio") || [],
              ediOpt = this.t1FormCfg.fg[0].rows[1][0]["options"];

            if (ediArr.indexOf(res.id) >= 0)
              return;

            /* Update id_edificio options */
            this.t1FormCfg.fg[0].rows[1][0]["options"] =
              [...ediOpt,{id:res.id, name:res.id+""}];

            /* Add new id_edificio */
            form.setValueForKey("id_edificio",[...ediArr,res.id]);

            // retrieve detail of selected edificio to show its cadastral data
            this.modelSvc.detail("/edificio/detail/"+res.id).subscribe(det =>
            {
              if (det)
              {
                this.t1TableCfg.data.push({
                  sezione: det['sezione'],
                  foglio: det['foglio'],
                  numero: det['numero'],
                  id: res.id
                });
              }
              else
              {
                this.showMsg.emit({
                  style: "danger",
                  msg: "Si è verificato un errore durante il recupero delle informazioni catastali dell'edificio selezionato",
                  title: "Attenzione",
                  buttons: [
                    {id:1, label:"Ok"}
                  ]
                });
              }
            });
          }
        });
        break;
      case "btParcel":
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
              // retrieve data for select cadastre parcel
              let url = "/cadastre/retrieveParcelData/" + res.id;

              this.httpReader.get(url).subscribe(
                ret => {
                  // id _civico is valued only if civiCo already exists
                  // (we are update terrain parcel data on civico)
                  this.t3TableCfg.data.push({
                    sezione: ret['sezione'],
                    foglio: ret['foglio'],
                    numero: ret['numero'],
                    allegato: ret['allegato'],
                    id_civico: this.entity.id ? this.entity.id : null
                  });
                  this.entity.bSaveParticelle = true;
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
    }
  }

  onTableBtn(opt)
  {
    if (opt.id != "t3Table")
      return;

    switch (opt.op)
    {
      case "D":
        let idx = this.t3TableCfg.data.indexOf(opt.obj);
        if (idx >= 0) this.t3TableCfg.data.splice(idx,1);

        this.entity.bSaveParticelle = true;
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
    if (this.entity.isNew())
    {
      // convert esponente and estensione in upper case
      if (chObj['esponente'])
        chObj['esponente'] = chObj['esponente'].toUpperCase();

      if (chObj['estensione'])
        chObj['estensione'] = chObj['estensione'].toUpperCase();

      /* Insert */
      this.modelSvc.insert("/civico/insert",chObj).subscribe(res =>
      {
        if (res)
        {
          if (res['error'])
          {
            this.showMsg.emit({
              style: "danger",
              msg: "Esiste già un numero civico avente stessa via, numero, esponente e estensione; verificare i dati immessi",
              title: "Attenzione",
              buttons: [
                {id:1, label:"Ok"}
              ]
            });
          }
          else
          {
            this.entity.id = res["id"];
            this.entity.update(chObj);

            this.message = "MESSAGE.INSERT_OK";
            //this.msgColor = "#28a745";
            this.saveOk = true;
          }

          // enable change projection button
          this.t1FormCfg.fg[2].rows[0][2]["disabled"] = false;

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
      let url = "/civico/update/"+this.entity.id;

      // convert esponente and estensione in upper case
      if (chObj['esponente'])
        chObj['esponente'] = chObj['esponente'].toUpperCase();

      if (chObj['estensione'])
        chObj['estensione'] = chObj['estensione'].toUpperCase();

      this.modelSvc.update(url,chObj).subscribe(res =>
      {
        if (res)
        {
          /* Replace zone_id with zone */
          if (chObj["id_zone"])
          {
            chObj["zone"] = this.t4TableCfg.data;
            delete chObj["id_zone"];
          }

          /* Update entity */
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

        /* Notify to webgis */
        this.webgisSvc.sendMessage("endEdit",{
          entity: this.entity,
          additionalLayerKeyToRefresh: ["proiezione"],
          status: this.saveOk ? "D" : "E"
        });
      });
    }
  }
}
