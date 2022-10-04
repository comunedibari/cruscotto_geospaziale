
import {Component,
        OnInit,
        AfterViewInit,
        Input,
        ViewChild}            from '@angular/core';

import {NgbActiveModal}       from '@ng-bootstrap/ng-bootstrap';

import {FormComponent}        from '../../core/form/form.component';

import {ModelService}         from '../../core/model.service';

import {HttpWriterService}    from '../../core/http-writer.service';

import {WebgisService}        from '../../webgis/webgis.service';

import {Edificio}             from '../../grafo/entity/edificio'; 

@Component({
  selector: 'grafo-delete-edificio',
  templateUrl: './delete-edificio.component.html',
  styleUrls: ['./delete-edificio.component.css']
})

export class DeleteEdificioComponent implements OnInit {

  @Input() deleteObj:Object;

  @ViewChild(FormComponent) formComp:FormComponent;

  // Attributes
  message:string = null;
  alert: Object = {};

  // Form config
  formCfg =
  {
    id:"delEdificioForm", fg:
    [
      {
        id:0,rows:
        [
          [
            {
              key: "id",
              type: "number",
              label: "Codice",
              width: 12,
              disabled: true
            }
          ],
          [
            {
              key: "data_fine",
              type: "timestamp",
              subType: "date",
              label: "Data di fine validità",
              width: 12,
              required: true
            }
          ],
          [
            {
              key: "id_mot_cessazione",
              type: "select",
              label: "Motivo cessazione",
              width: 12,
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
    this.modelSvc.master("/edificio/dictionaries",{}).subscribe(res =>
    {
      if (res)
      {
        this.formCfg.fg[0].rows[2][0]["options"] = res["motCessazione"];
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
      entity: new Edificio({}, 2)
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
        let url = '/edificio/remove/'+this.deleteObj['id'];

        this.httpWriter.put(url, this.formComp.getChangedObj()).subscribe(res =>
          {
            if (!res)
            {
              this.alert['msg']   = "Si è verificato un errore durante la rimozione dell'edificio";
              this.alert['style'] = "danger";
            }
            else
            {
              if (res['result'])
              {
                this.alert['msg']   = "L'edificio è stato rimosso con successo";
                this.alert['style'] = "info";
              }
              else
              {
                // EDIFICIO_WITH_VALID_CIVICI is defined in edificio backend entity
                if (res['error'] == "EDIFICIO_WITH_VALID_CIVICI")
                  this.alert['msg'] = "Non è possibile rimuovere l'edificio selezionato poichè ci sono dei numeri civici associati ad esso";
                else if (res['error'])
                  this.alert['msg'] = "Si è verificato un errore durante la rimozione dell'edificio";

                this.alert['style'] = "danger";
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
      entity: new Edificio({}, 2)
    });

    // Close alert
    this.alert = {};

    // Close modal
    this.modalInst.close();
  }
}
