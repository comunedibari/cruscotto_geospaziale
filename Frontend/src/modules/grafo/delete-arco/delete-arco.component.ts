
import {Component,
        OnInit,
        AfterViewInit,
        Input,
        ViewChild}            from '@angular/core';

import {NgbActiveModal}       from '@ng-bootstrap/ng-bootstrap';

import {FormComponent}        from '../../core/form/form.component';

import {HttpWriterService}    from '../../core/http-writer.service';

import {WebgisService}        from '../../webgis/webgis.service';

import {Arco}                 from '../../grafo/entity/arco'; 

@Component({
  selector: 'grafo-delete-arco',
  templateUrl: './delete-arco.component.html',
  styleUrls: ['./delete-arco.component.css']
})

export class DeleteArcoComponent implements OnInit {

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
              key: "cod_arco",
              type: "number",
              label: "Codice",
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
              width: 4,
              required: true
            }
          ]
        ]
      }
    ]
  };

  constructor(private modalInst:NgbActiveModal,
              private httpWriter:HttpWriterService,
              private wgSvc:WebgisService)
  {}

  ngOnInit() {}

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
      entity: new Arco({}, 2)
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
        let url = '/arco/remove/'+this.deleteObj['cod_arco'];

        this.httpWriter.put(url, this.formComp.getChangedObj()).subscribe(res =>
          {
            if (!res)
            {
              this.alert['msg']   = "Si è verificato un errore durante la rimozione dell'arco";
              this.alert['style'] = "danger";
            }
            else
            {
              if (res['result'])
              {
                this.alert['msg']   = "L'arco è stato rimosso con successo";
                this.alert['style'] = "info";
              }
              else
              {
                // ARCO_WITH_VALID_CIVICI is defined in arco backend entity
                if (res['error'] == "ARCO_WITH_VALID_CIVICI")
                  this.alert['msg'] = "Non è possibile rimuovere l'arco selezionato poichè ci sono dei numeri civici associati ad esso";
                else if (res['error'])
                  this.alert['msg'] = "Si è verificato un errore durante la rimozione dell'arco";

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
      entity: new Arco({}, 2)
    });

    // Close alert
    this.alert = {};

    // Close modal
    this.modalInst.close();
  }
}
