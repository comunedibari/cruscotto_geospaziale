
/*
 *
 */

import {HttpClient,
        HttpHeaders}           from '@angular/common/http';

import {Injectable}            from '@angular/core';
import {Observable}            from 'rxjs';
import {Subject}               from 'rxjs'

import {Map}                   from 'ol/Map.js';
import Point                   from 'ol/geom/Point';
import MultiPoint              from 'ol/geom/MultiPoint';
import Geometry                from 'ol/geom/Geometry';
import {transformExtent,
        transform,
        get as getProjection}  from 'ol/proj.js';
import {register}              from 'ol/proj/proj4.js';
import proj4                   from 'proj4';

import WMSCapabilities         from 'ol/format/WMSCapabilities';

import {unByKey}               from 'ol/Observable';

import {WGSr}                  from './entity/wgsr';
import {WGMap}                 from './entity/wgmap';
import {WGMapCategory}         from './entity/wgMapCategory';
import {WGMapLayer}            from './entity/wgmapLayer';

import {HttpReaderService}     from '../core/http-reader.service';
import {AuthService}           from '../core/auth.service';
import {ConfigService}         from '../core/config.service';
import {ModelService}          from '../core/model.service';

import {HilightMode,
        ServiceType,
        LayerTypology,
        GeometryType,
        getCoordNumDec,
        fromDDToDMS,
        SR,
        StyleFillPattern,
        StyleStrokePattern,
        StyleType,
        StyleGeomToRender,
        ShapeType}             from './webgis.util';

import {MapComponent}          from '../webgis/map/map.component'

import FillPattern             from 'ol-ext/style/FillPattern'
import StrokePattern           from 'ol-ext/style/StrokePattern'

import {Stroke,
        Fill,
        Circle,
        Text,
        Icon,
        RegularShape,
        Style}                 from 'ol/style.js';


@Injectable({
  providedIn: 'root'
})

export class WebgisService
{
  // user permissions object
  userPermObj: Object;

  // local mapserver url prefix
  private msPrefix: string;

  // local mapserver url
  private msURL: string;

  // map configuration object
  wgMap: WGMap;

  // current map reference system configuration object
  mapSR:WGSr;

  // base layers array
  baseLayers: Array<WGMapLayer>;

  // layers categories
  layersCategories: Array<WGMapCategory>;

  // layers array
  layers: Array<WGMapLayer>;

  // array with layer id and layer name of queryable map layers (WFS layers)
  private queryableLayer: Array<Object>;

  // array with layer id and layer name of editable map layers (WFS layers)
  private editableLayer: Array<Object>;

  // array with layer id and layer name of hoverable map layers (WFS layers)
  private hoverableLayer: Array<Object>;

  // array with layer id and layer name of searchable map layers (WFS layers)
  private searchableLayer: Array<Object>;

  // array that store initial layer order (no for base map)
  initialLayerIdOrder:Array<any>;

  // monitor resolution
  _screenDPI: number = 96;

  // inches for meter
  _IPM: number = 39.37;

  // Capabilities Print
  printCapabilities: Object = {};
  private loadedCapPrint: boolean = false;

  // observable message to manage component communication
  // (private Subject; we expose the generated flow through a public Observable)
  private message  = new Subject<any>();
  public  observer = this.message.asObservable();

  // userLayerStyle
  private dictUserLayerStyle = null;

  // map component instance
  mapComponent:MapComponent;

  constructor(private httpReader:HttpReaderService,
              private auth:AuthService,
              private http:HttpClient,
              private configSvc:ConfigService,
              private modelSvc: ModelService)
  {
    // initialization
    this.baseLayers       = [];
    this.layers           = [];
    this.layersCategories = [];
    this.queryableLayer   = [];
    this.editableLayer    = [];
    this.hoverableLayer   = [];
    this.searchableLayer   = [];

    // retrieve logged user permission
    // this object is used to load customized webgis config
    this.userPermObj =
    {
      permLayers:
        auth.permForModule('webgis')   ? auth.permForModule('webgis')   : [],
      permTools:
        auth.permForModule('gisTools') ? auth.permForModule('gisTools') : []
    };
  }

  /*
   * Method to emit new value on observable message
   * - key is an identifier to recognize messages
   * - object is message content
   */
  public sendMessage(key:string, object: Object)
  {
    this.message.next({key:key, val:object});
  }

  public getBaseLayers(): Array<WGMapLayer>
  {
    return this.baseLayers;
  }

  public getLayers(): Array<WGMapLayer>
  {
    return this.layers;
  }

  public getCategories(): Array<WGMapCategory>
  {
    return this.layersCategories;
  }

  /*
   * Load and return map configuration
   */
  public getWGConfiguration():Observable<WGMap>
  {
    // if configuration is already loaded, we return it
    if (this.wgMap)
    {
      return new Observable(observer => {
        observer.next(this.wgMap);
      });
    }

    // invoke url to retrieve webgis configuration
    return new Observable(observer =>
    {
      this.httpReader.post('/webgis/getConfig', this.userPermObj).subscribe
      (
        res => {
          // save webgis map and tools configuration in local variable
          this.wgMap = new WGMap(res['map']);

          //set current reference system to default value
          // (is necessary to layers with extent to reproject them)
          this.setMapSR(this.wgMap.getDefaultSr());

          // Cycle to sr to define projection other than 4326 and 3857 (with Proj4 lib)
          for(let idx=0; idx<this.wgMap.sr.length; idx++)
          {
            let sr:WGSr = this.wgMap.sr[idx];

            sr.proj = getProjection('EPSG:' + sr.code);

            if (sr.definition)
              proj4.defs('EPSG:' + sr.code, sr.definition);
          }

          // This function should be called whenever changes are made to the proj4 registry
          // (e.g. after calling proj4.defs())
          register(proj4);

          // save local map server prefix in private variable
          this.msPrefix = this.configSvc.urlPrefix.gs;

          // save local map server url in private variable
          this.msURL = res['map']['mapserver']['url'];

          if (this.auth.userInfo && this.auth.userInfo['id'])
          {
            let userId = this.auth.userInfo['id'];

            this.httpReader.post('/userLayerStyle/master?filter=user_id|EQ|'+ userId, this.userPermObj).subscribe
            (
              result=>{
                if (result['result'].length > 0)
                {
                  this.dictUserLayerStyle = {};
                  for (let i = 0; i < result['result'].length; i++)
                  {
                    let item = result['result'][i];
                    let layId = item['layer_id'];
                    this.dictUserLayerStyle[layId] = {
                      user: item['style'],
                      id: item['id']
                    };
                  }
                }

                // build layers and save in local variable
                this.buildLayers(res['layers']);

                // return
                observer.next(this.wgMap || null);
              },
              err =>
              {
                console.error('/userLayerStyle/master?filter=user_id|EQ|'+ userId);
                observer.next(null);
              }
            );
          }
        },
        err => {
          observer.next(null);
        }
      );
    });
  }

  /*
   * Load capabilities for print
   */
  loadCapabilitiesPrint(appName: string):Observable<boolean>
  {
    if (this.loadedCapPrint)
      return new Observable(observer => {observer.next(true);});

    let url = this.configSvc.urlPrefix.as + "/print/print/" + appName + "/capabilities.json";

    return new Observable(observer =>
    {
      // invoke print server capabilities url
      this.http.get(url).subscribe
      (
        res =>
        {
          if (!res)
          {
            //TODO error
            observer.next(false);
          }
          else
          {
            // from result json, read layouts
            this.printCapabilities = res;
            /* OK */
            this.loadedCapPrint = true;
            observer.next(true);
          }
        },
        err =>
        {
          console.error(err);
          observer.next(false);
        }
      );
    });
  }

  /*
   * Load logged user extent
   * From user info retrieve user authority id;
   * - if it is null (application without authentication) we return default values
   * - otherwise we retrieve extent related to given user
   */
  public getUserExtent():Observable<object>
  {
    let authId:number = null;
    let srCode:number = null;
    let bbox:Array<number> = this.wgMap.bbox;

    // find EPSG code of default reference system
    srCode = this.wgMap.getDefaultSr()['code'];

    // check if userInfo object is valorized; otherwise we passed null
    if (this.auth.userInfo)
    {
      if (this.auth.userInfo['authority_id'])
      {
        authId = this.auth.userInfo['authority_id'];
      }
      else if (this.auth.userInfo['role'] &&
        this.auth.userInfo['role'].length > 0 &&
        this.auth.userInfo['role'][0]['authority_id'])
      {
        authId = this.auth.userInfo['role'][0]['authority_id'];
      }
    }

    //if not authId (application without authentication) we return default values
    if (!authId)
    {
      return new Observable(observer => {
        observer.next({srCode:srCode, bbox: bbox});
      });
    }

    // retrieve extent related to given user
    var url = '/gisUtility/getUserExtent?authId=' + authId;

    this.httpReader.get(url).subscribe(res => {
      if (res['result'])
      {
        bbox = [
          res['result'][0]['x_min'],
          res['result'][0]['y_min'],
          res['result'][0]['x_max'],
          res['result'][0]['y_max']
        ];

        srCode  = res['result'][0]['srid'];
      }

      // return values related to logged user
      return new Observable(observer => {
        observer.next({srCode:srCode, bbox: bbox});
      });
    });
  }

  public getMapCurrentExtent()
  {
    return this.mapComponent.map.getView().calculateExtent(this.mapComponent.map.getSize());
  }

  getMapCfgObj():WGMap
  {
    return this.wgMap;
  }

  getMsPrefix():string
  {
    return this.msPrefix;
  }

  getMsURL():string
  {
    return this.msURL;
  }

  getMapBBox():Array<number>
  {
    return this.mapSR.mapExtent;
  }

  setMapSR(srObj:WGSr)
  {
    this.mapSR = srObj;
  }

  getMapSR():WGSr
  {
    return this.mapSR;
  }

  // return current map reference system EPSG code
  getMapSrCode():number
  {
    return this.mapSR.code;
  }

  getDefaultMapSrCode():number
  {
    return this.wgMap.getDefaultSr()['code'];
  }

  setLayerVisibility(layerKey:string, layerVisibility:boolean):void
  {
    let layer = this.getLayerObjByKey(layerKey);

    layer.setVisibility(layerVisibility);

    this.sendMessage('visibilityLayer',layer);
  }

  refreshLayer(layerKey:string):void
  {
    let layer = this.getLayerObjByKey(layerKey);

    if (layer.service == ServiceType.VECTOR ||
        layer.service == ServiceType.GEOJSON)
    {
      layer.getSource().clear(true);
      layer.getSource().refresh();
    }
  }

  // Retrieve base layer by its id
  getBaseLayerObjById(layerId:number):WGMapLayer
  {
    let bl = null;

    for(let idx=0; idx<this.baseLayers.length; idx++)
    {
      if (this.baseLayers[idx]['id'] == layerId)
      {
        bl = this.baseLayers[idx];
        break;
      }
    }

    return bl;
  }

  // Retrieve layer by its id
  getLayerObjById(layerId:number):WGMapLayer
  {
    let layer = null;

    for(let idx=0; idx<this.layers.length; idx++)
    {
      if (this.layers[idx]['id'] == layerId)
      {
        layer = this.layers[idx];
        break;
      }
      else if(this.layers[idx]['children'] && this.layers[idx]['children'].length > 0)
      {
        layer = this.getChildrenLayerObjById(this.layers[idx]['children'], layerId);

        if (layer)
          break;
      }
    }

    return layer;
  }

  // Retrieve ancestor by child id
  getAncestorByChild(layer):WGMapLayer
  {
    if (layer.id_parent)
    {
      let parent = this.getLayerObjById(layer.id_parent);

      if (parent.id_parent)
        return this.getAncestorByChild(parent);
      else
        return parent;
    }
    else
      return layer;
  }

  // Retrieve layer by its key attribute
  getLayerObjByKey(layerKey:string):WGMapLayer
  {
    let layer = null;

    for(let idx=0; idx<this.layers.length; idx++)
    {
      if (this.layers[idx]['key'] == layerKey)
      {
        layer = this.layers[idx];
        break;
      }
      else if(this.layers[idx]['children'] && this.layers[idx]['children'].length > 0)
      {
        layer = this.getChildrenLayerObjByKey(this.layers[idx]['children'], layerKey);

        if (layer)
          break;
      }
    }

    return layer;
  }

  getCoordinate(callback)
  {
    //change cursor
    let pointerMoveListenerKey = this.mapComponent.map.on('pointermove', (e)=>
    {
      this.mapComponent.map.getTargetElement().style.cursor = 'crosshair';
    });

    // Disable map click
//     this.mapComponent.setDefaultMapClickEnabled(false);

    // add event listener
    this.mapComponent.map.once('singleclick', (e)=>
    {
      e.preventDefault();

      // change cursor - remove listener
      unByKey(pointerMoveListenerKey);

      let numDec = getCoordNumDec(this.mapSR.units);
      let coordsArray = [];

      switch(this.mapSR.id)
      {
        case SR.WGS84DMS:
          coordsArray = [
            fromDDToDMS(e.coordinate[0]),
            fromDDToDMS(e.coordinate[1])
          ];
          break;

        default:
          coordsArray = [
            e.coordinate[0].toFixed(numDec)*1,
            e.coordinate[1].toFixed(numDec)*1
          ];
      }

      callback(coordsArray);
    });
  }

  /**
   * Method to zoom the map on given point or extent.
   * @param coordsArray is an array with 2 (point) or 4 (extent) number
   * @param srCode is the epsg code of given coordinates
   *
   */
  public zoomToBBox(coordsArray:Array<number>, srCode:number, callback?:Function):void
  {
    // error check
    if (!coordsArray || coordsArray.length == 0)
      return;

    let geom = (coordsArray.length == 2) ? new Point(coordsArray) : coordsArray;

    if (this.mapSR.code != srCode)
    {
      if (coordsArray.length == 4)
      {
        // transform bounding box in other SR used
        geom =  transformExtent(
          geom,
          'EPSG:' + srCode,
          'EPSG:' + this.mapSR.code
        );
      }
      else if (coordsArray.length == 2)
      {
        // transform point in other SR used
        geom =  transform(
          coordsArray,
          'EPSG:' + srCode,
          'EPSG:' + this.mapSR.code
        );

        // get point with transformed coordinate
        geom = new Point(geom);
      }
    }

    if (callback)
      this.mapComponent.view.fit(geom,{callback:callback});
    else
      this.mapComponent.view.fit(geom);
  }

  /*
   * Transform and return extent from different EPSG
   * fromEpsg and toEpsg ara in the format 'EPSG:XXXXX'
   * extent is [minx, miny, maxx, maxy]
   */
  public transformExtent(extent:Array<number>,fromEpsg:string,toEpsg:string)
  :Array<number>
  {
    if (fromEpsg == toEpsg)
      return extent;

    if (extent && extent.length == 4 &&
      fromEpsg.startsWith('EPSG:') && toEpsg.startsWith('EPSG:'))
    {
      return transformExtent(extent, fromEpsg, toEpsg);
    }

    console.error("Invoke transformExtent with wrong attributes!");
  }

  /*
   * Transform and return given geometry from different EPSG
   * fromEpsg and toEpsg ara in the format 'EPSG:XXXXX'
   */
  public transform(geom:Geometry, fromEpsg:string,toEpsg:string):Geometry
  {
    if (fromEpsg == toEpsg)
      return geom;

    return geom.transform(fromEpsg, toEpsg);
  }

  /*
   * Transform and return coordinate from different EPSG
   * fromEpsg and toEpsg are in the format 'EPSG:XXXXX'
   * coords is [x, y]
   */
  public transformCoords(coords:Array<number>,fromEpsg:string,toEpsg:string)
  :Array<number>
  {
    if (fromEpsg == toEpsg)
      return coords;

    if (coords && coords.length == 2 &&
      fromEpsg.startsWith('EPSG:') && toEpsg.startsWith('EPSG:'))
    {
      return transform(coords, fromEpsg, toEpsg);
    }

    console.error("Invoke transformCoords with wrong attributes!");
  }

  /*
   * parsing of getCapabilities response
   */
  public parseWMSCapabilities(capResponse:string):Object
  {
    try
    {
      let parser = new WMSCapabilities();

      return parser.read(capResponse);
    }
    catch (err)
    {
      console.error(err);
      return null;
    }
  }

  /*
   *
   */
  public showFeaturePopup(obj:Object)
  {
    // send new observable (map component is listening)
    this.sendMessage('showFeaturePopup', obj);
  }


  /*
   * Receive layer to add or remove into map and
   * insert or remove into related array
   */
  manageLayer(op: string,obj:Object)
  {
    let mapLayer = null;

    switch (op)
    {
      case 'I':
        // Create new WGMapLayer
        mapLayer = new WGMapLayer(this, obj['cfg'], obj['isBaseLayer']);

        if (mapLayer.isBaseLayer)
        {
          //Add layer into baseLayers array
          this.baseLayers.push(mapLayer);
          //Add layer to map
          this.mapComponent.map.addLayer(mapLayer.layerOL);
        }
        else
        {
          //Layer hasn't parent
          if (!mapLayer.id_parent)
          {
            //Add layer into layers array
            this.layers.push(mapLayer);
            let cat = this.getCategoryById(mapLayer.id_category);
            if (cat) cat.addLayer(mapLayer);

            //Add layer to map
            this.mapComponent.map.addLayer(mapLayer.layerOL);
          }
          else
          {
            //Add layer into parent's children array
            let parent = this.getLayerObjById(mapLayer.id_parent);
            if(parent)
            {
              parent.addChild(mapLayer);

              // Retrieve ancestor of layer
              let ancestor = this.getAncestorByChild(mapLayer);

              // Refresh ancestor on map
              ancestor.configure()

              // Refresh map
              let layersArr = this.mapComponent.map.getLayers().getArray();

              let layerIndex = -1;

              // cycle into map layers array to find ancestor
              for (let idx=0, len=layersArr.length; idx<len; idx++)
              {
                let item = layersArr[idx];

                let itemId = layersArr[idx].get('id');

                if (itemId == ancestor.layerOL.get('id'))
                  layerIndex = idx;

                // Set ancestor layer at just position into map
                if (layerIndex >= 0)
                {
                  this.mapComponent.map.getLayers().setAt(layerIndex, ancestor.layerOL);

                  break;
                }
              }
            }
          }
        }

        break;

      case 'U':
        // Retrieve WGMapLayer
        if (!obj['isBaseLayer'])
          mapLayer = this.getLayerObjById(obj['id']);
        else
          mapLayer = this.getBaseLayerObjById(obj['id']);

        if (mapLayer)
        {
          mapLayer.updateCfg(obj['cfg']);

          // Retrieve ancestor of layer
          let ancestor = this.getAncestorByChild(mapLayer);

          // If update affects the style set updateStyle TRUE therefore we don't retrieve layer to cache
          // when we rebuild vector layer
          if (obj['cfg']['style'])
          {
            // Update dictUserLayerStyle with new default style if it changed by config layer panel
            if (this.dictUserLayerStyle && this.dictUserLayerStyle.hasOwnProperty(mapLayer.id))
            {
              if (!obj['cfg']['style'].hasOwnProperty('user'))
                this.dictUserLayerStyle[mapLayer.id]['default'] = obj['cfg']['style'];
            }

            mapLayer.updateStyle = true;
            if (ancestor.id_type == LayerTypology.COMPOSED)
              ancestor.updateStyle = true;
          }

          // Find mapLayer into children layers array
          let childIndex = ancestor.children.indexOf(mapLayer);
          if (childIndex >= 0)
            ancestor.children[childIndex] = mapLayer;

          ancestor.configure();

          // Refresh map
          let layersArr = this.mapComponent.map.getLayers().getArray();

          let layerIndex = -1;

          // cycle into map layers array to find ancestor
          for (let idx=0, len=layersArr.length; idx<len; idx++)
          {
            let item = layersArr[idx];

            let itemId = layersArr[idx].get('id');

            if (itemId == ancestor.layerOL.get('id'))
              layerIndex = idx;

            // Set ancestor layer at just position into map
            if (layerIndex >= 0)
            {
              this.mapComponent.map.getLayers().setAt(layerIndex, ancestor.layerOL);

              break;
            }
          }
        }
        break;

      case 'D':
        // Retrieve WGMapLayer
        if (obj['isBaseLayer'])
        {
          mapLayer = this.getBaseLayerObjById(obj['id']);

          //Remove layer from baseLayers array
          let idx = this.baseLayers.indexOf(mapLayer);
          if (idx >= 0)
            this.baseLayers.splice(idx,1);

          //Remove layer from map
          this.mapComponent.map.removeLayer(mapLayer.layerOL);
        }
        else
        {
          mapLayer = this.getLayerObjById(obj['id']);

          if (mapLayer)
          {
            //Layer hasn't parent
            if (!mapLayer.id_parent)
            {
              //Remove layer from layers array
              let index = this.layers.indexOf(mapLayer);
              if (index >= 0)
                this.layers.splice(index,1);

              let cat = this.getCategoryById(mapLayer.id_category);
              if (cat) cat.delLayer(mapLayer);

              //Remove layer from map
              this.mapComponent.map.removeLayer(mapLayer.layerOL);
            }
            else
            {
              //Remove layer from parent's children array
              let parent = this.getLayerObjById(mapLayer.id_parent);
              if(parent)
              {
                parent.delChild(mapLayer);

                // Retrieve ancestor of layer
                let ancestor = this.getAncestorByChild(mapLayer);

                // Refresh ancestor
                ancestor.configure()

                // Refresh map
                let layersArr = this.mapComponent.map.getLayers().getArray();

                let layerIndex = -1;

                // cycle into map layers array to find ancestor
                for (let idx=0, len=layersArr.length; idx<len; idx++)
                {
                  let item = layersArr[idx];

                  let itemId = layersArr[idx].get('id');

                  if (itemId == ancestor.layerOL.get('id'))
                    layerIndex = idx;

                  // Set ancestor layer at just position into map
                  if (layerIndex >= 0)
                  {
                    this.mapComponent.map.getLayers().setAt(layerIndex, ancestor.layerOL);

                    break;
                  }
                }
              }
            }
          }
        }
        break;
    }

    this.sendMessage('changeLayer', null);
  }

  /*
   * Receive Category to add, update or remove into related array
   */
  manageCategory(op: string,obj:Object)
  {
    let category = null;

    switch (op)
    {
      case 'I':
        // Create new WGMapCategory
        category = new WGMapCategory(obj['cfg']);

        //Add category into categories array
        this.layersCategories.push(category);

        break;
      case 'U':
         // Retrieve WGMapCategory
        category = this.getCategoryById(obj['id']);

        if (category)
          category.update(obj['cfg']);

        break;
      case 'D':
        // Retrieve WGMapCategory
        category = this.getCategoryById(obj['id']);

        //Remove category from categories array
        let idx = this.layersCategories.indexOf(category);
        if (idx >= 0)
          this.layersCategories.splice(idx,1);

        break;
    }
  }

  /*
   * Change default base map
   */
  changeDefaultBL(newBaseLayerId, oldBaseLayerId)
  {
    let newBL = this.getBaseLayerObjById(newBaseLayerId),
        oldBL = this.getBaseLayerObjById(oldBaseLayerId);

    // light off previous default base layer
    oldBL.setVisibility(false);

    // light on new default base layer
    newBL.setVisibility(true);
  }

  getUserStyle(layerId: number): Object
  {
    return this.dictUserLayerStyle && this.dictUserLayerStyle.hasOwnProperty(layerId) ? this.dictUserLayerStyle[layerId]['user'] : null;
  }

  getDictStyles(layerId: number)
  {
    return this.dictUserLayerStyle && this.dictUserLayerStyle[layerId] ? this.dictUserLayerStyle[layerId] : null;
  }

  manageLayerUserStyle(layer: WGMapLayer, op:string, item: Object, callback:(res:any) => void)
  {
    switch(op)
    {
      case 'I':
        let style = Object.assign({}, layer.style.getConfig());

        let obj = {user_id: this.auth.userInfo['id'], layer_id:layer.id, style: item};

        // Set new attribute 'user' to define that it is changed by config user svn stat  style panel
        item['user'] = true;

        let urlI = '/userLayerStyle/insert';

        this.modelSvc.insert(urlI,obj).subscribe
        (
          res=>
          {
            if (res)
            {
              if (!this.dictUserLayerStyle)
                this.dictUserLayerStyle = {};

              this.dictUserLayerStyle[layer.id] = {
                user: item,
                default: style,
                id: res['id']
              };
              this.manageLayer('U',{id:layer.id, cfg:{style:item}});
              callback(null);
            }
            else
              callback("MESSAGE.INSERT_ERR");
          },
          err =>
          {
            callback("MESSAGE.INSERT_ERR");
          }
        );
        break;

      case 'U':
        if (this.dictUserLayerStyle && this.dictUserLayerStyle.hasOwnProperty(layer.id))
        {
          if (item['user'])
            delete item['user'];

          let obj = {style: item};

          let urlU = '/userLayerStyle/update/'+ this.dictUserLayerStyle[layer.id]['id'];

          this.modelSvc.update(urlU,obj).subscribe
          (
            res=>
            {
              if (res)
              {
                this.dictUserLayerStyle[layer.id]['user'] = item;
                this.manageLayer('U',{id:layer.id, cfg:{style:item}});
                callback(null);
              }
              else
                callback("MESSAGE.UPDATE_ERR");
            },
            err =>
            {
              callback("MESSAGE.UPDATE_ERR");
            }
          );
        }
        break;

      case 'D':
        if (this.dictUserLayerStyle && this.dictUserLayerStyle.hasOwnProperty(layer.id))
        {
          let urlD = '/userLayerStyle/delete/'+ this.dictUserLayerStyle[layer.id]['id'];
          this.modelSvc.delete(urlD).subscribe
          (
            res=>
            {
              if (res)
              {
                let defItem = this.dictUserLayerStyle[layer.id]['default'];
                delete this.dictUserLayerStyle[layer.id];
                this.manageLayer('U',{id:layer.id, cfg:{style:defItem}});
                callback(null);
              }
              else
                callback("MESSAGE.DELETE_ERR");
            },
            err =>
            {
              callback("MESSAGE.DELETE_ERR");
            }
          );
        }
        break;
    }
  }

  getArray(typeArray: string): Array<Object>
  {
    switch(typeArray)
    {
      case 'editable':
        return this.editableLayer;
        break;

      case 'queryable':
        return this.queryableLayer;
        break;

      case 'searchable':
        return this.searchableLayer;
        break;

      case 'hoverable':
        return this.hoverableLayer;
        break;
    }
  }

  /* Add or remove item into arrays editableLayer, searchableLayer, hoverableLayer
   * and queryableLayer
   */
  manageLayerArray(typeArray: string, op: string, item: object)
  {
    switch(typeArray)
    {
      case 'editable':
        // populate array of editable layers
        let indexEditable= -1;

        for (let i = 0; i < this.editableLayer.length; i++)
        {
          if (this.editableLayer[i]['id'] == item['id'])
          {
            indexEditable = i;
            break;
          }
        }

        if (op == 'I')
        {
          if (indexEditable < 0)
            this.editableLayer.push(item);
        }

        if (op == "D")
        {
          if (indexEditable > 0)
            this.editableLayer.splice(indexEditable,1);
        }
        break;

      case 'queryable':
        // populate array of queryable layers
        let indexQueryable= -1;

        for (let i = 0; i < this.queryableLayer.length; i++)
        {
          if (this.queryableLayer[i]['id'] == item['id'])
          {
            indexQueryable = i;
            break;
          }
        }

        if (op == 'I')
        {
          if (indexQueryable < 0)
            this.queryableLayer.push(item);
        }

        if (op == "D")
        {
          if (indexQueryable > 0)
            this.queryableLayer.splice(indexQueryable,1);
        }
        break;

      case 'searchable':
        // populate array of searchable layers
        let indexSearchable= -1;

        for (let i = 0; i < this.searchableLayer.length; i++)
        {
          if (this.searchableLayer[i]['id'] == item['id'])
          {
            indexSearchable = i;
            break;
          }
        }

        if (op == 'I')
        {
          if (indexSearchable < 0)
            this.searchableLayer.push(item);
        }

        if (op == "D")
        {
          if (indexSearchable > 0)
            this.searchableLayer.splice(indexSearchable,1);
        }

        this.sendMessage('changeSearchableLayer', this.searchableLayer);
        break;

      case 'hoverable':
        // populate array of hoverable layers
        let indexHoverable= -1;

        for (let i = 0; i < this.hoverableLayer.length; i++)
        {
          if (this.hoverableLayer[i]['id'] == item['id'])
          {
            indexHoverable = i;
            break;
          }
        }

        if (op == 'I')
        {
          if (indexHoverable < 0)
            this.hoverableLayer.push(item);
        }

        if (op == "D")
        {
          if (indexHoverable > 0)
            this.hoverableLayer.splice(indexHoverable,1);
        }

        break;
    }
  }

  /*
   * Direct Communication with map component
   */
  sendToMapComponent(key:string, params:object):any
  {
    // check if method exists on mapComponent
    if (this.mapComponent[key])
    {
      switch (key)
      {
        default:
          return this.mapComponent[key](params);
          break;
      }
    }
    else
      console.error("method " + key + " not managed by sendToMapComponent!");
  }

  /*
   * Communication with Observable with map component
   */
  sendToMapComponentWithObserver(key:string, params:object):Observable<object>
  {
    // check if method exists on mapComponent
    if (this.mapComponent[key])
    {
      switch (key)
      {
        default:

          return new Observable(observer => {
            // subscribe to mapCompnent method
            this.mapComponent[key](params).subscribe(res =>
            {
              observer.next(res);
            });
          });

          this.mapComponent[key](params);
          break;
      }
    }
    else
      console.error("method " + key + " not managed by sendToMapComponent!");
  }

  setMapComponent(obj:MapComponent)
  {
    this.mapComponent = obj;
  }

  getMapProjectionUnit()
  {
    if (this.mapComponent.view)
      return this.mapComponent.view.getProjection().getUnits();
    else
    {
      let epsgCode = this.getDefaultMapSrCode();
      // return unit for the given SR
      return getProjection('EPSG:' + epsgCode).getUnits();
    }
  }

  /*
   * hilight feature on layerKey
   * feature is specified by its attribute (name and value)
   * not mandatory params are bbox, hilight style and hilightMode (default mode are SINGLE)
   */
  hilightFeature(layerKey:string, ftAttrName:string, ftAttrVal:string|number,
    bbox?:Array<number>, hilightStyle?:object, hiligthMode?:HilightMode)
  {
    if (layerKey && ftAttrName && ftAttrVal)
    {
      this.sendToMapComponent('hilightFeature',{
        layerKey:layerKey,
        ftAttrName:ftAttrName,
        ftAttrVal:ftAttrVal,
        bbox:bbox,
        hilightStyle:hilightStyle,
        hilightMode:hiligthMode
      });
    }
    else
      console.error("Missing parameters to call hilightFeature method!");
  }

  /*
   *
   */
  public buildSimpleStyle(configStyle, feature?)
  {
    let attributeObj = {};
    let attributeClass = {};
    let simplyStyle = null;

    let type =  configStyle.type;
    let geomPart = configStyle.geometry;

    Object.keys(configStyle).forEach(function(key)
    {
      let value = configStyle[key];
      if (value)
      {
        switch(key)
        {
          case "id":
            switch(type)
            {
              case StyleType.LINE:
                switch(value)
                {
                  case StyleStrokePattern.DASH: // dash
                    // line Dash is array of floats describing the line lengths and space lengths
                    //  [4 * size, 4 * size]
                    if (attributeObj['stroke'] != undefined)
                      attributeObj['stroke']['lineDash'] =
                        [4*configStyle['size'],4*configStyle['size']];
                    else
                      attributeObj['stroke'] =
                        {'lineDash': [4 * configStyle['size'], 4 * configStyle['size']]};
                }
                break;
              case StyleType.POLYGON:
                switch(value)
                {
                  case StyleFillPattern.LINE_0:
                    attributeObj['fillPattern']  = {angle: 90, pattern:"hatch"};
                    break;
                  case StyleFillPattern.LINE_90:
                    attributeObj['fillPattern']  = {angle: 0, pattern:"hatch"};
                    break;
                  case StyleFillPattern.LINE_45:
                    attributeObj['fillPattern']  = {angle: 45, pattern:"hatch"};
                    break;
                  case StyleFillPattern.LINE_315:
                    attributeObj['fillPattern']  = {angle: 315, pattern:"hatch"};
                    break;
                  case StyleFillPattern.POINT:
                    attributeObj['fillPattern']  = {angle: 0, pattern:"dot"};
                    break;
                  case StyleFillPattern.SQUARE:
                    attributeObj['fillPattern']  = {angle: 0, pattern:"cross"};
                    break;
                  case StyleFillPattern.RHOMBUS:
                    attributeObj['fillPattern']  = {angle: 1, pattern:"cross"};
                    break;
                }
                break;
              case StyleType.SHAPE:
                switch(value)
                {
                  case ShapeType.CIRCLE:
                    attributeObj['points'] = "circle";
                    break;
                  case ShapeType.SQUARE:
                    attributeObj['points'] = 4;
                    break;
                  case ShapeType.TRIANGLE:
                    attributeObj['points'] = 3;
                    break;
                }
                break;
            }
            break;
          case 'color':
            switch(type)
            {
              case StyleType.LINE:

                if (attributeObj['stroke'] != undefined)
                  attributeObj['stroke']['color'] = value
                else
                  attributeObj['stroke'] = {'color':value};

                break;

              default:
                attributeObj['fill'] = {'color':value};
            }
            break;

          case 'size':
            switch(type)
            {
              case StyleType.LINE:

                if (attributeObj['stroke'] != undefined)
                  attributeObj['stroke']['width'] = value
                else
                  attributeObj['stroke'] = {'width':value};

                break;
              default:
                attributeObj['radius'] = Number(value);
            }
            break;

          case 'strokeColor':

            if (attributeObj['stroke'] != undefined)
              attributeObj['stroke']['color'] = value
            else
              attributeObj['stroke'] = {'color':value};

            break;

          case 'strokeWidth':

            if (attributeObj['stroke'] != undefined)
              attributeObj['stroke']['width'] = value
            else
              attributeObj['stroke'] = {'width':value};
            break;

          case 'text':
            //TODO To optimize with string template and for max 3 dynamic attributes

            // Retrieve attributes
            let aAttrName = configStyle.getDynamicAttribute();
            // Retrieve separators
            let aSep = configStyle.getSeparatorAttribute();

            let arrTextToDisplay = [];
            let textToDisplay = "";

            if (!aAttrName)
              attributeObj[key] = value;
            else
            {
              for (let i = 0; i < aAttrName.length; i++)
              {
                // retrieve attribute value
                // if feature is a cluster, the only usable properties is cluster size
                if (feature)
                {
                  if (feature.get('features'))
                    arrTextToDisplay[i] = feature.get('features').length;
                  else
                    arrTextToDisplay[i] = feature.getProperties()[aAttrName[i]];
                }

                // Concat separator TODO: optimize
                if (i != 0)
                {
                  // if arrTextToDisplay[i]) is null -> replace with ' ' string (to avoid null into label)
                  if (!arrTextToDisplay[i])
                    arrTextToDisplay[i] = '';
                  else
                    arrTextToDisplay[i] = aSep[i-1] + arrTextToDisplay[i];
                }
                else
                {
                  // if arrTextToDisplay[i]) is null -> replace with ' ' string (to avoid null into label)
                  if (!arrTextToDisplay[i])
                    arrTextToDisplay[i] = '';
                }

                textToDisplay = textToDisplay + arrTextToDisplay[i];
              }
              attributeObj[key] = textToDisplay;
            }

            break;

          case 'fontSize':
            attributeObj['font'] = value + "px sans-serif";
            break;

          case 'textBackColor':
            // hard coded width for text halo to 4
            attributeObj['stroke'] = {'color':value, 'width':4};
            break;

          case 'textColor':
            attributeObj['fill'] = {'color':value};
            break;

          default:
            attributeObj[key] = value;
        }
      }
    });

    /*
    * Convert object (attributeObj) who contains attributes,
    * in the corresponding costructor (attributeClass) of OL
    */
    for (let idx=0, len=Object.keys(attributeObj).length; idx<len; idx++)
    {
      let attributeKey = Object.keys(attributeObj)[idx];

      switch(attributeKey)
      {
        case 'fill':
        case 'textColor':

          if (!attributeClass['fill'])
            attributeClass['fill'] = new Fill(attributeObj['fill']);

          break;

        case 'stroke':
        case 'textBackColor':

          if (!attributeClass['stroke'])
            attributeClass['stroke'] = new Stroke(attributeObj['stroke']);

          break;

        case 'fillPattern':
          if (attributeObj['fill'] && attributeObj['fill']['color'])
          {
            attributeObj['fillPattern']['color'] = attributeObj['fill']['color'];

            if (attributeObj['size'])
              attributeObj['fillPattern']['size'] = attributeObj['size'];

            if (!attributeClass['fill'])
              attributeClass['fill'] = new FillPattern(attributeObj['fillPattern']);
          }

          break;

        case 'strokePattern':
          if (attributeObj['stroke'] && attributeObj['stroke']['color'])
          {
            attributeObj['strokePattern']['color'] = attributeObj['stroke']['color'];

            if (attributeObj['size'])
              attributeObj['strokePattern']['size'] = attributeObj['size'];

            if (!attributeClass['stroke'])
              attributeClass['stroke'] = new StrokePattern(attributeObj['strokePattern']);
          }

          break;
        default:
          attributeClass[attributeKey] = attributeObj[attributeKey];
      }
    }

    /*
    * Build style constructor for the type.
    * Depending on the type of style, build costructor style OL who has like
    * attributes (attributeClass)
    */
    switch(type)
    {
      case StyleType.LINE:
      case StyleType.POLYGON:
        simplyStyle = attributeClass;
        break;

      case StyleType.TEXT:
        if (feature && feature.getGeometry().getType() == 'LineString')
          attributeClass['placement'] = 'line';
        else
          attributeClass['textAlign'] = 'end';

        simplyStyle = {'text': new Text(attributeClass)};
        break;

      case StyleType.IMAGE:
        if (attributeClass['offsetX'] && attributeClass['offsetY'])
        {
          attributeClass['offset'] = [attributeClass['offsetX'],attributeClass['offsetY']];
          delete attributeClass['offsetX'];
          delete attributeClass['offsetY'];
        }
        simplyStyle = {'image': new Icon(attributeClass)};
        break;

      case StyleType.SHAPE:
        if (attributeClass['points'] == "circle")
        {
          delete attributeClass['points'];
          attributeClass['radius'] = attributeClass['radius'] / 2;
          simplyStyle = {'image': new Circle(attributeClass)};
        }
        else
        {
          if (attributeClass['points'] == 4) //SHAPETYPE.SQUARE
            attributeClass['angle'] = Math.PI / attributeClass['points'];

          simplyStyle = {'image': new RegularShape(attributeClass)};
        }
        break;
    }

    // check if attribute geometry is valued;
    // it serves to define the geometry to which the style in question is applied
    if (attributeClass['geometry'])
    {
      switch(geomPart)
      {
        case StyleGeomToRender.VERTEX:
          let f = function(feature) {
            let geom = feature.getGeometry();
            let coords = null;

            switch(geom.getType())
            {
              case 'LineString':
                coords = [];
                coords = geom.getCoordinates();
                break;

              case 'MultiLineString':
                coords = [];
                let lineStrings = geom.getLineStrings();

                for (let idx=0, len=lineStrings.length; idx<len; idx++)
                {
                  coords.push(lineStrings[idx].getFirstCoordinate());
                  coords.push(lineStrings[idx].getLastCoordinate());
                }
                break;

              case 'Polygon':
                coords = geom.getCoordinates();
                break;

              case 'MultiPolygon':
                coords = geom.getCoordinates()[0];
                break;

              default:
                console.error("Geometry type " + geom.getType() +
                  " not managed yet for vertex into style function!");
            }

            return new MultiPoint(coords);
          };

          simplyStyle['geometry'] = f;
        break;

        case StyleGeomToRender.CENTER:
          f = function(feature) {
            let geom = feature.getGeometry();
            let center = null;

            switch(geom.getType())
            {
              case 'LineString':
                center = new Point(geom.getCoordinateAt(0.5));
                break;

              case 'MultiLineString':
                let coords = [];
                let ls = geom.getLineStrings();
                for (let idx=0; idx<ls.length; idx++)
                  coords.push(ls[idx].getCoordinateAt(0.5))
                center = new MultiPoint(coords);
                break;

              case 'Polygon':
                center = geom.getInteriorPoint();
                break;

              case 'MultiPolygon':
                center = geom.getInteriorPoints();
                break;

              default:
                console.error("Geometry type " + geom.getType() +
                  " not managed yet for center into style function!");
            };

            return center;
          };

          simplyStyle['geometry'] = f;
        break;
      }
    }

    return simplyStyle;
  }

  /*
   *
   */
  public buildStyle(configStyle:Array<object>, feature?)
  {
    let stylesArr = [];

    for (let idx=0; idx<configStyle.length; idx++)
    {
      let cfgItem = configStyle[idx];

      let style = this.buildSimpleStyle(cfgItem, feature);

      if (style)
        stylesArr.push(new Style(style));
    }

    return stylesArr;
  }

  /* Private methods*/

  /*
   * Method to build layers
   */
  private buildLayers(layers:Object):void
  {
    // cicle on base layers
    for (let idx=0; idx<layers['base'].length; idx++)
    {
      let blCfg = layers['base'][idx];

      // create base layer and save into local variable
      this.baseLayers.push(new WGMapLayer(this, blCfg, true));
    }

    // create categories and save into local variable
    for(let idx=0; idx<layers['categories'].length; idx++)
    {
      let wgCat:WGMapCategory = new WGMapCategory(layers['categories'][idx]);

      this.layersCategories.push(wgCat);

      // cycle to create layers for current category and save into local variable
      let lyrCfgArr = layers['categories'][idx]['layers'];

      if (lyrCfgArr)
      {
        for (let jdx=0; jdx<lyrCfgArr.length; jdx++)
        {
          let lyrCfg = lyrCfgArr[jdx];

          let wgMapLayer = new WGMapLayer(this, lyrCfg, false);

          // add layer into category
          wgCat.addLayer(wgMapLayer);

          // push into local layer array
          this.layers.push(wgMapLayer);
        }
      }
    }
  }

  // Cycle on all children to retrieve layerObj by passing id
  private getChildrenLayerObjById(children, layerId:number):WGMapLayer
  {
    let lyr = null;

    for (let zdx=0; zdx<children.length; zdx++)
    {
      if(children[zdx]['id'] == layerId)
      {
        lyr =  children[zdx];
        break;
      }
      else if(children[zdx]['children'] && children[zdx]['children'].length > 0)
        lyr = this.getChildrenLayerObjById(children[zdx]['children'], layerId);

      if (lyr)
          break;
    }

    return lyr || null;
  }

  // Cycle on all children to retrieve layerObj by passing key attribute
  private getChildrenLayerObjByKey(children, layerKey:string):WGMapLayer
  {
    let lyr = null;

    for (let ydx=0; ydx<children.length; ydx++)
    {
      if(children[ydx]['key'] == layerKey)
      {
        lyr =  children[ydx];
        break;
      }
      else if(children[ydx]['children'] && children[ydx]['children'].length > 0)
        lyr = this.getChildrenLayerObjByKey(children[ydx]['children'], layerKey);

      if (lyr)
          break;
    }

    return lyr || null;
  }

  private getCategoryById(categoryId:number):WGMapCategory
  {
    let layer = null;

    for(let idx=0; idx<this.layersCategories.length; idx++)
    {
      if (this.layersCategories[idx].id == categoryId)
      {
        layer = this.layersCategories[idx];
        break;
      }
    }

    return layer;
  }

}
