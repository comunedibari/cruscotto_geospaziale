import {Component,
        OnInit,
        Output,
        EventEmitter}       from '@angular/core';

import {WebgisService}      from '../../webgis/webgis.service';

import {Arco}               from '../../grafo/entity/arco';
import {Nodo}               from '../../grafo/entity/nodo';

import {HttpWriterService}  from '../../core/http-writer.service';

@Component({
  selector: 'grafo-break-arco',
  templateUrl: './break-arco.component.html',
  styleUrls: ['./break-arco.component.css']
})

export class BreakArcoComponent implements OnInit
{
  @Output() showDetailEvt = new EventEmitter<any>();

  bodyStyle = {"overflow-y":"auto"};

  data:Object  = {};
  error:Object = {};

  // action could assume value break and result
  action:string = null;

  visible   = false;
  collapsed = false;

  breakMsg:string = null;
  confirmMsg:string = null;

  oldCodArco:number;
  idNodo:number;
  codArco1:number;
  codArco2:number;

  oldArcoMsg:string = null;
  newArco1Msg:string = null;
  newArco2Msg:string = null;
  newNodeMsg:string = null;

  constructor(private wgSvc:WebgisService,
              private httpWriter: HttpWriterService)
  {}

  ngOnInit()
  {}

  showData(data:Object)
  {
    this.action = 'break';
    this.data = data;
    this.oldCodArco = data['codArco'];
    this.visible = true;

    this.breakMsg = "L'arco stradale con identificativo " + data['codArco'] + 
      " sarà spezzato nel punto di coordinate (" + 
      data['x'].toFixed(2) + ", " + data['y'].toFixed(2) + ")";

    this.confirmMsg = "Si vuole procedere?";
  }

  /*
   * Action related to reset button
   */
  reset()
  {
    this.close();
  }

  /*
   * Action related to proceed button
   */
  breakArco()
  {
    // invoke url to break arco
    this.httpWriter.post("/arco/break", this.data).subscribe(
      res => {
        if (res['error'])
        {
          this.error = res['error'];

          /*this.openModalMsg({
            title: "Errore",
            msg: "Si è verificato un errore durante l'operazione di spezzamento dell'arco",
            size: "sm",
            style: "danger",
            buttons:[{
              id: 1,
              label: "Ok",
              callback: () => {
                this.wgSvc.sendMessage('resetEdit', {});
                this.wgSvc.sendMessage('clearEdit', {});
              }
            }]
          });*/

          return;
        }

        // emit event to show result data of break procedure on sidebar
        /*this.breakArcoEvt.emit({
          old_arco: data.codArco,
          nodo: res['result']['nodo'],
          arco1:res['result']['arco1'],
          arco2:res['result']['arco2']
        });*/

        this.action = 'result';

        this.idNodo   = res['result']['nodo'];
        this.codArco1 = res['result']['arco1'];
        this.codArco2 = res['result']['arco2'];

        this.oldArcoMsg = "L'arco stradale con identificativo " + this.oldCodArco +
          " è stato cessato.";

        this.newNodeMsg = "E' stato creato il nodo con identificativo " + this.idNodo;

        this.newArco1Msg = "E' stato creato l'arco stradale avente identificativo " +
          this.codArco1;

        this.newArco2Msg = "E' stato creato l'arco stradale avente identificativo " +
          this.codArco2;

        // end edit message
        this.wgSvc.sendMessage('endEdit', {
          status: 'D',
          entity: new Nodo({}, 2)
        });
      },
      err => {
        console.error(err);
        this.error = err;

        /*this.openModalMsg({
          title: "Errore",
          msg: "Si è verificato un errore durante l'operazione di spezzamento dell'arco",
          size: "sm",
          style: "danger",
          buttons:[{
            id: 1,
            label: "Ok",
            callback: () => {
              this.wgSvc.sendMessage('resetEdit', {});
              this.wgSvc.sendMessage('clearEdit', {});
            }
          }]
        });*/
      }
    );
  }

  viewNodeDetail(id:number)
  {
    var node = new Nodo({},2);
    node.setId(id);

    this.showDetailEvt.emit(node);
  }

  viewArcoDetail(id:number)
  {
    var arco = new Arco({},2);
    arco.setId(id);

    this.showDetailEvt.emit(arco);
  }

  /*
   * alert management
   */
  alertDone(ret)
  {
    // send message to reset edit to consistent status
    this.wgSvc.sendMessage('endEdit', {
      status: 'E',
      entity: new Nodo({}, 2)
    });

    this.close();
  }

  close()
  {
    // send message to reset edit to consistent status
    this.wgSvc.sendMessage('endEdit', {status: 'C'});

    this.visible = false;

    this.data  = {};
    this.error = {};

    this.action = null;

    this.breakMsg   = null;
    this.confirmMsg = null;

    this.oldArcoMsg = null;
    this.newArco1Msg = null;
    this.newArco2Msg = null;
    this.newNodeMsg = null;

    this.oldCodArco = null;
    this.codArco1   = null;
    this.codArco2   = null;
    this.idNodo     = null;
  }
}
