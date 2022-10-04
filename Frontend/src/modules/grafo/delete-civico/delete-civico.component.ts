
import {Component,
        OnInit,
        AfterViewInit,
        Input,
        ViewChild}          from '@angular/core';

import {NgbActiveModal}     from '@ng-bootstrap/ng-bootstrap';

import {FormComponent}      from '../../core/form/form.component';

import {ModelService}       from '../../core/model.service';

import {HttpWriterService}  from '../../core/http-writer.service';

import {WebgisService}      from '../../webgis/webgis.service';

import {Civico}             from '../../grafo/entity/civico'; 

@Component({
  selector: 'grafo-delete-civico',
  templateUrl: './delete-civico.component.html',
  styleUrls: ['./delete-civico.component.css']
})

export class DeleteCivicoComponent implements OnInit {

  @Input() deleteObj:Object;

  @ViewChild(FormComponent) formComp:FormComponent;

  // Attributes
  message:string = null;
  alert: Object = {};

  // Form config
  formCfg =
  {
    id:"delCivicoForm", fg:
    [
      {
        id:0,rows:
        [
          [
            {
              key: "numero",
              type: "number",
              label: "N. Civico",
              width: 4,
              disabled: true
            },
            {
              key: "esponente",
              type: "text",
              label: "Esponente",
              width: 4,
              disabled: true
            },
            {
              key: "estensione",
              type: "text",
              label: "Estensione",
              width: 4,
              disabled: true
            }
          ],
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
          ],
          [
            {
              key: "data_fine",
              type: "timestamp",
              subType: "date",
              label: "Data di fine validità",
              width: 6,
              required: true
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
      }
    ]
  };

  constructor(private modalInst:NgbActiveModal,
              private modelSvc:ModelService,
              private httpWriter:HttpWriterService,
              private wgSvc:WebgisService)
  {}

  ngOnInit()
  {
    // Load dictionaries
    this.modelSvc.master("/civico/dictionaries",{}).subscribe(res =>
    {
      if (res)
      {
        this.formCfg.fg[0].rows[2][1]["options"] = res["motCessazione"];
      }
    });
  }

  ngAfterViewInit()
  {
    setTimeout(() => {
      // set data_fine to now
      this.formComp.setValueForKey("data_fine", new Date());
    }, 100);
  }

  /*
   * form buttons management
   */

  reset()
  {
    // send message to reset edit to consistent status
    this.wgSvc.sendMessage('endEdit', {
      status: 'C',
      entity: new Civico({}, 2)
    });

    // close modal
    this.modalInst.close();
  }

  save()
  {
    if (this.formComp.isValid())
    {
      if (this.formComp.isChanged())
      {
        let url = '/civico/delete/'+this.deleteObj['id'];

        this.httpWriter.put(url, this.formComp.getChangedObj()).subscribe(res =>
          {
            if (!res)
            {
              this.alert['msg']   = "Si è verificato un errore durante la rimozione del numero civico";
              this.alert['style'] = "danger";
            }
            else
            {
              if (res['error'])
              {
                if (res['error'] == "CIVICO_WITH_VALID_EXTENSIONS")
                  this.alert['msg'] = "Non è possibile rimuovere il numero civico selezionato poichè ci sono delle estensioni associate ad esso";
                else 
                  this.alert['msg'] = "Si è verificato un errore durante la rimozione del numero civico";

                this.alert['style'] = "danger";
              }
              else
              {
                this.alert['msg']   = "Il numero civico è stato rimosso con successo";
                this.alert['style'] = "info";
              }
            }

            this.alert['bt0'] = "Ok";
          }
        );

      }
    }
  }

  /*
   * alert management
   */
  onAlertDone(ret)
  {
    // send message to reset edit to consistent status
    this.wgSvc.sendMessage('endEdit', {
      status: this.alert['style'] == "info" ? 'D' : 'E',
      entity: new Civico({}, 2)
    });

    // Close alert
    this.alert = {};

    // Close modal
    this.modalInst.close();
  }
}
