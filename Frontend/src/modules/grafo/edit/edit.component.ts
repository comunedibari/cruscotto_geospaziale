import {Component,
        OnInit,
        OnDestroy,
        Output,
        ViewChild,
        TemplateRef,
        EventEmitter}               from '@angular/core';

import {Subscription,
        Observable }                from 'rxjs';

import {NgbModal}                   from '@ng-bootstrap/ng-bootstrap';

import {Via}                        from '../entity/via';
import {Arco}                       from '../entity/arco';
import {Nodo}                       from '../entity/nodo';
import {Civico}                     from '../entity/civico';
import {Edificio}                   from '../entity/edificio';

import {DeleteCivicoComponent}      from '../delete-civico/delete-civico.component';
import {RenumberCivicoComponent}    from '../renumber-civico/renumber-civico.component';

import {DeleteArcoComponent}        from '../delete-arco/delete-arco.component';
import {DeleteEdificioComponent}    from '../delete-edificio/delete-edificio.component';

import {MoveNodoComponent}          from '../move-nodo/move-nodo.component';

import {HttpReaderService}          from '../../core/http-reader.service';
import {HttpWriterService}          from '../../core/http-writer.service';
import {AuthService}                from '../../core/auth.service';
import {ModalMessageComponent}      from '../../core/modal-message/modal-message.component';

import {WebgisService}              from '../../webgis/webgis.service';

import {WGMapLayer}                 from '../../webgis/entity/wgmapLayer';

import {AddMode,
        DeleteMode,
        ModifyMode,
        AddSource,
        DrawAddOn,
        EditStatus,
        GeometryType,
        getCoordNumDec,
        getCodeFromEpsgString}      from '../../webgis/webgis.util';

import intersect                    from '@turf/intersect';
import booleanEqual                 from '@turf/boolean-equal';
import booleanCrosses               from '@turf/boolean-crosses';
import lineIntersect                from '@turf/line-intersect';
import {point,lineString}           from '@turf/helpers';
import booleanPointOnLine           from '@turf/boolean-point-on-line';
import booleanDisjoint              from '@turf/boolean-disjoint';
import lineSegment                  from '@turf/line-segment';

@Component({
  selector: 'grafo-edit',
  templateUrl: './edit.component.html',
  styleUrls: ['./edit.component.css']
})

export class EditComponent implements OnInit {

  @ViewChild('content') contentModal: TemplateRef<any>;

  @Output() showEntityEvt    = new EventEmitter<any>();
  @Output() renCivicoEvt     = new EventEmitter<any>();
  @Output() insertArcoEvt    = new EventEmitter<any>();
  @Output() breakArcoEvt     = new EventEmitter<any>();
  @Output() mergeArcoEvt     = new EventEmitter<any>();
  @Output() toggleSidebarEvt = new EventEmitter<any>();
  @Output() renArcoEvt       = new EventEmitter<any>();

  // edited layer properties useful for elaboration 
  editLayerKey:string  = null;
  editLayerProj:string = null; // in the form 'EPSG:xxx'
  editLayerCoordsNumDec:number = null;

  editEntity = null;
  selectedAction:string = null;
  edificioAction:string = null;
  enableEdificioExtraEdit:boolean = false;
  featureWithHoles:boolean = false;
  enableExtraEditMode:string = null;

  // message and title to show on popup
  popupTitle:string = null;
  popupMsg:string   = null;

  // flag indicating drawing start and end;
  // valued from event received from webgis edit component 
  drawstart:boolean = false;
  drawend:boolean   = false;

  // flag to manage edit permissions
  editCivico:boolean = false;
  editArco:boolean = false;
  editNodo:boolean = false;
  editEdificio:boolean = false;

  private subscription:Subscription;

  private newArcoStyle = {
    type: 1,
    label: null, /*{
      type:"text",
      fontSize: 9,
      textColor: "#ff0000ff",
      text:"a",
      geometry: 2
    },*/
    rules:[
      {
        name: null,
        op:null,
        conditions: null,
        symbol:{
          type: "line",
          color: "#1589FFFF",
          size: 2,
          id: 1
        }
      },
      {
        name: null,
        op:null,
        conditions: null,
        symbol:{
          type: "shape",
          id:1,
          color: "#1589FFFF",
          size: 8,
          geometry: 1
        }
      }
    ]
  };

  private newEdificioStyle = {
    type: 1,
    label: null,
    rules:[
      {
        name: null,
        op:null,
        conditions: null,
        symbol:{
          type: "polygon",
          strokeColor: "#1589FFFF",
          color: "#BDEDFF44",
          strokeWidth: 2,
          id: 1
        }
      }
    ]
  };

  constructor(private authSvc:AuthService,
              private wgSvc: WebgisService,
              private httpReader: HttpReaderService,
              private httpWriter: HttpWriterService,
              private modalSvc: NgbModal)
  {}

  ngOnInit()
  {
    /* Check permission */
    let aPerm = this.authSvc.permForModule("graph");

    this.editCivico   = aPerm.indexOf("CIVICO_EDITING") >= 0;
    this.editArco     = aPerm.indexOf("ARCO_EDITING") >= 0;
    this.editNodo     = aPerm.indexOf("NODO_EDITING") >= 0;
    this.editEdificio = aPerm.indexOf("EDIFICIO_EDITING") >= 0;

    // subscribe component to manage messages from other components
    this.subscription = this.wgSvc.observer.subscribe((obj) => 
    {
      if (obj && obj.key)
      {
        switch (obj.key)
        {
          // manage featureClick messages
          case 'featureClick':
            let featureObj = obj['val'];

            if (featureObj.layerKey == this.editLayerKey)
            {
              // Create right entity
              switch (featureObj.layerKey)
              {
                case "civico":
                  this.editEntity = new Civico({}, 2);
                  break;

                case "arco":
                  this.editEntity = new Arco({}, 2);
                  break;

                case "nodo":
                  this.editEntity = new Nodo({}, 2);
                  break;

                case "edificio":
                  this.editEntity = new Edificio({}, 2);
                  break;

                default:
                  console.error("Entity " + this.editLayerKey + " not managed yet!");
                  return;
              }

              // manage locally
              this.editEntity.setId(featureObj.featureId);

              this.showEntityEvt.emit(this.editEntity);
            }
            else
            {
              // manage by webgis service
              this.wgSvc.showFeaturePopup(featureObj);
            }
            break;

          // execute conclusive edit operationss
          case 'finallyEdit':
            this.finallyEdit(obj['val']);
            break;

          // received drawstart event from webgis edit
          case 'drawstart':
            this.drawstart = true;
            this.drawend   = false;
            break;

          // received drawend event from webgis edit
          case 'drawend':
            this.drawend   = true;
            this.drawstart = false;
            break;

          case 'enableExtraEdit':
            if (this.editLayerKey == 'edificio')
            {
              this.enableExtraEditMode = obj['val']['editMode'];
              this.featureWithHoles = obj['val']['featureWithHoles'];

              this.enableEdificioExtraEdit = true;

              if (obj['val']['enable'])
              {
                if (obj['val']['enable'] == 'transform')
                {
                  this.selectedAction == 'modifyEdificio';
                  this.transformEdificio();
                }
              }
            }
            break;

          case 'featureWithHoles':
            if (this.editLayerKey == 'edificio')
            {
              this.enableExtraEditMode = obj['val']['editMode'];
              this.featureWithHoles = true;

              
            }
            break;

          case 'removeHolesStop':
            if (this.editLayerKey == 'edificio')
            {
              this.featureWithHoles = false;

              //set current action
              if (obj['val']['editMode'] == 'add')
              {
                this.edificioAction = obj['val']['drawMode'] == 'normal' ? 'drawEdificio' : 'regEdificio';
              }

              if (obj['val']['editMode'] == 'modify')
                this.edificioAction = 'drawEdificio';// TODO
            }
            break;
        }
      }
    });
  }

  ngOnDestroy()
  {
    this.subscription.unsubscribe();
  }


  /*
   * toggle left sidebar visibility
   */
  onSidebarBtn():void
  {
    this.toggleSidebarEvt.emit({});
  }

  /*
   * Invoked from grafo edit bar buttons
   */
  startEdit(itemType:string):void
  {
    // reset action
    this.selectedAction = null;

    // set edited layer
    this.editLayerKey = (itemType == this.editLayerKey) ? null : itemType;

    if (this.editLayerKey)
    {
      // light on edited layer
      this.wgSvc.setLayerVisibility(this.editLayerKey, true);

      let editLayer:WGMapLayer = this.wgSvc.getLayerObjByKey(this.editLayerKey);

      // retrieve its EPSG and number of decimal digits
      this.editLayerProj = editLayer.projection;
      this.editLayerCoordsNumDec = getCoordNumDec(editLayer.measureUnit);
    }
    else
    {
      // reset values
      this.editLayerProj         = null;
      this.editLayerCoordsNumDec = null;
    }

    // set right edit status
    this.wgSvc.sendMessage('editStatus', {
      status:EditStatus.INITIALIZE,
      layerKey:this.editLayerKey
    });
  }

  /*
   * manage new civico insert
   */
  public newCivico()
  {
    this.selectedAction = (this.selectedAction == 'newCivico') ? null : 'newCivico';

    // light on auxiliary layers
    this.wgSvc.setLayerVisibility('edificio', true);
    this.wgSvc.setLayerVisibility('arco', true);
    this.wgSvc.setLayerVisibility('nodo', true);

    // send message to webgis edit component
    if (this.selectedAction)
    {
      this.wgSvc.sendMessage(
        'edit',
        {
          mode:'add',
          params:
          {
            layerKey: this.editLayerKey,
            entityType: Civico,
            snapOnLayer: ['edificio'],
            mode:AddMode.SINGLE,
            source: AddSource.DRAW,
            callback: ret => {this.manageInsertCivico(ret);}
          }
        }
      );
    }
    else
    {
      // selectedAction is null => set right edit status
      this.wgSvc.sendMessage('editStatus', {
        status:EditStatus.INITIALIZE,
        layerKey:this.editLayerKey
      });
    }
  }

  /*
   * manage civico remove
   */
  public delCivico()
  {
    this.selectedAction = (this.selectedAction == 'delCivico') ? null : 'delCivico';

    this.wgSvc.setLayerVisibility('edificio', true);

    // send message to webgis edit component
    if (this.selectedAction)
    {
      this.wgSvc.sendMessage(
        'edit',
        {
          mode:'delete',
          params:
          {
            layerKey: this.editLayerKey,
            entityType: Civico,
            snapOnLayer: ['civico'],
            mode:DeleteMode.SINGLE,
            callback: ret => {this.manageDeleteCivico(ret);}
          }
        }
      );
    }
    else
    {
      // selectedAction is null => set right edit status
      this.wgSvc.sendMessage('editStatus', {
        status:EditStatus.INITIALIZE,
        layerKey:this.editLayerKey
      });
    }
  }

  /*
   * manage civico move
   */
  public moveCivico()
  {
    this.selectedAction = (this.selectedAction == 'moveCivico') ? null : 'moveCivico';

    this.wgSvc.setLayerVisibility('edificio', true);

    // send message to webgis edit component
    if (this.selectedAction)
    {
      this.wgSvc.sendMessage(
        'edit',
        {
          mode:'modify',
          params:
          {
            layerKey: this.editLayerKey,
            entityType: Civico,
            snapOnLayer: ['edificio'],
            mode: ModifyMode.ATTR_GEOM, // it's possible modify attributes and/or geometry
            callback: ret => {this.manageMoveCivico(ret);}
          }
        }
      );
    }
    else
    {
      // selectedAction is null => set right edit status
      this.wgSvc.sendMessage('editStatus', {
        status:EditStatus.INITIALIZE,
        layerKey:this.editLayerKey
      });
    }
  }

  /*
   * manage civico renumber
   */
  public renumberCivico()
  {
    this.selectedAction = (this.selectedAction == 'renumberCivico') ? null : 'renumberCivico';

    this.wgSvc.setLayerVisibility('edificio', true);

    // send message to webgis edit component
    if (this.selectedAction)
    {
      this.wgSvc.sendMessage(
        'edit',
        {
          mode:'modify',
          params:
          {
            layerKey: this.editLayerKey,
            entityType: Civico,
            snapOnLayer: ['civico'],
            mode: ModifyMode.ONLY_ATTR,
            callback: ret => {this.manageRenumberCivico(ret);}
          }
        }
      );
    }
    else
    {
      // selectedAction is null => set right edit status
      this.wgSvc.sendMessage('editStatus', {
        status:EditStatus.INITIALIZE,
        layerKey:this.editLayerKey
      });
    }
  }

  /*
   * manage new arco insert
   */
  public newArco()
  {
    this.selectedAction = (this.selectedAction == 'newArco') ? null : 'newArco';

    // light on auxiliary layers
    this.wgSvc.setLayerVisibility('nodo', true);

    // send message to webgis edit component
    if (this.selectedAction)
    {
      this.wgSvc.sendMessage(
        'edit',
        {
          mode:'add',
          params:
          {
            layerKey: this.editLayerKey,
            layerStyle: this.newArcoStyle,
            entityType: Arco,
            snapOnLayer: ['nodo','arco'], // snap on layer nodo takes precedence on arco layer
            mode:AddMode.SINGLE,
            source: AddSource.DRAW,
            callback: ret => {this.manageInsertArco(ret);}
          }
        }
      );
    }
    else
    {
      // selectedAction is null => set right edit status
      this.wgSvc.sendMessage('editStatus', {
        status:EditStatus.INITIALIZE,
        layerKey:this.editLayerKey
      });
    }
  }

  /*
   * manage arco remove
   */
  public delArco()
  {
    this.selectedAction = (this.selectedAction == 'delArco') ? null : 'delArco';

    // light on auxiliary layers
    this.wgSvc.setLayerVisibility('nodo', true);

    // send message to webgis edit component
    if (this.selectedAction)
    {
      this.wgSvc.sendMessage(
        'edit',
        {
          mode:'delete',
          params:
          {
            layerKey: this.editLayerKey,
            entityType: Arco,
            mode:DeleteMode.SINGLE,
            callback: ret => {this.manageDeleteArco(ret);}
          }
        }
      );
    }
    else
    {
      // selectedAction is null => set right edit status
      this.wgSvc.sendMessage('editStatus', {
        status:EditStatus.INITIALIZE,
        layerKey:this.editLayerKey
      });
    }
  }

  /*
   * manage arco break
   */
  public breakArco()
  {
    this.selectedAction = (this.selectedAction == 'breakArco') ? null : 'breakArco';

    // light on auxiliary layers
    this.wgSvc.setLayerVisibility('nodo', true);

    // send message to webgis edit component
    if (this.selectedAction)
    {
      this.wgSvc.sendMessage(
        'edit',
        {
          mode:'add',
          params:
          {
            layerKey: 'nodo',
            entityType: Nodo,
            snapOnLayer: ['arco'],
            mode:AddMode.SINGLE,
            source: AddSource.DRAW,
            callback: ret => {this.manageBreakArco(ret);}
          }
        }
      );
    }
    else
    {
      // selectedAction is null => set right edit status
      this.wgSvc.sendMessage('editStatus', {
        status:EditStatus.INITIALIZE,
        layerKey:this.editLayerKey
      });
    }
  }

  /*
   * manage arco merge
   */
  public mergeArco()
  {
    this.selectedAction = (this.selectedAction == 'mergeArco') ? null : 'mergeArco';

    // light on auxiliary layers
    this.wgSvc.setLayerVisibility('nodo', true);

    // send message to webgis edit component
    if (this.selectedAction)
    {
      this.wgSvc.sendMessage(
        'edit',
        {
          mode:'modify',
          params:
          {
            layerKey: 'nodo',
            entityType: Nodo,
            snapOnLayer: ['nodo'],
            mode:ModifyMode.ONLY_ATTR,
            callback: ret => {this.manageMergeArco(ret);}
          }
        }
      );
    }
    else
    {
      // selectedAction is null => set right edit status
      this.wgSvc.sendMessage('editStatus', {
        status:EditStatus.INITIALIZE,
        layerKey:this.editLayerKey
      });
    }
  }

  /*
   * manage arco reshape
   */
  public shapeArco()
  {
    this.selectedAction = (this.selectedAction == 'shapeArco') ? null : 'shapeArco';

    // light on auxiliary layers
    this.wgSvc.setLayerVisibility('nodo', true);

    // send message to webgis edit component
    if (this.selectedAction)
    {
      this.wgSvc.sendMessage(
        'edit',
        {
          mode:'modify',
          params:
          {
            layerKey: this.editLayerKey,
            layerStyle: this.newArcoStyle,
            entityType: Arco,
            snapOnLayer: ['arco'],
            mode:ModifyMode.ATTR_GEOM,
            exclude:['ends'], // array of feature parts to exclude from modify
            callback: ret => {this.manageShapeArco(ret);}
          }
        }
      );
    }
    else
    {
      // selectedAction is null => set right edit status
      this.wgSvc.sendMessage('editStatus', {
        status:EditStatus.INITIALIZE,
        layerKey:this.editLayerKey
      });
    }
  }

  /*
   * manage arco rename
   */
  public renameArco()
  {
    this.selectedAction = (this.selectedAction == 'renameArco') ? null : 'renameArco';

    // light on auxiliary layers

    // send message to webgis edit component
    if (this.selectedAction)
    {
      this.wgSvc.sendMessage(
        'edit',
        {
          mode:'modify',
          params:
          {
            layerKey: this.editLayerKey,
            layerStyle: this.newArcoStyle,
            entityType: Arco,
            snapOnLayer: ['arco'],
            mode:ModifyMode.ONLY_ATTR,
            callback: ret => {this.manageRenameArco(ret);}
          }
        }
      );
    }
    else
    {
      // selectedAction is null => set right edit status
      this.wgSvc.sendMessage('editStatus', {
        status:EditStatus.INITIALIZE,
        layerKey:this.editLayerKey
      });
    }
  }

  /*
   * manage nodo move
   */
  public moveNodo()
  {
    this.selectedAction = (this.selectedAction == 'moveNodo') ? null : 'moveNodo';

    // light on auxiliary layers
    this.wgSvc.setLayerVisibility('arco', true);

    // send message to webgis edit component
    if (this.selectedAction)
    {
      this.wgSvc.sendMessage(
        'edit',
        {
          mode:'modify',
          params:
          {
            layerKey: this.editLayerKey,
            additionalLayerKey: 'arco',
            entityType: Nodo,
            snapOnLayer: ['nodo'],
            mode:ModifyMode.ONLY_GEOM,
            callbackToSelectLinkedFeatures: (idNodo) => {
              // retrieve all valid arco that flow into given nodo
              let url = "/nodo/retrieveArcoInNodo?idNodo="+idNodo;

              this.httpReader.get(url).subscribe(
                res => {
                  if (res['error'])
                  {
                    this.openModalMsg({
                      title: "Errore",
                      msg: "Si è verificato un errore durante l'acquisizione delle informazioni",
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
                    });

                    return;
                  }

                  let fArrId:Array<number> = [];
                  let fArrSel:Array<any> = [];

                  for (let idx=0; idx<res['result'].length; idx++)
                  {
                    fArrId.push(res['result'][idx]['cod_arco']);
                  }

                  let arcoLayer:WGMapLayer = this.wgSvc.getLayerObjByKey('arco');
                  let arcoSource = arcoLayer.getSource();

                  let ftArray:Array<any> = arcoSource.getFeaturesInExtent(this.wgSvc.getMapCurrentExtent());

                  for (let idx=0; idx<ftArray.length; idx++)
                  {
                    if (fArrId.indexOf(ftArray[idx].get('cod_arco')) >= 0)
                    {
                      fArrSel.push(ftArray[idx]);
                    }
                  }

                  this.wgSvc.sendMessage('callbackToSelectLinkedFeatures',{features:fArrSel, layerKey:'arco'});
                },
                err => {
                  console.error(err);
          
                  this.openModalMsg({
                    title: "Errore",
                    msg: "Si è verificato un errore durante l'acquisizione delle informazioni",
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
                  });
                }
              );
            },
            returnOnSelect: true,
            callback: ret => {this.manageMoveNodo(ret);}
          }
        }
      );
    }
    else
    {
      // selectedAction is null => set right edit status
      this.wgSvc.sendMessage('editStatus', {
        status:EditStatus.INITIALIZE,
        layerKey:this.editLayerKey
      });
    }
  }

  /*
   * manage add new edificio
   * it is necessary to select an operation between drawEdificio, regEdificio and copyEdificio
   */
  public addEdificio()
  {
    this.selectedAction = (this.selectedAction == 'addEdificio') ? null : 'addEdificio';

    this.edificioAction = null;
    this.enableEdificioExtraEdit = false;
    this.featureWithHoles = false;

    this.wgSvc.sendMessage('editStatus', {
      status:EditStatus.INITIALIZE,
      layerKey:this.editLayerKey
    });
  }

  /*
   * manage edificio delete
   */
  public delEdificio()
  {
    this.selectedAction = (this.selectedAction == 'delEdificio') ? null : 'delEdificio';

    this.enableEdificioExtraEdit = false;

    // light on auxiliary layers
    this.wgSvc.setLayerVisibility('civico', true);

    // send message to webgis edit component
    if (this.selectedAction)
    {
      this.wgSvc.sendMessage(
        'edit',
        {
          mode:'delete',
          params:
          {
            layerKey: this.editLayerKey,
            entityType: Edificio,
            mode:DeleteMode.SINGLE,
            callback: ret => {this.manageDeleteEdificio(ret);}
          }
        }
      );
    }
    else
    {
      // selectedAction is null => set right edit status
      this.wgSvc.sendMessage('editStatus', {
        status:EditStatus.INITIALIZE,
        layerKey:this.editLayerKey
      });
    }
  }

  /*
   * manage edificio modify
   */
  public modifyEdificio()
  {
    this.selectedAction = (this.selectedAction == 'modifyEdificio') ? null : 'modifyEdificio';

    this.enableEdificioExtraEdit = false;
    this.featureWithHoles = false;

    // light on auxiliary layers
    this.wgSvc.setLayerVisibility('civico', true);
    this.wgSvc.setLayerVisibility('arco', true);

    if (this.selectedAction)
    {
      this.edificioAction = null;

      this.wgSvc.sendMessage(
        'edit',
        {
          mode:'modify',
          params:
          {
            layerKey: this.editLayerKey,
            entityType: Edificio,
            mode:ModifyMode.ATTR_GEOM,
            enableExtraEdit:true,
            returnOnSelect: true,
            callback: ret => {this.manageModifyEdificio(ret);}
          }
        }
      );
    }
    else
    {
      // selectedAction is null => set right edit status
      this.enableEdificioExtraEdit = false;
      this.edificioAction = null;

      this.wgSvc.sendMessage('editStatus', {
        status:EditStatus.INITIALIZE,
        layerKey:this.editLayerKey
      });
    }
  }


  /*
   * manage drawing of new edificio
   */
  public drawEdificio()
  {
    this.edificioAction = (this.edificioAction == 'drawEdificio') ? null : 'drawEdificio';

    // light on auxiliary layers
    this.wgSvc.setLayerVisibility('edificio', true);
    this.wgSvc.setLayerVisibility('arco', true);
    this.wgSvc.setLayerVisibility('nodo', true);
    this.wgSvc.setLayerVisibility('civico', true);

    // send message to webgis edit component
    if (this.edificioAction)
    {
      this.enableEdificioExtraEdit = false;

      this.wgSvc.sendMessage(
        'edit',
        {
          mode:'add',
          params:
          {
            layerKey: this.editLayerKey,
            layerStyle: this.newEdificioStyle,
            entityType: Edificio,
            mode:AddMode.SINGLE,
            source: AddSource.DRAW,
            enableExtraEdit:true,
            callback: ret => {this.manageInsertEdificio(ret);}
          }
        }
      );
    }
    else
    {
      this.enableEdificioExtraEdit = false;
      //this.edificioAction = null;
      // edificioAction is null => set right edit status
      this.wgSvc.sendMessage('editStatus', {
        status:EditStatus.INITIALIZE,
        layerKey:this.editLayerKey
      });
    }
  }

  /*
   * manage regular drawing of new edificio
   */
  public regEdificio()
  {
    this.edificioAction = (this.edificioAction == 'regEdificio') ? null : 'regEdificio';

    // light on auxiliary layers
    this.wgSvc.setLayerVisibility('edificio', true);
    this.wgSvc.setLayerVisibility('arco', true);
    this.wgSvc.setLayerVisibility('nodo', true);
    this.wgSvc.setLayerVisibility('civico', true);

    // send message to webgis edit component
    if (this.edificioAction)
    {
      this.enableEdificioExtraEdit = false;

      this.wgSvc.sendMessage(
        'edit',
        {
          mode:'add',
          params:
          {
            layerKey: this.editLayerKey,
            layerStyle: this.newEdificioStyle,
            entityType: Edificio,
            mode:AddMode.SINGLE,
            source: AddSource.DRAW,
            drawAddOn:[DrawAddOn.REGULAR_SHAPE],
            enableExtraEdit:true,
            callback: ret => {this.manageInsertEdificio(ret);}
          }
        }
      );
    }
    else
    {
      // edificioAction is null => set right edit status
      this.wgSvc.sendMessage('editStatus', {
        status:EditStatus.INITIALIZE,
        layerKey:this.editLayerKey
      });
    }
  }

  /*
   * manage copy of new edificio from a source layer
   */
  public copyEdificio()
  {
    this.edificioAction = (this.edificioAction == 'copyEdificio') ? null : 'copyEdificio';

    // light on auxiliary layers
    this.wgSvc.setLayerVisibility('edificio', true);
    this.wgSvc.setLayerVisibility('arco', true);
    this.wgSvc.setLayerVisibility('nodo', true);
    this.wgSvc.setLayerVisibility('civico', true);

    // send message to webgis edit component
    if (this.edificioAction)
    {
      /*this.wgSvc.sendMessage(
        'copyPasteInteraction',
        {status:true}
      );*/

      this.enableEdificioExtraEdit = false;

      this.wgSvc.sendMessage(
        'edit',
        {
          mode:'add',
          params:
          {
            layerKey: this.editLayerKey,
            layerStyle: this.newEdificioStyle,
            entityType: Edificio,
            mode:AddMode.SINGLE,
            source: AddSource.COPY,
            enableExtraEdit:true,
            callback: ret => {this.manageInsertEdificio(ret);}
          }
        }
      );
    }
    else
    {
      /*this.wgSvc.sendMessage(
        'copyPasteInteraction',
        {status:true}
      );*/

      // edificioAction is null => set right edit status
      this.wgSvc.sendMessage('editStatus', {
        status:EditStatus.INITIALIZE,
        layerKey:this.editLayerKey
      });
    }
  }

  /*
   * manage drawing hole into edificio
   */
  public holeEdificio()
  {
    this.edificioAction = (this.edificioAction == 'holeEdificio') ? null : 'holeEdificio';

    if (this.edificioAction)
    {
      this.wgSvc.sendMessage(
        'holeInteraction',
        {status:true, mode:this.enableExtraEditMode}
      );
    }
    else
    {
      this.wgSvc.sendMessage(
        'holeInteraction',
        {status:false, mode:this.enableExtraEditMode}
      );
    }
  }

  /*
   * manage remove hole into edificio
   */
  public removeHoleEdificio()
  {
    this.edificioAction = (this.edificioAction == 'removeHoleEdificio') ? null : 'removeHoleEdificio';

    if (this.edificioAction)
    {
      this.wgSvc.sendMessage(
        'removeHoleInteraction',
        {status:true, mode:this.enableExtraEditMode, layerKey:this.editLayerKey}
      );
    }
    else
    {
      this.wgSvc.sendMessage(
        'removeHoleInteraction',
        {status:false, mode:this.enableExtraEditMode, layerKey:this.editLayerKey}
      );
    }
  }

  /*
   * manage edificio move, scale and rotate
   */
  public transformEdificio()
  {
    this.edificioAction = (this.edificioAction == 'transformEdificio') ? null : 'transformEdificio';

    if (this.edificioAction)
    {
      this.wgSvc.sendMessage(
        'transformInteraction',
        {status:true, mode:this.enableExtraEditMode}
      );
    }
    else
    {
      this.wgSvc.sendMessage(
        'transformInteraction',
        {status:false, mode:this.enableExtraEditMode}
      );
    }
  }

  /*
   * Private methods
   */

  /*
   * execute auxiliary operations at the end of edit process
   * params contains attributes:
   * 
   * - entityType -> edited entity
   * - endMode    -> flag that can assume the following values:
   *   - C interrupt edit operations
   *   - D close edit operations with success
   *   - E close edit operations with error
   */
  private finallyEdit(params:object):void
  {
    this.selectedAction = null;

    let entityType = params['entityType'];

    if (!entityType)
    {
      console.error("Error: entity attribute not valorized!");
      return;
    }

    switch(entityType.getLayerKey())
    {
      case 'civico':
        this.wgSvc.refreshLayer('civico');
        this.wgSvc.refreshLayer('proiezione');
        this.wgSvc.refreshLayer('arco');
        break;

      case 'arco':
        this.wgSvc.refreshLayer('arco');
        this.wgSvc.refreshLayer('nodo');
        this.wgSvc.refreshLayer('proiezione');
        break;

      case 'edificio':
        this.wgSvc.refreshLayer('edificio');
        this.wgSvc.refreshLayer('civico');
        break;

      case 'nodo':
        this.wgSvc.refreshLayer('arco');
        this.wgSvc.refreshLayer('nodo');
        this.wgSvc.refreshLayer('civico');
        this.wgSvc.refreshLayer('proiezione');
        break;

      default:
        console.error("Error: entity " + entityType.getName() + " not managed");
    }
  }

  /*
   * Open modal with given configuration
   */
  private openModalMsg(modalCfg:Object):void
  {
    let modalOpt = {};

     // default values of modal config
    modalOpt['backdrop'] = 'static';
    modalOpt['keyboard'] = false;

    // custom values of modal config
    modalOpt['size'] = modalCfg['size'] ? modalCfg['size'] : "sm";

    const modalRef = this.modalSvc.open(ModalMessageComponent, modalOpt);

    // setting other modal configuration (style, title, message, buttons)
    modalCfg['style'] = modalCfg['style'] ? modalCfg['style'] : "info";

    modalRef.componentInstance.modalCfg = modalCfg;
  }

  /*
   * Callback to manage insert of new civico
   * in ftArray we have to receive only one item
   */
  private manageInsertCivico(params:Object)
  {
    if (params && params['ftArray'] && params['ftArray'].length == 1)
    {
      // retrieve inserted feature coords and map srid
      let coords = params['ftArray'][0].getGeometry().getCoordinates();
      let srid   = this.wgSvc.getMapSrCode();

      // retrieve via (via related to the nearest arco) and areas where the civico falls
      let url = "/civico/retrieveGeoData?x="+coords[0]+"&y="+coords[1]+"&srid="+srid;

      // retrieve geoData
      this.httpReader.get(url).subscribe(
        res => {
          this.selectedAction = null;

          // manage returned error
          if (res['error'])
          {
            this.openModalMsg({
              title: "Errore",
              msg: "Si è verificato un errore durante l'acquisizione delle informazioni",
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
            });

            return;
          }

          // create new civico entity and set attributes
          let ret = res['result'];

          // Create entity and set new attributes
          this.editEntity = new Civico({}, 1);

          // Set entity zone
          let zone:{id_zona:number,name:string,descr:string,valore:string}[] = [];

          for (let idx=0; idx<ret['zone'].length; idx++)
          {
            let item = ret['zone'][idx];

            zone.push({
              id_zona: item['id_zona'],
              name:    item['name'],
              descr:   item['descr'],
              valore:  item['valore']
            });
          }

          // if map sr is different from edit layer sr -> trasform coordinate
          coords = ('EPSG:'+srid != this.editLayerProj) ?
            this.wgSvc.transformCoords(coords, 'EPSG:'+srid, this.editLayerProj) : coords;

          this.editEntity.mapChange = {
            x: coords[0].toFixed(this.editLayerCoordsNumDec) * 1,
            y: coords[1].toFixed(this.editLayerCoordsNumDec) * 1,
            cod_via: ret['cod_via'],
            nome_via: ret['denominazione'],
            cod_arco: ret['cod_arco'],
            id_edificio: [ret['id_edificio']],
            proiezione_x: ret['nearest_point'][0].toFixed(this.editLayerCoordsNumDec) * 1,
            proiezione_y: ret['nearest_point'][1].toFixed(this.editLayerCoordsNumDec) * 1,
            zone: zone,
            catasto_edifici:ret['catasto_edifici'],
            particelle:ret['particelle']
          };

          // show on right panel
          this.showEntityEvt.emit(this.editEntity);

          this.wgSvc.sendMessage('resetEdit', {});
        },
        err => {
          console.error(err);
          
          this.openModalMsg({
            title: "Errore",
            msg: "Si è verificato un errore durante l'acquisizione delle informazioni",
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
          });
        }
      );
    }
    else
      console.error("Error: wrong invocation of manageInsertCivico function!");
  }

  /*
   * Callback to manage delete of civico
   * in ftArray we have to receive only one item
   */
  private manageDeleteCivico(params:Object)
  {
    if (params && params['ftArray'] && params['ftArray'].length == 1)
    {
      this.selectedAction = null;

      let feature = params['ftArray'][0];

      // set object that must be linked to the delete form
      let deleteObj = {
        id:                feature.get('id'),
        numero:            feature.get('numero'),
        esponente:         feature.get('esponente'),
        estensione:        feature.get('estensione'),
        cod_via:           feature.get('cod_via'),
        nome_via:          feature.get('nome_via'),
        data_fine:         null,
        id_mot_cessazione: null
      };

      // show modal to manage civico delete
      const modalRef = this.modalSvc.open(
        DeleteCivicoComponent,
        {backdrop:"static", keyboard:false, centered:true}
      );

      // set object to DeleteCivicoComponent
      modalRef.componentInstance.deleteObj = deleteObj;
    }
    else
      console.error("Error: wrong invocation of manageDeleteCivico function!");
  }

  /*
   * Callback to manage move of civico
   * in ftArray we have to receive only one item
   */
  private manageMoveCivico(params:Object)
  {
    if (params && params['ftArray'] && params['ftArray'].length == 1)
    {
      // retrieve moved feature id, coords and map srid
      let featureId = params['ftArray'][0].get('id');
      let coords    = params['ftArray'][0].getGeometry().getCoordinates();
      let srid      = this.wgSvc.getMapSrCode();

      // retrieve civico geoData in new position
      // (via - related to the nearest arco - and areas where the civico falls)
      let url = "/civico/retrieveGeoData?x="+coords[0]+"&y="+coords[1]+"&srid="+srid;

      this.httpReader.get(url).subscribe(
        res => {
          this.selectedAction = null;

          // manage returned error
          if (res['error'])
          {
            this.openModalMsg({
              title: "Errore",
              msg: "Si è verificato un errore durante l'acquisizione delle informazioni",
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
            });

            return;
          }

          // create civico entity to update the old one (mode value is 5)
          let civicoGeoData = res['result'];

          this.editEntity = new Civico({}, 5);

          // set id
          this.editEntity.setId(featureId);

          // set entity zone
          let zone:{id_zona:number,name:string,descr:string,valore:string}[] = [];

          for (let idx=0; idx<civicoGeoData['zone'].length; idx++)
          {
            let item = civicoGeoData['zone'][idx];

            zone.push({
              id_zona: item['id_zona'],
              name:    item['name'],
              descr:   item['descr'],
              valore:  item['valore']
            });
          }

          // if map sr is different from edit layer sr -> trasform coordinate
          coords = ('EPSG:'+srid != this.editLayerProj) ?
            this.wgSvc.transformCoords(coords, 'EPSG:'+srid, this.editLayerProj) : coords;

          this.editEntity.mapChange = {
            x: coords[0].toFixed(this.editLayerCoordsNumDec) * 1,
            y: coords[1].toFixed(this.editLayerCoordsNumDec) * 1,
            zone: zone
          };

          // controls to check if civico change position is valid 
          let cod_arco_changed    = false;
          let id_edificio_changed = false;
          let modalMsg = "";

          // check if cod_arco is changed
          if (civicoGeoData['cod_arco'] != params['ftArray'][0].get('cod_arco'))
          {
            cod_arco_changed = true;
            modalMsg = "Lo spostamento del numero civico comporterebbe la modifica dell'arco ";
          }

          // civico could have many edificio related (one to many relation)
          // transform id_edificio_str string attribute into an array
          // civico may not have an associated building (check null value)
          let arrEdifici = params['ftArray'][0].get('id_edificio_str') != null ?
            params['ftArray'][0].get('id_edificio_str').split(', ') : [];

          // id_edificio is integer; string to integer conversion into array
          for(let idx=0; idx<arrEdifici.length; idx++)
          {
            arrEdifici[idx] = +arrEdifici[idx];
          } 

          // check if edificio is changed
          if (arrEdifici.indexOf(civicoGeoData['id_edificio']) < 0)
          {
            id_edificio_changed = true;

            modalMsg += cod_arco_changed ?
             "e dell'edificio associati.\n" +
             "Modificare con i nuovi valori o mantenere i precedenti?" :
             "Lo spostamento del numero civico comporterebbe la modifica dell'edificio associato.\n" +
             "Modificare con il nuovo valore o mantenere il precedente?";
          }
          else
          {
            // arco is changed and edificio isn't changed
            if (cod_arco_changed)
            {
              modalMsg +=
                " associato.\n" +
                "Modificare il nuovo valore o mantenere il precedente?";
            }
          }

          // if via is changed (in this case also arco is changed)
          if (civicoGeoData['cod_via'] != params['ftArray'][0].get('cod_via'))
          {
            modalMsg =
              "Lo spostamento del numero civico comporterebbe la modifica della via a questi associata.\n" +
              "Tale operazione non è possibile.\n" +
              "Saranno mantenuti via, arco ed edifici presenti nella scheda.";
              //"Procedere eventualmente con la selezione di un'arco appartenente a " +
              //params['ftArray'][0].get('nome_via');

            this.openModalMsg({
              title: "Attenzione",
              msg: modalMsg,
              size: "sm",
              style: "warning",
              buttons:[
                {
                  id: 1,
                  label: "Annulla",
                  callback: ret => {
                    this.wgSvc.sendMessage('editStatus', {
                      status:EditStatus.INITIALIZE,
                      layerKey:this.editLayerKey
                    });
                  }
                },
                {
                  id: 2,
                  label: "Procedi",
                  callback: ret => {
                    this.showEntityEvt.emit(this.editEntity);
                  }
                }
              ]
            });
          }
          // if arco (but not the via) or edificio are changed
          else if (cod_arco_changed || id_edificio_changed)
          {
            this.openModalMsg({
              title: "Attenzione",
              msg: modalMsg,
              size: "sm",
              style: "warning",
              buttons:[
                {
                  id: 1,
                  label: "Annulla",
                  callback: ret => {
                    this.wgSvc.sendMessage('editStatus', {
                      status:EditStatus.INITIALIZE,
                      layerKey:this.editLayerKey
                    });
                  }
                },
                {
                  id: 2,
                  label: "Mantieni i vecchi valori",
                  callback: ret => {
                    this.showEntityEvt.emit(this.editEntity);
                  }
                },
                {
                  id: 3,
                  label: "Modifica con i nuovi valori",
                  callback: ret => {
                    if (cod_arco_changed)
                    {
                      this.editEntity.mapChange['cod_arco'] =
                        civicoGeoData['cod_arco'];

                      this.editEntity.mapChange['proiezione_x'] =
                        civicoGeoData['nearest_point'][0].toFixed(this.editLayerCoordsNumDec) * 1;

                      this.editEntity.mapChange['proiezione_y'] =
                        civicoGeoData['nearest_point'][1].toFixed(this.editLayerCoordsNumDec) * 1;
                    }

                    if (id_edificio_changed)
                    {
                      this.editEntity.mapChange['id_edificio'] =
                        [civicoGeoData['id_edificio']];
                    }

                    this.showEntityEvt.emit(this.editEntity);
                  }
                }
              ]
            });
          }
          else
          {
            // in this case arco, civico and via haven't changed

            this.editEntity.mapChange['proiezione_x'] =
              civicoGeoData['nearest_point'][0].toFixed(this.editLayerCoordsNumDec) * 1;

            this.editEntity.mapChange['proiezione_y'] =
              civicoGeoData['nearest_point'][1].toFixed(this.editLayerCoordsNumDec) * 1;

            // show on right panel
            this.showEntityEvt.emit(this.editEntity);
          }
        },
        err => {
          console.error(err);
          
          this.openModalMsg({
            title: "Errore",
            msg: "Si è verificato un errore durante l'acquisizione delle informazioni",
            size: "sm",
            style: "danger",
            buttons:[{
              id: 1,
              label: "Ok",
              callback: ret => {this.wgSvc.sendMessage('resetEdit', {});}
            }]
          });
        }
      );
    }
    else
      console.error("Error: wrong invocation of manageMoveCivico function!");
  }

  /*
   * Callback to manage renumber of civico
   * in ftArray we have to receive only one item
   */
  private manageRenumberCivico(params:Object)
  {
    if (params && params['ftArray'] && params['ftArray'].length == 1)
    {
      this.selectedAction = null;

      let feature = params['ftArray'][0];

      // set object that must be linked to the renumber form
      let renumberObj = {
        id:                feature.get('id'),
        prev_numero:       feature.get('numero'),
        prev_esponente:    feature.get('esponente'),
        prev_cod_via:      feature.get('cod_via'),
        prev_nome_via:     feature.get('nome_via'),
        prev_cod_arco:     feature.get('cod_arco'),
        next_cod_via:      feature.get('cod_via'),
        next_nome_via:     feature.get('nome_via'),
        next_cod_arco:     feature.get('cod_arco'),
        x:                 feature.get('geometry').getCoordinates()[0],
        y:                 feature.get('geometry').getCoordinates()[1]
        //data_fine:         null,
        //id_mot_cessazione: null
      };

      // emit event to show right component on left sidebar
      this.renCivicoEvt.emit({
        obj:renumberObj
      });
    }
    else
      console.error("Error: wrong invocation of manageRenumberCivico function!");
  }

  /*
   * Callback to manage insert of new arco
   * in ftArray we have to receive only one item
   */
  private manageInsertArco(params:Object)
  {
    if (params && params['ftArray'] && params['ftArray'].length == 1)
    {
      this.selectedAction = null;

      // retrieve map srid
      let srid = this.wgSvc.getMapSrCode();

      // retrieve inserted feature (Linestring) and map srid
      let obj = {
        arco: params['ftArray'][0],
        srid: this.wgSvc.getMapSrCode()
      };

      // check topology of sketched arco
      let checkResult = this.checkSketchedArco(obj);

      // Create new entity and set its attributes
      this.editEntity = new Arco({}, 1);

      let pointArray = [];

      pointArray = params['ftArray'][0].getGeometry().getCoordinates();

      // if map sr is different from edit layer sr -> trasform coordinates
      if ('EPSG:'+srid != this.editLayerProj)
      {
        for (let idx=0; idx<pointArray.length; idx++)
          pointArray[idx] = this.wgSvc.transformCoords(
            pointArray[idx],
            'EPSG:'+srid,
            this.editLayerProj
          );
      }

      this.editEntity.mapChange = {
        points: pointArray,
        length: +obj.arco.getGeometry().getLength().toFixed(2)
      };

      // emit event to show right component on left sidebar
      this.insertArcoEvt.emit({
        entity:this.editEntity,
        topologyCheck:checkResult
      });

    }
    else
      console.error("Error: wrong invocation of manageInsertArco function!");
  }

  /*
   * Callback to manage delete of arco
   * in ftArray we have to receive only one item
   */
  private manageDeleteArco(params:Object)
  {
    if (params && params['ftArray'] && params['ftArray'].length == 1)
    {
      this.selectedAction = null;

      let feature = params['ftArray'][0];

      // set object that must be linked to the delete form
      let deleteObj = {
        cod_arco:  feature.get('cod_arco'),
        cod_via:   feature.get('cod_via'),
        nome_via:  feature.get('nome_via'),
        data_fine: null
      };

      // show modal to manage arco delete
      const modalRef = this.modalSvc.open(
        DeleteArcoComponent,
        {backdrop:"static", keyboard:false, centered:true}
      );

      // set object to DeleteArcoComponent
      modalRef.componentInstance.deleteObj = deleteObj;
    }
    else
      console.error("Error: wrong invocation of manageDeleteArco function!");
  }

  /*
   * Callback to manage break of arco (with insert of new node)
   * in ftArray we have to receive only one item
   */
  private manageBreakArco(params:Object)
  {
    if (params && params['ftArray'] && params['ftArray'].length == 1)
    {
      this.selectedAction = null;

      // retrieve inserted node, coords and map srid
      let feature = params['ftArray'][0];
      let coords  = params['ftArray'][0].getGeometry().getCoordinates();
      let srid    = this.wgSvc.getMapSrCode();

      // verify if new node in on arco and doesn't overlap existing node
      let url = "/nodo/checkBreakValidity?x="+coords[0]+"&y="+coords[1]+"&srid="+srid;
      
      this.httpReader.get(url).subscribe(
        res => {
          this.selectedAction = null;

          // manage returned error
          if (res['error'])
          {
            let msg;
            switch(res['error'])
            {
              case 1:
              default:
                msg = "Si è verificato un errore durante l'acquisizione delle informazioni";
                break;
              case 2:
                msg = "Il punto selezionato non è valido poiché non giace su nessun arco";
                break;
              case 3:
                msg = "Il punto selezionato non è valido poiché coincide con il nodo " + res['node'];
                break;
            }
            this.openModalMsg({
              title: "Errore",
              msg: msg,
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
            });

            return;
          }

          // emit event to show result data of break procedure on sidebar
          this.breakArcoEvt.emit({
            codArco: res['result'][0]['cod_arco'],
            x: coords[0],
            y: coords[1],
            srid: srid
          });
        },
        err => {
          console.error(err);
          
          this.openModalMsg({
            title: "Errore",
            msg: "Si è verificato un errore durante l'acquisizione delle informazioni",
            size: "sm",
            style: "danger",
            buttons:[{
              id: 1,
              label: "Ok",
              callback: ret => {this.wgSvc.sendMessage('resetEdit', {});}
            }]
          });
        }
      );

    }
    else  
      console.error("Error: wrong invocation of manageBreakArco function!");
  }

  /*
   * Callback to manage merge of arco (removing common node)
   * in ftArray we have to receive only one item
   */
  private manageMergeArco(params:Object)
  {
    if (params && params['ftArray'] && params['ftArray'].length == 1)
    {
      this.selectedAction = null;

      // retrieve node id
      let feature = params['ftArray'][0];
      let idNodo  = params['ftArray'][0].get('id');

      // verify if new node in on arco and doesn't overlap existing node
      let url = "/nodo/checkMergeValidity?idNodo="+idNodo;

      this.httpReader.get(url).subscribe(
        res => {
          this.selectedAction = null;

          // manage returned error
          if (res['error'])
          {
            let msg;
            switch(res['error'])
            {
              case 1:
              default:
                msg = "Si è verificato un errore durante l'acquisizione delle informazioni";
                break;
              case 2:
                msg = "Il nodo selezionato non è valido poiché in esso confluiscono più di due archi";
                break;
              case 3:
                msg = "Il nodo selezionato non è valido poiché in esso confluiscono meno di due archi";
                break;
              case 4:
                msg = "Il nodo selezionato non è valido poiché gli archi che vi confluiscono appartengono a vie diverse";
                break;
            }
            this.openModalMsg({
              title: "Errore",
              msg: msg,
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
            });

            return;
          }

          // emit event to show result data of merge procedure on sidebar
          this.mergeArcoEvt.emit({
            idNodo: idNodo,
            codArco1: res['result'][0].cod_arco,
            codArco2: res['result'][1].cod_arco
          });

        },
        err => {
          console.error(err);
          
          this.openModalMsg({
            title: "Errore",
            msg: "Si è verificato un errore durante l'acquisizione delle informazioni",
            size: "sm",
            style: "danger",
            buttons:[{
              id: 1,
              label: "Ok",
              callback: ret => {this.wgSvc.sendMessage('resetEdit', {});}
            }]
          });
        }
      );
    }
    else  
      console.error("Error: wrong invocation of manageMergeArco function!");
  }

  /*
   * Callback to manage arco reshape
   * in ftArray we have to receive only one item
   */
  private manageShapeArco(params:Object)
  {
    if (params && params['ftArray'] && params['ftArray'].length == 1)
    {
      this.selectedAction = null;

      // retrieve moved feature id, coords and map srid
      let featureId = params['ftArray'][0].get('cod_arco');
      let coords    = params['ftArray'][0].getGeometry().getCoordinates();
      let srid      = this.wgSvc.getMapSrCode();

      // Create new entity and set its attributes
      this.editEntity = new Arco({}, 2);

      // set id
      this.editEntity.setId(featureId);

      // if map sr is different from edit layer sr -> trasform coordinates
      if ('EPSG:'+srid != this.editLayerProj)
      {
        for (let idx=0; idx<coords.length; idx++)
          coords[idx] = this.wgSvc.transformCoords(
            coords[idx],
            'EPSG:'+srid,
            this.editLayerProj
          );
      }

      this.editEntity.mapChange = {
        lunghezza: +params['ftArray'][0].getGeometry().getLength().toFixed(2)
      };

      this.editEntity['points'] = coords;

      // emit event to show right component on left sidebar
      this.showEntityEvt.emit(this.editEntity);
    }
    else  
      console.error("Error: wrong invocation of manageShapeArco function!");
  }

  /*
   * Callback to manage arco rename
   * in ftArray we have to receive only one item
   */
  private manageRenameArco(params:Object)
  {
    if (params && params['ftArray'] && params['ftArray'].length == 1)
    {
      this.selectedAction = null;

      // retrieve selected feature
      let feature = params['ftArray'][0];

      // set object that must be linked to the rename form
      let renameObj = {
        cod_via:   feature.get('cod_via'),
        nome_via:  feature.get('nome_via'),
        cod_arco:  feature.get('cod_arco')
      };

      // emit event to show right component on left sidebar
      this.renArcoEvt.emit({
        obj:renameObj
      });

    }
    else  
      console.error("Error: wrong invocation of manageRenameArco function!");
  }

  /*
   * Callback to manage nodo movement
   * in ftArray we have to receive only one item
   */
  private manageMoveNodo(params:Object)
  {
    if (params && params['ftArray'])
    {
      this.selectedAction = null;

      // set object that must be linked to the move form
      let moveObj = {
        nodo:{},
        archi:[]
      };

      // retrieve map srid
      let srid = this.wgSvc.getMapSrCode();
      let nodo:object;
      let archi:Array<object> = [];
      let coords;

      for (let idx=0; idx<params['ftArray'].length; idx++)
      {
        let ft = params['ftArray'][idx];
        

        switch(ft.get('layer'))
        {
          case 'nodo':
            coords = ft.getGeometry().getCoordinates();

            // if map sr is different from edit layer sr -> trasform coordinate
            coords = ('EPSG:'+srid != this.editLayerProj) ?
              this.wgSvc.transformCoords(coords, 'EPSG:'+srid, this.editLayerProj) : coords;

            moveObj.nodo['id'] = ft.get('id');
            moveObj.nodo['coords'] = coords;
            break;

          case 'arco':
            coords = ft.getGeometry().getCoordinates();

            // if map sr is different from edit layer sr -> trasform coordinates
            if ('EPSG:'+srid != this.editLayerProj)
            {
              for (let idx=0; idx<coords.length; idx++)
                coords[idx] = this.wgSvc.transformCoords(
                  coords[idx], 'EPSG:'+srid, this.editLayerProj
                );
            }

            let obj = {
              id: ft.get('cod_arco'),
              coords: coords,
              lunghezza: +ft.getGeometry().getLength().toFixed(2)
            };

            moveObj.archi.push(obj);
            break;

          default:
            console.error('feature attribute layer='+ft.get('layer')+" not managed!");
        }
      }

      let url = "/nodo/findNodoAtCoords?x="+moveObj.nodo['coords'][0]+"&y="+moveObj.nodo['coords'][1];

      this.httpReader.get(url).subscribe(
        res => {
          // manage returned error
          if (res['error'])
          {
            this.openModalMsg({
              title: "Errore",
              msg: "Si è verificato un errore durante l'acquisizione delle informazioni",
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
            });

            return;
          }

          var numOverlapNodi = res['result'].length;

          if (numOverlapNodi > 0)
          {
            moveObj['overlapNodes'] = res['result'];
          }
          
          // show modal to manage nodo (and linked arco) movement
          const modalRef = this.modalSvc.open(
            MoveNodoComponent,
            {backdrop:"static", keyboard:false, centered:true}
          );

          // set object to MoveNodoComponent
          modalRef.componentInstance.moveObj = moveObj;
        },
        err => {
          console.error(err);
          
          this.openModalMsg({
            title: "Errore",
            msg: "Si è verificato un errore durante l'acquisizione delle informazioni",
            size: "sm",
            style: "danger",
            buttons:[{
              id: 1,
              label: "Ok",
              callback: ret => {
                this.wgSvc.sendMessage('resetEdit', {});
                this.wgSvc.sendMessage('clearEdit', {});
              }
            }]
          });
        }
      );


      // show modal to manage nodo (and linked arco) movement
      /*const modalRef = this.modalSvc.open(
        MoveNodoComponent,
        {backdrop:"static", keyboard:false, centered:true}
      );

      // set object to MoveNodoComponent
      modalRef.componentInstance.moveObj = moveObj;*/
    }
    else  
      console.error("Error: wrong invocation of manageMoveNodo function!");
  }

  /*
   * Callback to manage insert of new edificio
   * in ftArray we have to receive only one item
   */
  private manageInsertEdificio(params:Object)
  {
    if (params && params['ftArray'] && params['ftArray'].length == 1)
    {
      // get geoJSON insert geometry
      let geomGeoJSON = params['geomJsonArray'][0];

      // convert polygon to multipolygon (layer edifici is multipolygon)
      if (geomGeoJSON['type'] == GeometryType.POLYGON)
      {
        geomGeoJSON['type'] = GeometryType.MULTI_POLYGON;
        geomGeoJSON['coordinates'] = [geomGeoJSON['coordinates']];
      }

      // retrieve inserted feature coords and map srid
      let srid   = this.wgSvc.getMapSrCode();

      // reset action
      this.selectedAction = null;
      this.edificioAction = null;
      this.enableEdificioExtraEdit = false;

      // Create new entity and set its attributes
      this.editEntity = new Edificio({}, 1);

      // if map sr is different from edit layer sr -> trasform coordinates
      if ('EPSG:'+srid != this.editLayerProj)
      {
        let numGeom = geomGeoJSON['coordinates'].length;

        for (let idx=0; idx<numGeom; idx++)
        {
          let geom = geomGeoJSON['coordinates'][idx];

          let numRing = geom.length;

          for (let jdx=0; jdx<numRing; jdx++)
          {
            let ring = geom[jdx];

            for (let kdx=0; kdx<ring.length; kdx++)
            {
              ring[kdx] = this.wgSvc.transformCoords(
                ring[kdx],
                'EPSG:'+srid,
                this.editLayerProj
              );
            }
          }
        }
      }

      this.editEntity.setExtraAttr('geoJSON', geomGeoJSON);

      // retrieve cadastral data
      let url = "/edificio/findCadastralData"

      this.httpReader.post(url, {geom:geomGeoJSON}).subscribe(
        res => {
          // manage returned error
          if (res['error'])
          {
            this.openModalMsg({
              title: "Errore",
              msg: "Non è stata individuata nessuna particella catastale in corrispondenza dell'edificio disegnato",
              size: "sm",
              style: "warning",
              buttons:[{
                id: 1,
                label: "Ok",
                callback: () => {
                  this.showEntityEvt.emit(this.editEntity);

                  this.wgSvc.sendMessage('resetEdit', {});
                }
              }]
            });
          }
          else
          {
            this.editEntity.mapChange = {
              cod_comune: res['result']['codice_comune'],
              foglio: res['result']['foglio']+'', // convert foglio to string
              numero: res['result']['numero'],
              sezione: res['result']['sezione']
            };

            // emit event to show right component on left sidebar
            this.showEntityEvt.emit(this.editEntity);

            this.wgSvc.sendMessage('resetEdit', {});
          }
        },
        err => {
          console.error(err);

          this.openModalMsg({
            title: "Errore",
            msg: "Si è verificato un errore durante l'acquisizione delle informazioni",
            size: "sm",
            style: "danger",
            buttons:[{
              id: 1,
              label: "Ok",
              callback: ret => {
                this.wgSvc.sendMessage('resetEdit', {});
                this.wgSvc.sendMessage('clearEdit', {});
              }
            }]
          });
        }
      );

    }
    else
      console.error("Error: wrong invocation of manageInsertEdificio function!");
  }

  /*
   * Callback to manage delete of edificio
   * in ftArray we have to receive only one item
   */
  private manageDeleteEdificio(params:Object)
  {
    if (params && params['ftArray'] && params['ftArray'].length == 1)
    {
      this.selectedAction = null;

      let feature = params['ftArray'][0];

      // set object that must be linked to the delete form
      let deleteObj = {
        id:  feature.get('id'),
        data_fine: null
      };

      // show modal to manage edificio delete
      const modalRef = this.modalSvc.open(
        DeleteEdificioComponent,
        {backdrop:"static", keyboard:false, centered:true}
      );

      // set object to DeleteEdificioComponent
      modalRef.componentInstance.deleteObj = deleteObj;
    }
    else
      console.error("Error: wrong invocation of manageDeleteEdificio function!");
  }

  /*
   * Callback to manage modify of edificio
   * in ftArray we have to receive only one item
   */
  private manageModifyEdificio(params:Object)
  {
    if (params && params['ftArray'] && params['ftArray'].length == 1)
    {
      // reset action
      this.selectedAction = null;
      this.edificioAction = null;
      this.enableEdificioExtraEdit = false;

      // get feature attributes
      let featureId   = params['ftArray'][0].get('id');
      // get modified geom
      let geomGeoJSON = params['geomJsonArray'][0];
      // get original geom
      let origGeomGeoJSON = params['origGeomJsonArray'][0];

      // convert polygon to multipolygon (layer edifici is multipolygon)
      if (geomGeoJSON['type'] == GeometryType.POLYGON)
      {
        geomGeoJSON['type'] = GeometryType.MULTI_POLYGON;
        geomGeoJSON['coordinates'] = [geomGeoJSON['coordinates']];

        if (origGeomGeoJSON)
        {
          origGeomGeoJSON['type'] = GeometryType.MULTI_POLYGON;
          origGeomGeoJSON['coordinates'] = [origGeomGeoJSON['coordinates']];
        }
      }

      // check if geometry has a hole
      //if (origGeomGeoJSON['coordinates'].length > 1)
      //  this.featureWithHoles = true;

      // retrieve map srid
      let srid   = this.wgSvc.getMapSrCode();
      
      // if map sr is different from edit layer sr -> trasform coordinates
      if ('EPSG:'+srid != this.editLayerProj)
      {
        this.transformGeomCoord(geomGeoJSON, srid, "POLYGON");

        if (origGeomGeoJSON)
          this.transformGeomCoord(origGeomGeoJSON, srid, "POLYGON");

        /*let numGeom = geomGeoJSON['coordinates'].length;

        for (let idx=0; idx<numGeom; idx++)
        {
          let geom = geomGeoJSON['coordinates'][idx];

          let numRing = geom.length;

          for (let jdx=0; jdx<numRing; jdx++)
          {
            let ring = geom[jdx];

            for (let kdx=0; kdx<ring.length; kdx++)
            {
              ring[kdx] = this.wgSvc.transformCoords(
                ring[kdx],
                'EPSG:'+srid,
                this.editLayerProj
              );
            }
          }
        }*/
      }

      // check if modify is a pure translation
      let translate = this.isTranslation(origGeomGeoJSON, geomGeoJSON, "POLYGON");

      this.editEntity = new Edificio({}, 2);

      // set id
      this.editEntity.setId(featureId);

      this.editEntity.setExtraAttr('geoJSON', geomGeoJSON);
      this.editEntity.setExtraAttr('translate', translate);

      // emit event to show right component on left sidebar
      this.showEntityEvt.emit(this.editEntity);

      this.wgSvc.sendMessage('resetEdit', {});
    }
    else
      console.error("Error: wrong invocation of manageModifyEdificio function!");
  }

  /*
   * Check topology of sketched arco:
   * - check on start and end vertex
   * - check if intermediate vertices lies on existing nodes/archi
   * - check if sketched arco crosses existing archi
   *
   */
  private checkSketchedArco(params:Object):Object
  {
    // retrieve archi and nodi in current map extent
    let sourceNodi  = this.wgSvc.getLayerObjByKey('nodo').getSource();
    let sourceArchi = this.wgSvc.getLayerObjByKey('arco').getSource();

    let currMapExtent = this.wgSvc.getMapCurrentExtent();

    let ftrNodi  = sourceNodi.getFeaturesInExtent(currMapExtent);
    let ftrArchi = sourceArchi.getFeaturesInExtent(currMapExtent);

    // object to return with check results
    let retObj = {
      vertices:[],
      chunks:  [],
    };

    // check vertices
    let coords = params['arco'].getGeometry().getCoordinates();

    // cycle on new arco vertices
    for (let idx=0; idx<coords.length; idx++)
    {
      let vertex      = coords[idx];
      let vertexPoint = point(vertex);

      let obj = {
        coords: coords[idx],
        overlap:false,
        nodo: null,
        arco: null,
        isNode: false
      };

      // check if vertices of new arco overlap existing nodes
      // cycle on nodes in current map extent
      for (let jdx=0; jdx<ftrNodi.length; jdx++)
      {
        let nodoCoords = ftrNodi[jdx].getGeometry().getCoordinates();
        let nodoPoint  = point(nodoCoords);

        if (booleanEqual(vertexPoint, nodoPoint))
        {
          obj.overlap = true;
          obj.nodo = ftrNodi[jdx].get('id');
          break;
        }
      }

      // check if vertices of new arco lies on existing archi
      for (let jdx=0; jdx<ftrArchi.length; jdx++)
      {
        let arcoCoords = ftrArchi[jdx].getGeometry().getCoordinates();

        // cycle on arco vertex
        for (let k=0; k<arcoCoords.length-1; k++)
        {
          // verify if given vertex lies on arco chunk between nodes k and k+1
          // (verify if vertex lies on line between nodes k and k+1)
          let cross =
            (vertex[0]-arcoCoords[k][0])*(arcoCoords[k+1][1]-arcoCoords[k][1]) -
            (vertex[1]-arcoCoords[k][1])*(arcoCoords[k+1][0]-arcoCoords[k][0]);

          // if given vertex lies on arco chunk cross is equal to 0 (less than the precision)
          if (Math.abs(cross) > 0.00000001)
            continue;

          // in this case vertex lies on arco chunk but overlaps with from node
          // so we exclude it
          if (k == 0 &&
              vertex[0] == arcoCoords[k][0] &&
              vertex[1] == arcoCoords[k][1])
            continue;

          // in this case vertex lies on arco chunk but overlaps with to node
          // so we exclude it
          if (k == arcoCoords.length-2 &&
              vertex[0] == arcoCoords[k+1][0] &&
              vertex[1] == arcoCoords[k+1][1])
            continue;

          // in this case the overlap is valid; 
          // we break to cycle on this arco and move on to the next one
          obj.overlap = true;
          obj.arco = ftrArchi[jdx].get('cod_arco');
          break;
        }
      }

      retObj.vertices.push(obj);
    }
    
    // check arco chunks
    for (let idx=0; idx<coords.length-1; idx++)
    {
      let startVertex = coords[idx];
      let endVertex   = coords[idx+1];

      let chunk = lineString([startVertex, endVertex]);

      let obj  = {
        cross:false,
        archi:[]
      };

      // check if sketched arco crosses existing archi
      for (let jdx=0; jdx<ftrArchi.length; jdx++)
      {
        let arco = lineString(ftrArchi[jdx].getGeometry().getCoordinates());

        if (!booleanDisjoint(chunk, arco))
        {
          let intersect = lineIntersect(chunk, arco);

          if (intersect && intersect.features[0])
          {
            let coords = intersect.features[0].geometry.coordinates;

            if (!booleanEqual(point(coords),point(startVertex)) &&
                !booleanEqual(point(coords),point(endVertex)))
            {
              obj.cross = true;
              obj.archi.push(ftrArchi[jdx].get('cod_arco'));
            }
          }
        }
      }

      retObj.chunks.push(obj);
    }

    return retObj;
  }

  /*
   * Transform given geometry (in geoJSON format) from map SRID to layer SRID 
   */
  private transformGeomCoord(geomGeoJSON, mapSRID, geomType):void
  {
    switch(geomType)
    {
      case "POINT":

        break;

      case "LINE":

        break;

      case "POLYGON":
        let numGeom = geomGeoJSON['coordinates'].length;

        for (let idx=0; idx<numGeom; idx++)
        {
          let geom = geomGeoJSON['coordinates'][idx];

          let numRing = geom.length;

          for (let jdx=0; jdx<numRing; jdx++)
          {
            let ring = geom[jdx];

            for (let kdx=0; kdx<ring.length; kdx++)
            {
              ring[kdx] = this.wgSvc.transformCoords(
                ring[kdx],
                'EPSG:'+mapSRID,
                this.editLayerProj
              );
            }
          }
        }
        break;
    }
  }

  /*
   * chek, given two geometries, if the second is obtained simpl by translating the first
   */
  private isTranslation(origGeom, modGeom, geomType):Object
  {
    let translateObj:object = {
      isTranslation:true
    };

    switch (geomType)
    {
      case "POINT":

        break;

      case "LINE":

        break;

      case "POLYGON":
        let numOrigGeom = origGeom['coordinates'].length;
        let numModGeom  = modGeom['coordinates'].length;

        if (numOrigGeom != numModGeom)
          translateObj['isTranslation'] = false;
        else
        {
          for (let idx=0; idx<numOrigGeom; idx++)
          {
            let origPart = origGeom['coordinates'][idx];

            let numOrigRing = origPart.length;

            if(numOrigRing != modGeom['coordinates'][idx].length)
            {
              translateObj['isTranslation'] = false;
              break;
            }
            else
            {
              for (let jdx=0; jdx<numOrigRing; jdx++)
              {
                let origRing = origPart[jdx];

                if (origRing.length != modGeom['coordinates'][idx][jdx].length)
                {
                  translateObj['isTranslation'] = false;
                  break;
                }
                else
                {
                  for (let kdx=0; kdx<origRing.length; kdx++)
                  {
                    let origPoint = origRing[kdx];
                    let modPoint  = modGeom['coordinates'][idx][jdx][kdx];

                    if (translateObj['deltaX'] && translateObj['deltaY'])
                    {
                      if((modPoint[0] - origPoint[0]) != translateObj['deltaX'] ||
                         (modPoint[1] - origPoint[1]) != translateObj['deltaY'])
                      {
                        translateObj['isTranslation'] = false;
                        translateObj['deltaX'] = null;
                        translateObj['deltaY'] = null;
                        break;
                      }
                    }
                    else
                    {
                      translateObj['deltaX'] = modPoint[0] - origPoint[0];
                      translateObj['deltaY'] = modPoint[1] - origPoint[1];
                    }
                  }
                }
              }
            }
          }
        }
        break;
    }

    return translateObj;
  }

}