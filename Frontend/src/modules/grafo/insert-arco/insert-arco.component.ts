
import {Component,
        OnInit,
        Output}              from '@angular/core';

import {EventEmitter}        from '@angular/core';

import {ModelService}        from '../../core/model.service';

import {WebgisService}       from '../../webgis/webgis.service';

import {Arco}                from '../../grafo/entity/arco';

@Component({
  selector: 'grafo-insert-arco',
  templateUrl: './insert-arco.component.html',
  styleUrls: ['./insert-arco.component.css']
})

export class InsertArcoComponent implements OnInit
{
  @Output() insertArcoEvt = new EventEmitter<any>();

  bodyStyle = {"overflow-y":"auto"};

  visible   = false;
  collapsed = false;

  entity:any = null;
  error:Object = {};

  isValidMsg:string    = null;
  headerMsg:string     = null;
  verticesMsg:string[] = null;
  chunksMsg: string[]  = null;

  objToInsert: {
    nodeFrom:{nodo:string, coords:Array<number>, arco:string},
    nodeTo:{nodo:string, coords:Array<number>, arco:string},
    newArco:object
  } = null;

  constructor(private wgSvc:WebgisService,
              private modelSvc:ModelService)
  {}

  ngOnInit() {}

  showInsertArcoChecks(params:object)
  {
    this.visible = true;

    this.objToInsert = {
      nodeFrom:  {nodo:null, coords:[], arco:null},
      nodeTo:    {nodo:null, coords:[], arco:null},
      newArco:   {}
    };

    this.analyzeTopologyCheck(params);
  }

  close()
  {
    this.visible = false;

    this.entity = null;
    this.error  = {};

    this.isValidMsg  = null;
    this.headerMsg   = null;
    this.verticesMsg = null;
    this.chunksMsg   = null;
    this.objToInsert = null;
  }

  /*
   *
   */
  reset()
  {
    // send message to reset edit to consistent status
    this.wgSvc.sendMessage('endEdit', {status: 'C'});

    this.close();
  }

  /*
   *
   */
  showInsertForm()
  {
    // create new arco entity and set given attributes
    let entity = new Arco({}, 1); // 1 <=> insert

    if (this.objToInsert['nodeFrom']['nodo'])
      entity.nodo_da = +this.objToInsert['nodeFrom']['nodo'];

    if (this.objToInsert['nodeTo']['nodo'])
      entity.nodo_a = +this.objToInsert['nodeTo']['nodo'];

    entity.lunghezza = this.objToInsert['newArco']['length'];

    // add to arco entity support variables to manage the operations related
    // to the insertion of the new arc (new nodes insert - exsisting arco break)
    entity.nodeFrom  = this.objToInsert['nodeFrom'];
    entity.nodeTo    = this.objToInsert['nodeTo'];
    entity.points    = this.objToInsert['newArco']['points'];

    // show arco form
    this.insertArcoEvt.emit(entity);
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

  /*
   * Format messages that will be shown on left sidebar
   * also populate objToInsert object
   */
  private analyzeTopologyCheck(params:object)
  {
    let msg = "";
    let nodeCount = 0;

    let vertices = params['topologyCheck']['vertices'];
    let chunks   = params['topologyCheck']['chunks'];

    this.headerMsg = "L'arco disegnato comprende " + vertices.length + 
      " vertici e " + chunks.length;
    this.headerMsg += (chunks.length > 1) ? " segmenti." : " segmento."

    this.verticesMsg = [];
    this.chunksMsg   = [];

    for (let idx=0; idx<vertices.length; idx++)
    {
      let vertex = vertices[idx];
      let msg = "";

      // vertex overlap on existing node or arco
      if (vertex['overlap'])
      {
        // overlap on existing nodo
        if (vertex['nodo'])
        {
          msg += "Il vertice " + (idx+1) + " coincide con il nodo " + vertex['nodo'];

          vertex['isNode'] = true;
          nodeCount++;

          if (!this.objToInsert.nodeFrom.nodo &&
              this.objToInsert.nodeFrom.coords.length == 0)
            this.objToInsert.nodeFrom.nodo = vertex['nodo'];
          else
            this.objToInsert.nodeTo.nodo = vertex['nodo'];
        }

        // overlap on existing arco
        if (vertex['arco'])
        {
          msg += vertex['nodo'] ? " e" : "Il vertice " + (idx+1);

          msg += " giace sull'arco " + vertex['arco'];

          // a new vertex cannot simultaneously coincide with an existing node
          // and lie on an existing arc; there is a topology error on existing network
          if (vertex['nodo'])
          {
            msg += "; questa situazione è anomala - procedere con la verifica dei dati esistenti."
            nodeCount++;
          }
          else
          {
            msg += "; il vertice sarà inserito come nuovo nodo e l'arco suddetto sarà spezzato";

            vertex['isNode'] = true;
            nodeCount++;

            if (!this.objToInsert.nodeFrom.nodo &&
                this.objToInsert.nodeFrom.coords.length == 0)
            {
              this.objToInsert.nodeFrom.coords = vertex['coords'];
              this.objToInsert.nodeFrom.arco = vertex['arco'];
            }
            else
            {
              this.objToInsert.nodeTo.coords = vertex['coords'];
              this.objToInsert.nodeTo.arco = vertex['arco'];
            }
          }
        }
      }
      else
      {
        // in this case new node doesn't overlap with existing node or arco
        // we have to insert new node with given coords
        if (idx == 0 || idx == vertices.length-1)
        {
          msg = "Il vertice " + (idx+1) + " sarà inserito come nuovo nodo";
          vertex['isNode'] = true;
          nodeCount++;

          if (idx == 0)
            this.objToInsert.nodeFrom.coords = vertex['coords'];
          else
            this.objToInsert.nodeTo.coords = vertex['coords'];
        }
      }

      if (msg)
        this.verticesMsg.push(msg);
    }

    for (let idx=0; idx<chunks.length; idx++)
    {
      let chunk = chunks[idx];
      let msg = "Il segmento " + (idx+1);

      if (chunk['cross'])
      {
        let msg = "Il segmento " + (idx+1) + " attraversa ";
        msg += chunk['archi'].length > 1 ? "gli archi " : "l'arco ";
        msg += chunk['archi'].toString();

        this.chunksMsg.push(msg);
      }
    }

    // if we need to create (or sketched arc go through)
    // more than 2 nodes, the arc sketched is not valid
    if (nodeCount > 2)
    {
      this.entity = null;
      this.objToInsert = null;
      this.isValidMsg = "L'arco stradale disegnato non è valido!";
    }
    else
    {
      this.entity = params['entity'];
      this.objToInsert.newArco = params['entity']['mapChange'];

      this.isValidMsg = "L'arco stradale disegnato è valido.";
    }
  }
}
