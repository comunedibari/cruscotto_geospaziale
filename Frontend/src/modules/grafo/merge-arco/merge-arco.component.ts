import {Component,
        OnInit,
        Output,
        EventEmitter}       from '@angular/core';

import {WebgisService}      from '../../webgis/webgis.service';

import {Arco}               from '../../grafo/entity/arco';

import {HttpWriterService}  from '../../core/http-writer.service';

@Component({
  selector: 'grafo-merge-arco',
  templateUrl: './merge-arco.component.html',
  styleUrls: ['./merge-arco.component.css']
})

export class MergeArcoComponent implements OnInit
{
  @Output() showDetailEvt = new EventEmitter<any>();

  bodyStyle = {"overflow-y":"auto"};

  data:Object  = {};
  error:Object = {};

  // action could assume value merge and result
  action:string = null;

  visible   = false;
  collapsed = false;

  mergeMsg:string = null;
  confirmMsg:string = null;

  newCodArco:number;
  idNodo:number;
  codArco1:number;
  codArco2:number;

  removedNodoMsg:string = null;
  oldArco1Msg:string = null;
  oldArco2Msg:string = null;
  newArcoMsg:string = null;

  constructor(private wgSvc:WebgisService,
              private httpWriter: HttpWriterService)
  {}

  ngOnInit()
  {}

  showData(data:Object)
  {
    this.action = 'merge';
    this.data = data;
    this.visible = true;

    this.idNodo   = data['idNodo'];
    this.codArco1 = data['codArco1'];
    this.codArco2 = data['codArco2'];

    this.mergeMsg = "Gli archi stradali con identificativo " +
      this.codArco1 + " e " + this.codArco2 + 
      " saranno uniti rimuovendo il nodo comune con identificativo " + this.idNodo;

    this.confirmMsg = "Si vuol procedere?";
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
  mergeArco()
  {
    // invoke url to merge arco
    this.httpWriter.post("/arco/merge", this.data).subscribe(
      res => {
        if (res['error'])
        {
          this.error = res['error'];
          return;
        }

        this.action = 'result';

        this.newCodArco = res['result']['cod_arco'];

        this.removedNodoMsg = "Il nodo con identificativo " + this.idNodo +
          " è stato rimosso.";

        this.oldArco1Msg = "l'arco con identificativo " + this.codArco1 + " è stato cessato.";

        this.oldArco2Msg = "l'arco con identificativo " + this.codArco2 + " è stato cessato.";

        this.newArcoMsg = "E' stato creato l'arco stradale avente identificativo " +
          this.newCodArco;

        // end edit message
        this.wgSvc.sendMessage('endEdit', {
          status: 'D',
          entity: new Arco({}, 2)
        });
      },
      err => {
        console.error(err);
        this.error = err;
      }
    );
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
      entity: new Arco({}, 2)
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

    this.mergeMsg   = null;
    this.confirmMsg = null;

    this.removedNodoMsg = null;
    this.oldArco1Msg = null;
    this.oldArco1Msg = null;
    this.newArcoMsg  = null;

    this.newCodArco = null;
    this.codArco1   = null;
    this.codArco2   = null;
    this.idNodo     = null;
  }
}
