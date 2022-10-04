
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

import {Nodo}                 from '../../grafo/entity/nodo'; 
import {Arco}                 from '../../grafo/entity/arco'; 

@Component({
  selector: 'grafo-move-nodo',
  templateUrl: './move-nodo.component.html',
  styleUrls: ['./move-nodo.component.css']
})

export class MoveNodoComponent implements OnInit
{
  @Input() moveObj:Object;

  @ViewChild(FormComponent) formComp:FormComponent;

  // Attributes
  message:string = null;
  alert:Object = {};
  error:boolean = false;

  // Form config
  formCfg =
  {
    id:"moveNodoForm", fg:
    [
    ]
  };

  constructor(private modalInst:NgbActiveModal,
              private modelSvc:ModelService,
              private httpWriter:HttpWriterService,
              private wgSvc:WebgisService)
  {}

  ngOnInit()
  {
    // if selected nodo is a terminal nodo (only one arco flow into it) and
    // is moved on another nodo, the selected nodo is removed
    // and replaced with the second one
    if (this.moveObj['overlapNodes'] && 
        this.moveObj['overlapNodes'].length > 0 &&
        this.moveObj['archi'])
    {
      if (this.moveObj['archi'].length > 1)
      {
        // this is an error (not terminal nodo moved on another nodo)
        this.message  = "Attenzione: " +
          "il nodo selezionato non è un nodo terminale e non puo' coincidere " + 
          "con il nodo " + this.moveObj['overlapNodes'][0]['id'];

        this.error = true;
      }
      else
      {
        this.message = "Il nodo selezionato è un nodo terminale ed è stato fatto " + 
          "coincidere con il nodo " + this.moveObj['overlapNodes'][0]['id']+".\n";
        this.message += "Si vuole rimuovere il nodo selezionato e sostituirlo " +
          "con quest'ultimo?\n";

        this.moveObj['mode'] = "OVERLAP_AND_RESHAPE";
      }
    }
    else
    {
      this.message = "Vuoi salvare le modifiche apportate?";

      this.moveObj['mode'] = "ONLY_RESHAPE";
    }
  }

  /*
   * form buttons management
   */

  reset()
  {
    // send message to reset edit to consistent status
    this.wgSvc.sendMessage('endEdit', {
      status: 'C',
      entity: new Nodo({}, 2)
    });

    // close modal
    this.modalInst.close();

    this.message = null;
    this.error = false;
  }

  save()
  {
    if (this.formComp.isValid())
    {
      //if (this.formComp.isChanged())
      //{
        let url = '/nodo/move/'+this.moveObj['nodo']['id'];

        this.httpWriter.put(url, this.moveObj).subscribe(res =>
          {
            if (!res)
            {
              this.alert['msg']   = "Si è verificato un errore durante lo spostamento del nodo";
              this.alert['style'] = "danger";
            }
            else
            {
              if (res['result'])
              {
                this.alert['msg']   = "Il nodo è stato spostato con successo";
                this.alert['style'] = "info";
              }
              else
              {
                if (res['error'])
                  this.alert['msg'] = "Si è verificato un errore durante lo spostamento del nodo";

                this.alert['style'] = "danger";
              }
              
            }

            this.alert['bt0'] = "Ok";
          }
        );
      //}
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
      entity: new Nodo({}, 2)
    });

    // Close alert
    this.alert = {};

    // Close modal
    this.modalInst.close();
  }
}
