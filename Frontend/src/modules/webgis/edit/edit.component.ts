import {Component,
        OnInit,
        EventEmitter,
        Output}         from '@angular/core';

import {Subscription}   from 'rxjs';

import Map              from 'ol/Map.js';

import Feature          from 'ol/Feature';

import GeoJSON          from 'ol/format/GeoJSON';

import Snap             from 'ol/interaction/Snap';
import Draw             from 'ol/interaction/Draw';
import Modify           from 'ol/interaction/Modify';
import Select           from 'ol/interaction/Select';
import UndoRedo         from 'ol-ext/interaction/UndoRedo'
import DrawRegular      from 'ol-ext/interaction/DrawRegular'
import DrawHole         from 'ol-ext/interaction/DrawHole'
import Transform        from 'ol-ext/interaction/Transform'

import Polygon          from 'ol/geom/Polygon';
import MultiPolygon     from 'ol/geom/MultiPolygon';

import Collection       from 'ol/Collection';

import {click,
        shiftKeyOnly}   from 'ol/events/condition.js';

import {WebgisService}  from '../webgis.service';

import {ServiceType,
        LayerTypology,
        GeometryType,
        DrawAddOn,
        DeleteMode,
        AddMode,
        AddSource,
        ModifyMode,
        QueryMode,
        EditStatus}     from '../webgis.util';

import {WGMapLayer}     from '../entity/wgmapLayer';

import {WGMap}          from '../entity/wgmap';


@Component({
  selector: 'webgis-edit',
  templateUrl: './edit.component.html',
  styleUrls: ['./edit.component.css']
})

export class EditComponent implements OnInit {

  // emit an event to comunicate with parent map component
  @Output() editEvent = new EventEmitter<object>();

  // edit layer array from webgis service to build editable layer combo
  editLayerArray:Array<Object>;

  editLayerKey:string = null;

  selectedMode:string = null;
  selectedTool:string = null;

  editModeHidden:boolean  = true;
  editToolsHidden:boolean = true;

  editEntityType:any = null;

  // flag indicating that there is a modification in progress
  activeModification:boolean = false;

  wgMap:WGMap;

  map:Map;

  // Identifier of edit layer (id and name)
  static readonly editLayerId   = 9999;
  static readonly editLayerName = '_EDIT_LAYER_';

  // support layer for edit operation
  editLayer:WGMapLayer;

  // map interactions to support edit functions
  snapInteractions:Array<Snap>; // we could have snap on different layers concurrently
  drawInteraction:Draw|DrawRegular;
  modifyInteraction:Modify;
  selectInteraction:Select;
  undoRedoInteraction:UndoRedo;
  drawHoleInteraction:DrawHole;
  transformInteraction:Transform;

  // feature format for reading and writing data in the GeoJSON format
  geoJSON = new GeoJSON();

  // collection of edited features (added, removed or modified)
  private editedFeatures:Collection;

  private originalFeatures:Collection;

  private doneEditCallback;

  private subscription:Subscription;

  private currStatus:EditStatus;

  constructor(private wgSvc:WebgisService)
  {
    // initialization
    this.snapInteractions = [];

    this.editLayerArray = [];
    this.editedFeatures   = new Collection();
    this.originalFeatures = new Collection();

    this.editModeHidden  = true;
    this.editToolsHidden = true;

    this.doneEditCallback = null;
  }

  ngOnInit()
  {
    let editStatusCfg:object;

    // subscribe component to manage webgis service messages
    this.subscription = this.wgSvc.observer.subscribe((obj) =>
    {
      if (obj && obj.key)
      {
        switch (obj.key)
        {
          case 'mapReady':
            // read array of editableLayers
            this.editLayerArray = this.wgSvc.getArray("editable");

            // get map configuration object
            this.wgMap = this.wgSvc.getMapCfgObj();

            // get map object
            this.map = this.wgSvc.mapComponent.map;
            break;

          // manage edit functions
          case 'edit':
            editStatusCfg = obj['val'];
            editStatusCfg['status'] = EditStatus.BEGIN_EDIT;
            this.editEntityType = editStatusCfg['params']['entityType'];
            this.manageEditStatus(editStatusCfg);
            break;

          case 'holeInteraction':
            this.manageHoleInteraction(obj['val']);
            break;

          case 'removeHoleInteraction':
            this.manageRemoveHoleInteraction(obj['val']);
            break;

          case 'transformInteraction':
            this.manageTransformInteraction(obj['val']);
            break;

          // edit interactions reset
          case 'resetEdit':
            this.resetEditInteractions();
            break;

          // remove edit layer
          case 'clearEdit':
            this.removeEditLayer();
            break;

          // set edit component behaviour
          case 'editStatus':
            this.manageEditStatus(obj['val']);
            break;

          // close edit operations
          // endMode can assume the following values:
          // - C interrupt edit operations
          // - D close edit operations with success
          // - E close edit operations with error
          case 'endEdit':
            editStatusCfg = obj['val'];
            editStatusCfg['endMode'] = editStatusCfg['status'];
            editStatusCfg['status']  = EditStatus.RESET;
            this.manageEditStatus(editStatusCfg);
            break;

          // callback to select features linked to the selected one
          case 'callbackToSelectLinkedFeatures':
            // array of linked features
            let ftArray = obj['val']['features'];
            // layer key of linked features
            let layerKey = obj['val']['layerKey'];

            // cycle to add linked features into edited and original features collection
            if (ftArray && ftArray.length > 0)
            {
              for (let idx=0; idx<ftArray.length; idx++)
              {
                let feature = ftArray[idx];
                // add property layer to discriminate feature belongs to different layers
                feature.set('layer', layerKey, true);

                this.editedFeatures.push(feature);
                
                // create new feature object to clone linked feature
                let featureCopy:Feature = new Feature({});

                // set properties to cloned features
                featureCopy.setGeometryName(feature.getGeometryName());
                featureCopy.setId(feature.getId());
                featureCopy.setProperties(feature.getProperties(), true);
                // we update geometry with a cloned value to obtain a deep copy
                // IMPORTANT: setGeometry must be invoked after setProperties
                //            because geometry is a properties
                featureCopy.setGeometry(feature.getGeometry().clone());

                featureCopy.set('layer', layerKey, true);
                this.originalFeatures.push(featureCopy)
              }
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
   * manage queryable layer combo onchange event
   */
  onChange($event)
  {
    if ($event)
    {
      let editLayerId = $event.id;

      let wgMapLayer = this.wgSvc.getLayerObjById(editLayerId);

      this.editLayerKey = wgMapLayer.key;

      // light on related layer
      this.wgSvc.setLayerVisibility(this.editLayerKey, true);
    }
    else
    {
      // in this case we have cleared value from combo -> reset all
      this.editLayerKey  = null;
    }

    // set right edit status
    this.manageEditStatus({
      status:EditStatus.INITIALIZE,
      layerKey:this.editLayerKey
    });
  }

  /*
   * enable an edit mode; type could be add/delete/modify
   */
  public wgEdit(type:string)
  {
    // edit configuration object
    let editCfg = {mode:type, params:{layerKey:this.editLayerKey}};

    // set right edit status
    this.manageEditStatus({
      status:EditStatus.BEGIN_EDIT,
      editCfg
    });
  }

  public showEditMode(show:boolean)
  {
    this.editModeHidden = !show;
  }

  public showEditTools(show:boolean)
  {
    this.editToolsHidden = !show;
  }

  public undo()
  {
    this.selectedTool = 'undo';

    this.undoRedoInteraction.undo();
  }

  public redo()
  {
    this.selectedTool = 'redo';

    this.undoRedoInteraction.redo();
  }

  public stopEdit()
  {
    // set right edit status
    this.manageEditStatus({status:EditStatus.STOP_EDIT});
  }

  /*
   *
   */
  public resetEditInteractions()
  {
    // remove editing support interactions
    this.snapInteractions.forEach( (item) => {
      this.map.removeInteraction(item);
    });
    this.map.removeInteraction(this.drawInteraction);
    this.map.removeInteraction(this.modifyInteraction);
    this.map.removeInteraction(this.selectInteraction);
    this.map.removeInteraction(this.undoRedoInteraction); // TODO there is a bug on plugin
    this.map.removeInteraction(this.drawHoleInteraction);
    this.map.removeInteraction(this.transformInteraction);

    // remove edited features and refresh related layer
    // only if there are edited features and we are in begin or initialize status
    if (this.editedFeatures.getLength() > 0 &&
        (this.currStatus == EditStatus.BEGIN_EDIT ||
         this.currStatus == EditStatus.INITIALIZE))
    {
      this.editedFeatures.clear();
      this.originalFeatures.clear();

      this.wgSvc.refreshLayer(this.editLayerKey);
    }

    // reset callback to call on end of edit operations
    this.doneEditCallback = null;
  }


  /*
   * Private functions
   */

  /*
   * Manage status of edit component
   */
  private manageEditStatus(statusCfg:object)
  {
    switch(statusCfg['status'])
    {
      case EditStatus.INITIALIZE:
        // set current status
        this.currStatus = EditStatus.INITIALIZE;

        // clear overlayLayer
        this.wgSvc.sendMessage('resetHighlight', {});

        // reset edit interactions
        this.resetEditInteractions();

        // remove edit layer
        this.removeEditLayer();

        // evaluate editLayerKey (if edit came from extern edit component)
        this.editLayerKey = statusCfg['layerKey'];

        // select if to we have to show edit mode commands (add, delete, ...)
        let showEditMode = this.editLayerKey ? true : false;
        this.showEditMode(showEditMode);

        // hide edit tools
        this.showEditTools(false);

        // reset mode and tools
        this.selectedMode = null;
        this.selectedTool = null;

        // enable default map click event
        this.editEvent.emit({edit:false});

        // disable map click on other queryable layer than editLayerKey
        this.wgSvc.sendMessage('activeQueryableLayer', {
          layerKey: this.editLayerKey,
          queryMode: QueryMode.POPUP
        });
        break;

      case EditStatus.BEGIN_EDIT:
        // set current status
        this.currStatus = EditStatus.BEGIN_EDIT;

        // clear overlayLayer
        this.wgSvc.sendMessage('resetHighlight', {});

        // reset edit interactions
        this.resetEditInteractions();

        // clear and remove edit layer
        this.removeEditLayer();

        this.selectedMode = statusCfg['mode'];
        this.doneEditCallback = statusCfg['params']['callback'];

        // activate selected edit mode
        switch(this.selectedMode)
        {
          case 'add':
            this.addFeature(statusCfg['params']);
            break;

          case 'delete':
            this.deleteFeature(statusCfg['params']);
            break;

          case 'modify':
            this.modifyFeature(statusCfg['params']);
            break;

          default:
            console.error("Error: edit with " + this.selectedMode + " mode not managed!");
        }

        this.showEditTools(true);
        break;

      case EditStatus.STOP_EDIT:
        // set current status
        this.currStatus = EditStatus.STOP_EDIT;

        this.activeModification = false;

        // invoke a callback (if it is defined) to manage edited objects
        if (this.doneEditCallback)
        {
          let geomOpt = {};

          if (this.editLayer)
          {
            let editLayerSource = this.editLayer.getSource();

            geomOpt['dataProjection'] = editLayerSource.getProjection();
          }

          let ftArray = this.editedFeatures.getArray();

          let geomJsonArray:Array<any> = [];
          
          // get geoJSON format of features geometry
          for (let idx=0; idx<ftArray.length; idx++)
          {
            let strGeomGeoJson = this.geoJSON.writeGeometry(
              ftArray[idx].getGeometry(),
              geomOpt
            );

            try
            {
              let geomGeoJson = JSON.parse(strGeomGeoJson);
              geomJsonArray.push(geomGeoJson);
            }
            catch(e)
            {
              console.error("Error on parse edited geometry feature");
            }
          }

          let doneObject:Object = {
            ftArray:this.editedFeatures.getArray(),
            geomJsonArray: geomJsonArray
          };

          // if original features array isn't empty, cycle on it to return
          // original geometry (in geoJSON format)
          if (this.originalFeatures && this.originalFeatures.getArray().length)
          {
            let origFtArray = this.originalFeatures.getArray();
            let origGeomJsonArray:Array<any> = [];

            for (let idx=0; idx<origFtArray.length; idx++)
            {
              let strOrigGeomGeoJson = this.geoJSON.writeGeometry(
                origFtArray[idx].getGeometry(),
                geomOpt
              );

              try
              {
                let origGeomGeoJson = JSON.parse(strOrigGeomGeoJson);
                origGeomJsonArray.push(origGeomGeoJson);
              }
              catch(e)
              {
                console.error("Error on parse original geometry feature");
              }
            }

            doneObject['origGeomJsonArray'] = origGeomJsonArray;
          }

          this.doneEditCallback(doneObject);
        }

        this.selectedTool = null;

        this.resetEditInteractions();

        // hide edit tools
        this.showEditTools(false);
        break;

      case EditStatus.RESET:
        // set current status
        this.currStatus = EditStatus.RESET;

        this.activeModification = false;

        // clear and remove edit layer
        this.removeEditLayer();

        // return to init status
        this.manageEditStatus({
          status: EditStatus.INITIALIZE,
          layerKey: this.editLayerKey
        });

        // if endEdit message contains entity (with map layer associated)
        // and there isn't an edit entity type or
        // edit entity type is different from entity received on endEdit message
        // we refresh layer associated to entity
        if (statusCfg['entity'] &&
            statusCfg['entity'].constructor.hasOwnProperty('getLayerKey') &&
            (!this.editEntityType ||
              this.editEntityType.getName() != statusCfg['entity'].constructor.getName()))
        {
          this.wgSvc.refreshLayer(statusCfg['entity'].constructor.getLayerKey());
        }

        // refresh additional layers (if presents)
        if (statusCfg['additionalLayerKeyToRefresh'] &&
            statusCfg['additionalLayerKeyToRefresh'].length)
        {
          for (let idx=0; idx<statusCfg['additionalLayerKeyToRefresh'].length; idx++)
          {
            this.wgSvc.refreshLayer(statusCfg['additionalLayerKeyToRefresh'][idx]);
          }
        }

        // if is defined an edit entity type -> we have to send a message to execute auxiliary operations
        // (refresh layers, ...)
        if (this.editEntityType)
        {
          this.wgSvc.sendMessage('finallyEdit', {
            entityType: this.editEntityType,
            status: statusCfg['endFlag']
          });

          this.editEntityType = null;
        }
        break;

      default:
        console.error("Error: edit status " + statusCfg['status'] + " not managed!");
    }
  }

  /*
   * Functon invoked to add feature on vector/geosjon layer
   * params is an object containing layerKey attribute and insert mode (single or multiple)
   * This method add a new vector layer used to insert new feature
   * new feature is returned with an observable
   */
  private addFeature(params:object)
  {
    if (params && params['layerKey'])
    {
      // retrieve layer
      let wgMapLayer = this.wgSvc.getLayerObjByKey(params['layerKey']);

      if (wgMapLayer.service == ServiceType.VECTOR ||
          wgMapLayer.service == ServiceType.GEOJSON)
      {
        // show edit tools bar
        this.showEditTools(true);

        // disable default map click event
        this.editEvent.emit({edit:true});

        this.addEditLayer(
          wgMapLayer.geometry_field['type'],
          wgMapLayer.projection,
          params
        );
      }
      else
        console.error("Invoked addFeature on " + wgMapLayer.service + " layer!");
    }
    else
      console.error("Invoked addFeature without params or layer name!");
  }

  /*
   * Functon invoked to add feature on vector/geosjon layer
   * params is an object containing layerKey attribute
   * This method add a select interaction on given layer to select feature to remove
   * feature to remove is returned with an observable
   */
  private deleteFeature(params:object)
  {
    if (params && params['layerKey'])
    {
      // retrieve layer
      let wgMapLayer = this.wgSvc.getLayerObjByKey(params['layerKey']);

      if (wgMapLayer.service == ServiceType.VECTOR ||
          wgMapLayer.service == ServiceType.GEOJSON)
      {
        // show edit tools bar
        this.showEditTools(true);

        // select interaction
        this.selectInteraction = new Select({
          filter: (feature, layer) => {
            let id = layer.get('id');
            let wgMapLayer = this.wgSvc.getLayerObjById(id);

            return (wgMapLayer.key == params['layerKey']) ? true : false;
          },
          condition: (event) => {
            // enable single or multiple selection (by shift key)
            return (params['mode'] == DeleteMode.MULTIPLE) ?
              click(event) && shiftKeyOnly(event) || click(event):
              click(event) && !shiftKeyOnly(event);
          },
          // enable single or multiple selection on overlapping features
          multi: (params['mode'] == DeleteMode.MULTIPLE) ? true : false
        });

        // disable default map click event
        this.editEvent.emit({edit:true});

        this.map.addInteraction(this.selectInteraction);

        // manage select event
        this.selectInteraction.on('select', (event) => {
            this.activeModification = event.selected.length > 0 ? true: false;

            // add feature selected (to delete) on edit features collection
            if (DeleteMode.SINGLE)
              this.editedFeatures = event.target.getFeatures();
            else
              this.editedFeatures.push(event.target.getFeatures());
          }
        );
      }
      else
        console.error("Invoked deleteFeature on " + wgMapLayer.service + " layer!");
    }
    else
      console.error("Invoked deleteFeature without params or layer name!");
  }

  /*
   *
   */
  private modifyFeature(params:object)
  {
    //let originalFeatures:Collection = new Collection();
    //this.originalFeatures = new Collection();

    if (params && params['layerKey'])
    {
      // retrieve layer
      let wgMapLayer = this.wgSvc.getLayerObjByKey(params['layerKey']);

      if (wgMapLayer.service == ServiceType.VECTOR ||
          wgMapLayer.service == ServiceType.GEOJSON)
      {
        // show edit tools bar
        this.showEditTools(true);

        // select interaction
        this.selectInteraction = new Select({
          filter: (feature, layer) => {
            if (!layer || !feature)
              return false;

            let id = layer.get('id');
            let wgMapLayer = this.wgSvc.getLayerObjById(id);

            return (wgMapLayer.key == params['layerKey']) ? true : false;
          },
          // configure single selection on overlapping features
          multi: false
        });

        // disable default map click event
        this.editEvent.emit({edit:true});

        this.map.addInteraction(this.selectInteraction);

        // manage select event
        this.selectInteraction.on('select', (event) => {

          // if there is a deselected feature, we have to restore previous conditions
          if (this.originalFeatures.getLength() > 0 &&
              event.deselected.length > 0)
          {
            // remove modified features
            for (let idx=0; idx<event.deselected.length; idx++)
            {
              let item = event.deselected[idx];
              let layerKey = item.get('layer');

              if (layerKey)
              {
                let lyr = this.wgSvc.getLayerObjByKey(layerKey);
                lyr.getSource().removeFeature(item);
              }
              //wgMapLayer.getSource().removeFeature(event.deselected[idx]);
            }

            // restore original features
            for (let idx=0; idx<this.originalFeatures.getLength(); idx++)
            {
              let item = this.originalFeatures.getArray()[idx];
              let layerKey = item.get('layer');

              if (layerKey)
              {
                let lyr = this.wgSvc.getLayerObjByKey(layerKey);
                lyr.getSource().addFeature(item);
              }
              //wgMapLayer.getSource().addFeature(this.originalFeatures.pop());
            }

            // clear collection
            this.originalFeatures.clear();
            
            this.activeModification = false;
          }

          //save original features
          for (let idx=0; idx<event.target.getFeatures().getLength(); idx++)
          {
            // feature selected
            let item:Feature = event.target.getFeatures().item(idx);
            item.set('layer', params['layerKey'], true);

            // create new feature object to clone feature selected
            let itemCopy:Feature = new Feature({});

            // set properties to cloned features
            itemCopy.setGeometryName(item.getGeometryName());
            itemCopy.setId(item.getId());
            itemCopy.setProperties(item.getProperties(), true);
            // we update geometry with a cloned value to obtain a deep copy
            // IMPORTANT: setGeometry must be invoked after setProperties
            //            because geometry is a properties
            itemCopy.setGeometry(item.getGeometry().clone());

            itemCopy.set('layer', params['layerKey'], true);
            this.originalFeatures.push(itemCopy)
          }

          if (params['callbackToSelectLinkedFeatures'])
          {
            this.editedFeatures = event.target.getFeatures();

            if (this.editedFeatures && this.editedFeatures.getLength()>0)
            {
              let fId = this.editedFeatures.getArray()[0].get('id');
              // execute configured callback; results are sent via sendMessage
              if (fId)
                params['callbackToSelectLinkedFeatures'](fId);
            }
          }
          else
          {
            if (params['returnOnSelect'])
            {
              //this.activeModification = true;
              // TODO: transform geometries of new features into its srs layer?
              // add feature selected (to modify) on edit features collection
              this.editedFeatures = event.target.getFeatures();

              this.activeModification = this.editedFeatures.getLength() > 0 ? true : false;
            }
          }

          // enable extra edit features (if presents)
          if (params['enableExtraEdit'])
          {
            let ftGeom = event.selected[0].getGeometry();
            let coords = ftGeom.getCoordinates();
            let featureWithHoles = false;

            switch (ftGeom.getType())
            {
              case GeometryType.POLYGON:
                featureWithHoles = coords.length > 1 ? true : false;
                break;
              
              case GeometryType.MULTI_POLYGON:
                featureWithHoles = coords[0].length > 1 ? true : false;
                break;
            }

            this.wgSvc.sendMessage(
              'enableExtraEdit',
              {editMode:'modify', featureWithHoles:featureWithHoles}
            );
          }
        });

        if (params['mode'] == null ||
            params['mode'] == ModifyMode.ATTR_GEOM ||
            params['mode'] == ModifyMode.ONLY_GEOM)
        {
          // modify interaction enabled only on selected features
          var modifyOpt = {
            features: this.selectInteraction.getFeatures()
          };

          // manage exclude params
          // (exclude from modify parts of feature)
          if (params['exclude'] && params['exclude'].length > 0)
          {
            // add 
            modifyOpt['condition'] = (event) =>
            {
              // get clicked coords
              let selCoords = event.coordinate;

              // get feature (belongs to modified layer) on clicked coords
              let f = this.modifyInteraction.getMap().getFeaturesAtPixel(
                event.pixel,
                {
                  hitTolerance:1,
                  layerFilter:(layer) => {
                    return layer.get('id') == wgMapLayer.layerOL.get('id');
                  }
                }
              );

              if (!f || !(f instanceof Array))
              {
                return false;
              }
              else
                f = f[0];

              // get feature coordinates array
              let fCoords = f.getGeometry().getCoordinates();

              // cycle on params['exclude'] to manage it
              for (let idx=0; idx<params['exclude'].length; idx++)
              {
                switch(params['exclude'][idx])
                {
                  // the ends (first and last point) are excluded from the modification 
                  case 'ends':
                    if ((fCoords[0][0] == selCoords[0] && fCoords[0][1] == selCoords[1])||
                        (fCoords[fCoords.length-1][0] == selCoords[0] && 
                         fCoords[fCoords.length-1][1] == selCoords[1]))
                    {
                      return false;
                    }
                    break;

                  default:
                    console.error("params exclude value " +
                      params['exclude'] + " not managed!");
                }
              }

              return true;
            }
          }

          // TODO: add style to configure modify
          /*if (params['layerStyle'])
          {
            modifyOpt['style'] = wgMapLayer.buildOLStyle(params['layerStyle']);
          }*/

          this.modifyInteraction = new Modify(modifyOpt);

          this.map.addInteraction(this.modifyInteraction);

          if (params['snapOnLayer'])
          {
            // cycle on snap layers array
            for (let idx=0; idx<params['snapOnLayer'].length; idx++)
            {
              let snapInteraction = new Snap({
                source: this.wgSvc.getLayerObjByKey(params['snapOnLayer'][idx]).getSource()
              });

              this.map.addInteraction(snapInteraction);

              this.snapInteractions.push(snapInteraction);
            }
          }

          // manage modifyend event
          this.modifyInteraction.on('modifyend', (event) =>
          {
            this.activeModification = true;
            // TODO: transform geometries of new features into its srs layer?
            // add feature modified on edit features collection (replace previous)
            this.editedFeatures = event.features;
          });
          

          // transform
          this.transformInteraction = new Transform({
            scale:true,
            rotate:true,
            translate:true,
            translateFeature:false,
            stretch:true
          });

          this.transformInteraction.setActive(false);
          this.map.addInteraction(this.transformInteraction);

          // draw hole
          this.drawHoleInteraction = new DrawHole({
            layers: [wgMapLayer.layerOL]
          });

          this.drawHoleInteraction.setActive(false);
          this.map.addInteraction(this.drawHoleInteraction);

          this.drawHoleInteraction.on('drawend', (event) =>
          {
            let ftGeom = event.feature.getGeometry();
            let coords = ftGeom.getCoordinates();
            let featureWithHoles = false;

            switch (ftGeom.getType())
            {
              case GeometryType.POLYGON:
                featureWithHoles = coords.length > 1 ? true : false;
                break;
              
              case GeometryType.MULTI_POLYGON:
                featureWithHoles = coords[0].length > 1 ? true : false;
                break;
            }

            if (featureWithHoles)
              this.wgSvc.sendMessage('featureWithHoles',{editMode:'modify'});

            /*if (ftGeom.getType() == GeometryType.POLYGON || ftGeom.getType() == GeometryType.MULTI_POLYGON)
            {
              let coords = ftGeom.getCoordinates();

              if (coords[0].length > 1)
                this.wgSvc.sendMessage('featureWithHoles',{editMode:'add'});
            }*/
          });
        }
        else // modify only attributes (not geometry)
        {
          // manage select event
          this.selectInteraction.on('select', (event) => {
            this.activeModification = true;
            // TODO: transform geoemtries of new features into its srs layer?
            // add feature selected (to modify) on edit features collection
            this.editedFeatures = event.target.getFeatures();
          });
        }

      }
    }
    else
      console.error("Invoked modifyFeature without params or layer name!");
  }

  /*
   *
   */
  private addEditLayer(geometryType:string, geometrySrs:string, params:object)
  {
    // calculate default map extent in current map SR to assign it to
    // editing layer (necessary to enable reprojection on this layer)
    let defaultEPSGCode = 'EPSG:' + this.wgMap.getDefaultSr().code
    //let currentEPSGCode = 'EPSG:' + this.wgSvc.getMapSrCode();

    let mapExtentProj = (defaultEPSGCode == geometrySrs) ?
      this.wgMap.getDefaultSr().mapExtent :
      this.wgSvc.transformExtent(
        this.wgMap.getDefaultSr().mapExtent,
        defaultEPSGCode,
        geometrySrs //currentEPSGCode
      );

    let editLayerCfg:Object = {
      id:              EditComponent.editLayerId,
      layer_name:      EditComponent.editLayerName,
      id_type:         LayerTypology.LAYER,
      opacity:         1,
      visible:         true,
      service:         ServiceType.VECTOR,
      projection:      geometrySrs, //currentEPSGCode,
      extent:          mapExtentProj,
      geometry_field:  {name:'geom', type:geometryType},
      support:         true,
      style:           params['layerStyle']
    };

    // build layer and add to the map
    this.wgSvc.manageLayer("I", {cfg: editLayerCfg, isBaseLayer: false});

    this.editLayer = this.wgSvc.getLayerObjById(EditComponent.editLayerId);

    /* add interactions to help edit */
    this.editedFeatures.clear();
    
    // retrieve possible draw add on configured
    let drawAddOn:Array<DrawAddOn> = params['drawAddOn'];

    // add right draw interaction based on received params
    if (drawAddOn && drawAddOn.indexOf(DrawAddOn.REGULAR_SHAPE) >= 0)
    {
      this.drawInteraction = new DrawRegular({
        features: this.editedFeatures,
        sides: 4,
        canRotate: false
      });
    }
    else
    {
      this.drawInteraction = new Draw({
        features: this.editedFeatures,
        type: geometryType,
        stopClick: true
      });
    }

    this.map.addInteraction(this.drawInteraction);

    // modify
    this.modifyInteraction = new Modify({
      source: this.editLayer.getSource()
    });

    this.map.addInteraction(this.modifyInteraction);
    

    // draw hole
    this.drawHoleInteraction = new DrawHole({
      layers: [this.editLayer.layerOL]
    });

    this.drawHoleInteraction.setActive(false);
    this.map.addInteraction(this.drawHoleInteraction);

    // transform
    this.transformInteraction = new Transform({
      scale:true,
      rotate:true,
      translate:true,
      translateFeature:false,
      stretch:true
    });

    this.transformInteraction.setActive(false);
    this.map.addInteraction(this.transformInteraction);

    // undo-redo
    this.undoRedoInteraction = new UndoRedo();
    this.map.addInteraction(this.undoRedoInteraction);

    // in this case we add new feature copying them from another layer
    if (params['source'] == AddSource.COPY)
    {
      // disable draw interaction
      this.drawInteraction.setActive(false);

      // create and add a select interaction
      this.selectInteraction = new Select({
        filter: (feature, layer) => {
          let id = layer.get('id');
          let wgMapLayer = this.wgSvc.getLayerObjById(id);

          return (wgMapLayer.key == params['layerKey']) ? true : false;
        },
        condition: (event) => {
          // enable single selection
          return click(event) && !shiftKeyOnly(event);
        },
        // enable single selection on overlapping features
        multi: false
      });

      this.map.addInteraction(this.selectInteraction);

      // manage select event
      this.selectInteraction.on('select', (event) => {
          // clone selected features
          let ft = event.selected[0];
          let clone = ft.clone();

          // add cloned features in edited collection
          this.editedFeatures.push(clone);

          // add cloned feature on edit layer
          this.editLayer.getSource().addFeature(clone);

          // clear and remove select interaction
          this.selectInteraction.getFeatures().clear();
          this.map.removeInteraction(this.selectInteraction);

          this.activeModification = true;
          
          // send message to enable extra edit
          this.wgSvc.sendMessage('enableExtraEdit', {editMode:'add', enable:'transform'});

          // add cloned feature to transform interaction
          this.transformInteraction.select(clone, true);
        }
      );
    }

    // snap
    // IMPORTANT: The snap interaction must be added after the Modify and Draw
    // interactions in order, for its map browser event handlers, to be fired first.
    // Its handlers are responsible of doing the snapping.
    if (params['snapOnLayer'])
    {
      // cycle on snap layers array
      for (let idx=0; idx<params['snapOnLayer'].length; idx++)
      {
        let snapInteraction = new Snap({
          source: this.wgSvc.getLayerObjByKey(params['snapOnLayer'][idx]).getSource()
        });

        this.map.addInteraction(snapInteraction);

        this.snapInteractions.push(snapInteraction);
      }
    }

    this.drawInteraction.on('drawstart', (event) =>
    {
      // send message to notify draw start
      this.wgSvc.sendMessage('drawstart', {});

      let mode:AddMode = params['mode'];

      switch (mode)
      {
        case AddMode.MULTIPLE:
          // you do not have to do anything
          break;

        case AddMode.SINGLE:
        default:
          // remove previous feature from edit layer source and from collection
          this.editLayer.getSource().clear(true);
          this.editedFeatures.clear();
          break;
      }
    });

    // manage drawend event
    this.drawInteraction.on('drawend', (event) =>
    {
      // send message to notify draw end
      this.wgSvc.sendMessage('drawend', {});

      this.activeModification = true;

      let mode:AddMode = params['mode'];

      switch (mode)
      {
        case AddMode.MULTIPLE:
          // you do not have to do anything
          break;

        case AddMode.SINGLE:
        default:
          // remove previous feature from edit layer source and from collection
          //this.editLayer.getSource().clear(true);
          //this.editedFeatures.clear();
          break;
      }

      // TODO: transform geometry of new feature into its srs layer?
      // add feature drawed on edit layer source
      this.editLayer.getSource().addFeature(event.feature);

      let ftGeom = event.feature.getGeometry();
      let coords = ftGeom.getCoordinates();

      if (ftGeom.getType() == GeometryType.POLYGON)
      {
        if (coords.length > 1)
          this.wgSvc.sendMessage('featureWithHoles',{editMode:'add'});
      }
      else if (ftGeom.getType() == GeometryType.MULTI_POLYGON)
      {
        // we are check only for holes in first part of multipolygon
        if (coords[0].length > 1)
          this.wgSvc.sendMessage('featureWithHoles',{editMode:'add'});
      }

      // enable extra edit features (if presents)
      if (params['enableExtraEdit'])
      {
        this.wgSvc.sendMessage('enableExtraEdit',{editMode:'add'});
      }
    });

    this.drawHoleInteraction.on('drawend', (event) =>
    {
      let ftGeom = event.feature.getGeometry();
      let coords = ftGeom.getCoordinates();
      let featureWithHoles = false;

      switch (ftGeom.getType())
      {
        case GeometryType.POLYGON:
          featureWithHoles = coords.length > 1 ? true : false;
          break;
        
        case GeometryType.MULTI_POLYGON:
          featureWithHoles = coords[0].length > 1 ? true : false;
          break;
      }

      if (featureWithHoles)
        this.wgSvc.sendMessage('featureWithHoles',{editMode:'add'});

      /*if (ftGeom.getType() == GeometryType.POLYGON || ftGeom.getType() == GeometryType.MULTI_POLYGON)
      {
        let coords = ftGeom.getCoordinates();

        if (coords[0].length > 1)
          this.wgSvc.sendMessage('featureWithHoles',{editMode:'add'});
      }*/
    });
  }

  /*
   * Remove and reset edit layer from map
   */
  private removeEditLayer()
  {
    if (this.editLayer)
    {
      // clear editLayer source
      this.editLayer.getSource().clear();

      // remove editLayer
      this.wgSvc.manageLayer("D", {id: EditComponent.editLayerId, isBaseLayer: false});

      this.editLayer = null;
    }
  }

  /*
   * manage hole interaction on polygon editing
   */
  private manageHoleInteraction(params:Object)
  {
    let editMode = params['mode'];
    let status   = params['status'];

    // discriminate between add and modify editing mode
    if (editMode == 'add')
    {
      if (this.editLayer && this.drawHoleInteraction)
      {
        // disable active interactions
        this.drawInteraction.setActive(!status);
        this.transformInteraction.setActive(!status);

        this.drawHoleInteraction.setActive(status);
      }
    }
    
    if (editMode == 'modify')
    {
      // disable active interactions
      this.selectInteraction.setActive(!status);
      this.transformInteraction.setActive(!status);

      this.drawHoleInteraction.setActive(status);
    }
  }

  /*
   * manage remove holes interaction on polygon editing
   */
  private manageRemoveHoleInteraction(params:Object)
  {
    let editMode = params['mode'];
    let status   = params['status'];

    if (editMode == 'add')
    {
      if (this.editLayer)
      {
        // disable active interactions
        this.drawInteraction.setActive(!status);
        this.drawHoleInteraction.setActive(!status);
        this.transformInteraction.setActive(!status);

        if(status)
        {
          // create and add a select interaction
          this.selectInteraction = new Select({
            filter: (feature, layer) => {
              //return (layer.get('id')== this.editLayer.id) ? true : false;

              // first condition is to remove hole from new edificio coming from copy edificio
              // second condition is to remove hole from new edificio (sketched)
              return (
                ((layer == null || layer.get('id') == this.editLayer.id) && feature.get('id') != null) || 
                ((layer == null || layer.get('id') == this.editLayer.id) && feature.get('id') == null)
              ) ? true : false;
            },
            condition: (event) => {
              // enable single selection
              return click(event) && !shiftKeyOnly(event);
            },
            // enable single selection on overlapping features
            multi: false
          });

          this.map.addInteraction(this.selectInteraction);

          // manage select event
          this.selectInteraction.on('select', (event) => {
              // selected features
              let ft = event.selected[0];

              let ftGeom = ft.getGeometry();
              let coords;

              switch(ftGeom.getType())
              {
                case GeometryType.POLYGON:
                  coords = ftGeom.getCoordinates();

                  if (coords.length > 1)
                    ft.setGeometry(new Polygon([coords[0]]));
                  break;

                case GeometryType.MULTI_POLYGON:
                  coords = ftGeom.getCoordinates();

                  // we are check only for holes in first part of multipolygon
                  if (coords[0].length > 1)
                    ft.setGeometry(new MultiPolygon([[coords[0][0]]]));
                  break;
              }

              this.map.removeInteraction(this.selectInteraction);
              this.drawInteraction.setActive(status);

              // send message to enable extra edit
              let drawMode = this.drawInteraction instanceof Draw ? 'normal': 'regular';
              this.wgSvc.sendMessage('removeHolesStop', {editMode:'add', drawMode:drawMode});
            }
          );
        }
      }
    }

    if (editMode == 'modify')
    {
      // disable active interactions
      this.selectInteraction.setActive(!status);
      this.drawHoleInteraction.setActive(!status);
      this.transformInteraction.setActive(!status);

      let layerKey = params['layerKey'];

      if(status)
      {
        // create and add a select interaction
        this.selectInteraction = new Select({
          filter: (feature, layer) => {
            let modLayer = this.wgSvc.getLayerObjByKey(layerKey).layerOL
            //return (layer.get('id')== modLayer.get('id')) ? true : false;

            // layer null => remove hole from modified existing edificio
            // layer.get('id')== modLayer.get('id') => remove hole from existing edificio
            return (layer == null || layer.get('id')== modLayer.get('id')) ? true : false;
          },
          condition: (event) => {
            // enable single selection
            return click(event) && !shiftKeyOnly(event);
          },
          // enable single selection on overlapping features
          multi: false
        });

        this.map.addInteraction(this.selectInteraction);

        // manage select event
        this.selectInteraction.on('select', (event) => {
            // selected features
            let ft = event.selected[0];

            let ftGeom = ft.getGeometry();
            let coords;

            switch(ftGeom.getType())
            {
              case GeometryType.POLYGON:
                coords = ftGeom.getCoordinates();

                if (coords.length > 1)
                  ft.setGeometry(new Polygon([coords[0]]));
                break;

              case GeometryType.MULTI_POLYGON:
                coords = ftGeom.getCoordinates();

                // we are check only for holes in first part of multipolygon
                if (coords[0].length > 1)
                  ft.setGeometry(new MultiPolygon([[coords[0][0]]]));
                break;
            }

            this.map.removeInteraction(this.selectInteraction);
            this.selectInteraction.setActive(!status);

            // send message to enable extra edit
            this.wgSvc.sendMessage('removeHolesStop', {editMode:'modify'});
          }
        );
      }
    }
  }

  /*
   * manage transform interaction on editing
   */
  private manageTransformInteraction(params:Object)
  {
    let editMode = params['mode'];
    let status   = params['status'];

    // discriminate between add and modify editing mode
    if (editMode == 'add')
    {
      if (this.editLayer && this.transformInteraction)
      {
        // disable active interactions
        this.drawInteraction.setActive(!status);
        this.drawHoleInteraction.setActive(!status);

        this.transformInteraction.setActive(status);
      }
    }
    
    if (editMode == 'modify')
    {
      // disable active interactions
      this.selectInteraction.setActive(!status);
      this.drawHoleInteraction.setActive(!status);

      this.transformInteraction.setActive(status);
    }
  }

}
