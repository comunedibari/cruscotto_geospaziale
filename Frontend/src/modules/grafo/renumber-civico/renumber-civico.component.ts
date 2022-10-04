
import {Component,
        OnInit,
        AfterViewInit,
        Input,
        ViewChild}            from '@angular/core';

import {FormComponent}        from '../../core/form/form.component';
import {ModelService}         from '../../core/model.service';
import {HttpWriterService}    from '../../core/http-writer.service';

import {WebgisService}        from '../../webgis/webgis.service';
import {EditStatus}           from '../../webgis/webgis.util'; 

import {Civico}               from '../../grafo/entity/civico'; 

@Component({
  selector: 'grafo-renumber-civico',
  templateUrl: './renumber-civico.component.html',
  styleUrls: ['./renumber-civico.component.css']
})

export class RenumberCivicoComponent implements OnInit {

  @ViewChild(FormComponent) formCmp:FormComponent;

  renumberObj:Object = null;

  visible   = false;
  collapsed = false;

  //msgStyle = null;

  error:Object = {};

  renumberOk:boolean = false;

  // Attributes
  message:string = null;
  alert: Object = {};

  // Form config
  formCfg =
  {
    id:"renumberCivicoForm", fg:
    [
      {
        id:0, label:"Numero Civico precedente",
        rows:[
          [
            {
              key: "prev_numero",
              type: "number",
              label: "N. Civico",
              width: 3,
              disabled: true
            },
            {
              key: "prev_esponente",
              type: "text",
              label: "Esponente",
              width: 3,
              disabled: true
            },
            {
              key: "prev_cod_arco",
              type: "number",
              label: "Id arco",
              width: 6,
              disabled: true
            }
          ],
          [
            {
              key: "prev_cod_via",
              type: "number",
              label: "Via",
              width: 3,
              disabled: true
            },
            {
              key: "prev_nome_via",
              type: "text",
              label: "",
              width: 9,
              disabled: true
            }
          ],
          [
            {
              key: "data_fine",
              type: "timestamp",
              subType: "date",
              label: "Data di fine validità",
              width: 6,
              disabled: true
            },
            {
              key: "id_mot_cessazione",
              type: "select",
              label: "Motivo cessazione",
              width: 6,
              required: true,
              options: []
            }
          ]
        ]
      },
      {
        id:1, label:"Numero Civico seguente",
        rows:[
          [
            {
              key: "next_numero",
              type: "number",
              label: "N. Civico",
              width: 3,
              required: true
            },
            {
              key: "next_esponente",
              type: "text",
              label: "Esponente",
              width: 3,
              required: false,
              uppercase: true,
              onlyLetter: true,
            },
            {
              key: "next_cod_arco",
              type: "number",
              label: "Id arco",
              width: 4,
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
              key: "proiezione_x",
              type: "number",
              label: "X",
              width: 6,
              hidden: true
            },
            {
              key: "proiezione_y",
              type: "number",
              label: "Y",
              width: 6,
              hidden: true
            }
          ],
          [
            {
              key: "next_cod_via",
              type: "number",
              label: "Via",
              width: 3,
              disabled: true
            },
            {
              key: "next_nome_via",
              type: "text",
              label: "",
              width: 9,
              disabled:true
            }
          ],
          [
            {
              key: "data_ini",
              type: "timestamp",
              subType: "date",
              label: "Data di inizio validità",
              width: 6,
              required: true
            },
            {
              key: "id_mot_inserimento",
              type: "select",
              label: "Motivo inserimento",
              width: 6,
              required: true,
              options: []
            }
          ]
        ]
      }
    ]
  };

  constructor(private modelSvc:ModelService,
              private wgSvc:WebgisService,
              private httpWriter:HttpWriterService)
  {}

  ngOnInit()
  {
    /* Load dictionaries */
    this.modelSvc.master("/civico/dictionaries",{}).subscribe(res =>
    {
      if (res)
      {
        this.formCfg.fg[0].rows[2][1]["options"] = res["motCessazione"];
        this.formCfg.fg[1].rows[3][1]["options"] = res["motInserimento"];
      }
    });
  }


  showRenumberCivicoForm(entity:object)
  {
    this.visible = true;

    this.renumberObj = entity['obj'];

    // set data_fine to now and data_ini to now + 1 day (tomorrow)
    let today = new Date();
    let tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    this.renumberObj["data_fine"] = today;
    this.renumberObj["data_ini"] = tomorrow;
  }


  close()
  {
    this.visible = false

    this.renumberObj = null;

    this.error = {};
    this.alert = {};

    this.message  = null;
    //this.msgStyle = null;

    this.renumberOk = false;
  }

  /*
   * Form event handler
   */

  onFormChange(obj)
  {
    switch (obj.key)
    {
      case "btArcoGet":
        this.wgSvc.sendMessage("getFeatureId",{
          layerKey: "arco",
          filterCond: null,
          callback: res => {
            /* Get new projection info */
            let url = "/civico/retrieveProjOnArco", body = {
              x: this.renumberObj["x"],
              y: this.renumberObj["y"],
              cod_arco: res.id
            };

            this.modelSvc.detail(url,body).subscribe(proj =>
            {
              if (!proj)
              {
                console.info("ERROR on "+url);
                return;
              }

              // update form fields
              this.formCmp.setValueForKey("next_cod_arco",res.id);
              this.formCmp.setValueForKey("next_cod_via",proj['cod_via']);
              this.formCmp.setValueForKey("next_nome_via",proj['nome_via']);
              this.formCmp.setValueForKey("proiezione_x",proj['proiezione_x']);
              this.formCmp.setValueForKey("proiezione_y",proj['proiezione_y']);
            });
          }
        });
        break;
      case "data_ini":
        // on data_ini change, set data_fine = date_ini - 1 day
        this.formCmp.setValueForKey("data_fine", new Date(obj.val - 86400*1000));
        break;
    }
  }

  /*
   * form buttons management
   */

  reset()
  {
    // send message to reset edit to consistent status
    this.wgSvc.sendMessage('endEdit', {status: 'C'});

    this.close();
  }

  save()
  {
    if (this.formCmp.isValid())
    {
      if (this.formCmp.isChanged())
      {
        {
          this.alert['msg'] = 
            "Si è sicuri di voler procedere con il salvataggio dell'operazione di rinumerazione?";
          this.alert['style'] = "info";
          this.alert['bt0'] = "Sì";
          this.alert['bt1'] = "No";
        }
      }
    }
  }

  /*
   * alert management
   */
  onAlertDone(ret)
  {
    if (ret == 0)
    {
      let url = '/civico/renumber/'+this.renumberObj['id'];

      let obj = this.formCmp.getChangedObj();

      // if arco changes, but belongs to the same via, cod_via doesn't change
      // so we have to force it into object
      if (obj["next_cod_arco"] && obj["next_cod_via"] == undefined)
      {
        obj["next_cod_via"] = this.formCmp.getValueForKey("next_cod_via");
      }

      // convert esponente in upper case
      if (obj['next_esponente'])
        obj['next_esponente'] = obj['next_esponente'].toUpperCase();

      this.httpWriter.put(url, obj).subscribe(res =>
        {
          // show result message
          if (!res)
          {
            this.message  = "Si è verificato un errore durante la procedura di rinumerazione.";
            //this.msgStyle = {'color':'red'};
            this.renumberOk = false;
          }
          else
          {
            if (res['error'])
            {
              if (res['error'] == "CIVICO_IS_EXTENSION")
              {
                this.message = "Non è possibile rinumerare il numero civico selezionato poichè si tratta di un'estensione.";
              }
              else if (res['error'] == "DUPLICATE_CIVICO")
              {
                //this.message = "Esiste già un numero civico avente stessa via, numero, esponente e estensione; verificare i dati immessi";

                this.alert['msg'] = 
                  "Esiste già un numero civico avente stessa via, numero, esponente e estensione; verificare i dati immessi";
                this.alert['style'] = "danger";
                this.alert['bt1'] = "Ok";
              }
              else 
                this.message = "Si è verificato un errore durante la procedura di rinumerazione.";

              //this.msgStyle = {'color':'red'};
              this.renumberOk = false;
            }
            else
            {
              this.message  = "La rinumerazione è stata eseguita con successo.";
              //this.msgStyle = {'color':'black'};

              this.renumberOk = true;
            }
          }

          //setTimeout(() => {this.message = null;this.msgStyle = null},2000);

          // send message to reset edit to consistent status
          this.wgSvc.sendMessage('endEdit', {
            //status: this.alert['style'] == "info" ? 'D' : 'E',
            status: this.renumberOk ? 'D' : 'E',
            entity: new Civico({}, 2)
          });

          // disable save button
        }
      );
    }

    

    // Close alert
    this.alert = {};
  }
}
