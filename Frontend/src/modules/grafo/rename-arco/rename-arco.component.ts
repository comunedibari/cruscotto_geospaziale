
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

import {Arco}                 from '../../grafo/entity/arco';

@Component({
  selector: 'grafo-rename-arco',
  templateUrl: './rename-arco.component.html',
  styleUrls: ['./rename-arco.component.css']
})

export class RenameArcoComponent implements OnInit
{
  @ViewChild(FormComponent) formCmp:FormComponent;

  renameObj:Object = null;

  visible   = false;
  collapsed = false;

  //msgStyle = null;

  error:Object = {};

  renameOk:boolean = false;

  // Attributes
  message:string = null;
  alert: Object = {};

  // Form config
  formCfg =
  {
    id:"renameArcoForm", fg:
    [
      {
        id:0, label:"Denominazione attuale",
        rows:
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
          ]
        ]
      },
      {
        id:1, label:"Nuova denominazione",
        rows:
        [
          [
            {
              key: "cod_via_new",
              type: "searchSelect",
              label: "Nome via",
              width: 12,
              options:[],
              required: true,
              optionValue: "cod_via",
              optionLabel: "denominazione",
              subOptionLabel: ['localita_val', 'municipio_val'],
              searchUrl: "/via/masterActive?ord=denominazione|ASC",
              searchKey: ["denominazione"]
            }
          ],
          [
            {
              key: "id_mot_ridenominazione",
              type: "select",
              label: "Motivo ridenominazione",
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
    this.modelSvc.master("/arcoDizionari/master",{}).subscribe(res =>
    {
      if (res)
      {
        this.formCfg.fg[1].rows[1][0]["options"] = res["arco_mot_ridenominazione"];
      }
    });
  }

  showRenameArcoForm(entity:object)
  {
    this.visible = true;

    this.renameObj = entity['obj'];
  }

  close()
  {
    this.visible = false

    this.renameObj = null;

    this.error = {};
    this.alert = {};

    this.message  = null;
    //this.msgStyle = null;

    this.renameOk = false;
  }

  /*
   * Form event handler
   */
  onFormChange(obj)
  {

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
            "Si è sicuri di voler procedere con il salvataggio dell'operazione di ridenominazione?";
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
      let url = '/arco/rename/'+this.renameObj['cod_arco'];

      let obj = this.formCmp.getChangedObj();

      this.httpWriter.put(url, obj).subscribe(res =>
        {
          // show result message
          if (!res)
          {
            this.message  = "Si è verificato un errore durante la procedura di ridenominazione.";
            //this.msgStyle = {'color':'red'};
            this.renameOk = false;
          }
          else
          {
            if (res['error'])
            {
              if (res['error'] == "DUPLICATE_CIVICO")
                this.message = "Non è possibile ridenominare l'arco selezionato poichè contiene numeri civici già presenti sulla via selezionata";
              else
                this.message = "Si è verificato un errore durante la procedura di ridenominazione.";

              //this.msgStyle = {'color':'red'};
              this.renameOk = false;
            }
            else
            {
              this.message  = "La ridenominazione è stata eseguita con successo.";
              //this.msgStyle = {'color':'black'};
              this.renameOk = true;
            }
          }

          //setTimeout(() => {this.message = null;this.msgStyle = null},2000);

          // send message to reset edit to consistent status
          this.wgSvc.sendMessage('endEdit', {
            //status: this.alert['style'] == "info" ? 'D' : 'E',
            status: this.renameOk ? 'D' : 'E',
            entity: new Arco({}, 2),
            additionalLayerKeyToRefresh: ["civico"]
          });
        }
      );
    }

    // Close alert
    this.alert = {};
  }
}
