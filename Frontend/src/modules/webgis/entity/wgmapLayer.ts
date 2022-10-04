/*
 *
 */

import {HttpClient,
        HttpHeaders}            from '@angular/common/http';

import Layer                    from 'ol/layer/Layer.js';
import TileLayer                from 'ol/layer/Tile.js';
import ImageLayer               from 'ol/layer/Image.js';
import LayerGroup               from 'ol/layer/Group.js';
import VectorLayer              from 'ol/layer/Vector.js';

import {Source,Cluster}         from 'ol/source.js';
import OSM                      from 'ol/source/OSM.js';
import XYZ                      from 'ol/source/XYZ.js';
import VectorSource             from 'ol/source/Vector.js';
import TileWMS                  from 'ol/source/TileWMS.js';
import ImageWMS                 from 'ol/source/ImageWMS.js';
import Static                   from 'ol/source/ImageStatic.js';

import WFS                      from 'ol/format/WFS.js';
import GeoJSON                  from 'ol/format/GeoJSON.js';
import And                      from 'ol/format/filter/And.js';
import Or                       from 'ol/format/filter/Or.js';
import EqualTo                  from 'ol/format/filter/EqualTo.js';
import NotEqualTo               from 'ol/format/filter/NotEqualTo.js';
import GreaterThanOrEqualTo     from 'ol/format/filter/GreaterThanOrEqualTo.js';
import GreaterThan              from 'ol/format/filter/GreaterThan.js';
import LessThanOrEqualTo        from 'ol/format/filter/LessThanOrEqualTo.js';
import LessThan                 from 'ol/format/filter/LessThan.js';
import IsLike                   from 'ol/format/filter/IsLike.js';
import IsNull                   from 'ol/format/filter/IsNull.js';
import Not                      from 'ol/format/filter/Not.js';

import Point                    from 'ol/geom/Point.js'
//import MultiPoint               from 'ol/geom/MultiPoint';

import {getCenter}              from 'ol/extent.js';

import {bbox as BBStrategy,
        all  as AllStrategy,
        tile as TileStrategy}   from 'ol/loadingstrategy.js';

import {get as getProjection,
        METERS_PER_UNIT,
        transformExtent}        from 'ol/proj.js';

import {Stroke,
        Fill,
        Circle,
        Text,
        Icon,
        RegularShape,
        Style}                  from 'ol/style.js';

import Legend                   from 'ol-ext/control/Legend'
//import FillPattern              from 'ol-ext/style/FillPattern'
//import StrokePattern              from 'ol-ext/style/StrokePattern'

import {WebgisService}          from '../webgis.service';
import {WGLayer}                from './wglayer';
import {WGStyle}                from './wgStyle';

import {ServiceType,
        LayerTypology,
        GeometryType,
        OutputFormat,
        StyleType,
        getCodeFromEpsgString}  from '../webgis.util';


export class WGMapLayer extends WGLayer
{
  type:string;


  layerOL:Layer = null;
  children: Array<WGMapLayer> = [];
  opacityPerc: number;
  completeUrl:string = null;
  visibility: boolean;
  disabled: boolean;
  selected: boolean;
  partialSelected: boolean;  // For layer tree: is true if at least one child item layer tree is not selected
  styleClass: string;        // Style of item layer tree
  wfsFilter: Object = null;

  // measure unit of layer srs
  measureUnit:string;

  // flag to check if it is support layer
  support: boolean = false;

  // flag to check if layer is queryable (click on the map)
  queryable:boolean = false;

  // flag to check if layer is editable
  editable:boolean = false

  // flag to check if layer respond to mouse hover
  hoverable:boolean = false

  // flag to check if layer is searchable
  searchable:boolean = false;

  // object that store attributes for hover, query and search functions
  objAttributes:Object;

  // default style for vector layers
  defaultLineStyle:WGStyle;
  defaultPointStyle:WGStyle;
  defaultPolygonStyle:WGStyle;
  defaultGeometryStyle:WGStyle;
  defaultClusterStyle:WGStyle;

  // styleTypeOL for vector layer (FIXED, PROPERTY, STYLE)
  styleTypeOL: string;

  // Object to cache created style
  cache: Object = {};

  // flag to define if during updateCfg the update affects the style
  updateStyle: boolean = false;

  // Icon: base64 image or url
  icon: any;

  // UserStyle
  userStyle:WGStyle;

  // constructor
  constructor(private wgSvc:WebgisService,
              private cfg:Object,
              public isBaseLayer: boolean
             )
  {
    super(cfg);

    this.styleClass = 'p-tree-item';

    if (this.service == ServiceType.VECTOR ||
        this.service == ServiceType.GEOJSON)
    {
      // setting default styles for vector layers
      this.defaultPointStyle = new WGStyle({
        type: 1,
        label: null,
        rules:[
          {
            name: null,
            op:null,
            conditions: null,
            symbol:{
              type: StyleType.SHAPE,
              id: 1,
              size: 8,
              color: "#ffa500ff"
            }
          }
        ]
      });

      this.defaultLineStyle = new WGStyle({
        type: 1,
        label: null,
        rules:[
          {
            name: null,
            op:null,
            conditions: null,
            symbol:{
              type: StyleType.LINE,
              color: "#ffa500ff",
              size: 3,
              id: 1
            },
          }
        ]
      });

      this.defaultPolygonStyle = new WGStyle({
        type: 1,
        label: null,
        rules:[
          {
            name: null,
            op:null,
            conditions: null,
            symbol:{
              type: StyleType.POLYGON,
              color: "#ffa500aa",
              id: 1,
              strokeColor: "#ffa500ff",
              strokeWidth: 1
            }
          }
        ]
      });

      this.defaultGeometryStyle = new WGStyle({
        type: 1,
        label: null,
        rules:[
          {
            name: null,
            op:null,
            conditions: null,
            symbol:{
              type: StyleType.LINE,
              color: "ffa500ff",
              size: 3,
              id: 1
            }
          },
          {
            name: null,
            op:null,
            conditions: null,
            symbol:{
              type: StyleType.POLYGON,
              color: "#ffa500aa",
              id: 1,
              strokeColor: "#ffa500ff",
              strokeWidth: 1
            }
          },
          {
            name: null,
            op:null,
            conditions: null,
            symbol:{
              type: StyleType.SHAPE,
              id: 1,
              size: 8,
              color: "#ffa500ff"
            }
          }
        ]
      });

      // setting default styles for cluster
      this.defaultClusterStyle = new WGStyle ({
        type: 1,
        label: {
          type: StyleType.TEXT,
          fontSize: "11",
          text: "${size}"
        },
        rules:[
          {
            name: null,
            op:null,
            conditions: null,
            symbol:{
              type: StyleType.SHAPE,
              id: 1,
              size: 24,
              color: "#00c0c0ff"
            }
          }
        ]
      });
    }

    if (cfg != null && Object.keys(cfg).length > 0)
      this.configure(cfg['layers']);

    // set flag support
    if (cfg['support'])
      this.support = cfg['support'];

    // set measure unit (read from layer projection)
    if (this.projection)
    {
      // remove 'EPSG:' prefix to obtain projection code
      let projCode = getCodeFromEpsgString(this.projection);

      if (projCode)
        this.measureUnit = this.wgSvc.getMapCfgObj().getSrByCode(projCode).units;
    }
  }

  /*
   * Public methods
   */
  updateCfg(cfg:object)
  {
    super.update(cfg);

    if (cfg['layers'])
      this.configure(cfg['layers']);
    else
      this.configure();
  }

  configure(layers?: Array<Object>)
  {
    this.queryable = false;
    this.hoverable = false;
    this.searchable = false;

    // if attributes is valued, we configure objAttributes object
    if (this.attributes)
    {
      this.objAttributes = {
        'query':  [],
        'hover':  [],
        'search': []
      };

      for (let idx=0; idx<this.attributes.length; idx++)
      {
        if (this.attributes[idx]['query'])
          this.objAttributes['query'].push(this.attributes[idx]);

        if (this.attributes[idx]['hover'])
          this.objAttributes['hover'].push(this.attributes[idx]);

        if (this.attributes[idx]['search'])
          this.objAttributes['search'].push(this.attributes[idx]);
      }

      if (this.objAttributes['query'].length > 0)
        this.queryable = true;

      if (this.objAttributes['hover'].length > 0)
        this.hoverable = true;

      if (this.objAttributes['search'].length > 0)
        this.searchable = true;
    }

    let op = null;
    // populate array of queryable layers
    op = this.queryable ? "I" : "D";
    this.wgSvc.manageLayerArray("queryable", op, {id:this.id, label:this.label});

    // populate array of editable layers
    op = this.editable ? "I" : "D";
    this.wgSvc.manageLayerArray("editable", op, {id:this.id, label:this.label});


    // populate array of hoverable layers
    op = this.hoverable ? "I" : "D";
    this.wgSvc.manageLayerArray("hoverable", op, {id:this.id, label:this.label});

    // populate array of searchable layers
    op = this.searchable ? "I" : "D";
    this.wgSvc.manageLayerArray("searchable", op, {id:this.id, label:this.label});

    this.selected = this.visible != undefined || this.visibility != undefined ?
      this.visible || this.visibility : false;
    this.opacityPerc = 0;

    if (this.isBaseLayer)
    {
      this.id_type = LayerTypology.LAYER;
      this.visibility = this._default ? this._default : false;
    }
    else
    {
      if (this.visibility == null || this.visibility == undefined)
        this.visibility = this.visible != undefined ? this.visible : false;

      //set default or user style
      if (this.wgSvc.getDictStyles(this.id))
      {
        let styles = this.wgSvc.getDictStyles(this.id);

        if (!styles['default'])
          styles['default'] = Object.assign({}, this.style.getConfig());

        this.style = new WGStyle(styles['user']);
      }

      // if layer has children
      if (layers && layers.length > 0)
      {
        this.children = [];

        for (let jdx=0, len=layers.length; jdx<len; jdx++)
        {
          let childLayer = new WGMapLayer(this.wgSvc, layers[jdx], false);

          this.children.push(childLayer);
        }
      }
    }

    // build openLayers layer object
    switch(this.id_type)
    {
      case LayerTypology.GROUP:
        // in this case source is created for each group item
        this.layerOL = this.buildGroupLayer();
        break;

      case LayerTypology.LAYER:
      case LayerTypology.COMPOSED:
      case LayerTypology.RASTER:
        if (this.service == ServiceType.VECTOR || this.service == ServiceType.GEOJSON)
          this.layerOL = this.buildVectorLayer();
        else
          this.layerOL = this.buildImageLayer();

        this.buildSource();
        break;

      //child of composed type
      case null:
        this.layerOL = null;
        break;

      default:
        console.error("Layer Type " + this.id_type + " not managed yet!");
    };

    if (this.layerOL)
      this.setCustomAttribute();

  }

  addChild(child: WGMapLayer)
  {
    this.children.push(child);

    this.configure();
  }

  delChild(child: WGMapLayer)
  {
    let index = this.children.indexOf(child);
    if (index >=0)
      this.children.splice(index,1);

    this.configure();
  }

  /*
   * Called before add layer to map and on change map resolution (zoom)
   * Single layers could have resolution restrictions (min_scale and max_scale),
   * then we have to adjust layers that must be shown
   */
  setResolution():void
  {

    let units = this.wgSvc.mapComponent.view.getProjection().getUnits();
    let MPU   = METERS_PER_UNIT[units];

    let resolutionMap = this.wgSvc.mapComponent.view.getResolution();

    // For composed layer, on change resolution, if there are changes,
    // we have to update and recall layer source
    if (this.id_type == LayerTypology.LAYER)
    {
      let minResolution = 0;
      let maxResolution = Infinity;

      if (this.min_scale != null)
      {
        minResolution = this.min_scale / (MPU * this.wgSvc._screenDPI * this.wgSvc._IPM);
        this.layerOL.setMinResolution(minResolution);
      }

      if (this.max_scale != null)
      {
        // add 50 so that layer is already visible at maxscale
        maxResolution = (this.max_scale + 50) / (MPU * this.wgSvc._screenDPI * this.wgSvc._IPM);
        this.layerOL.setMaxResolution(maxResolution);
      }

      this.disabled = false;

      if (minResolution > resolutionMap || maxResolution < resolutionMap)
        this.disabled = true;
    }
    else if (this.id_type == LayerTypology.COMPOSED)
    {
      // IMAGE layer -> we have to update attribute LAYERS of source WMS params
      if (this.service == ServiceType.WMS)
      {
        let strListLayers = '';
        let source = this.getSource();
        let params = source.getParams();

        // cicle on composed layer items
        for (let idx=0, len=this.children.length; idx<len; idx++)
        {
          let minResolution = 0;
          let maxResolution = Infinity;

          let item = this.children[idx];
          item.disabled = true;

          if (item.min_scale != undefined)
            minResolution = item.min_scale / (MPU * this.wgSvc._screenDPI *
              this.wgSvc._IPM);

          if (item.max_scale != undefined)
            // add 50 so that layer is already visible at maxscale
            maxResolution = (item.max_scale + 50) / (MPU * this.wgSvc._screenDPI *
              this.wgSvc._IPM);

          // item is visible
          if (minResolution <= resolutionMap && maxResolution >= resolutionMap)
          {
            item.disabled = false;
          }

          if (item.visibility && !item.disabled)
          {
            strListLayers += (item.layer_name + ',');
          }

          item.styleClass = item.disabled ? 'p-tree-item-disabled' : 'p-tree-item';
        }

        // if strListLayers isn't empty then turn on the visibility of layerOL
        // else turn off
        if (strListLayers != '')
        {
          strListLayers = strListLayers.substring(0, strListLayers.length-1);
          this.manageComposedLayerVisibility(true);
        }
        else
          this.manageComposedLayerVisibility(false);


        // we update source only if LAYERS atytribute it is different from old one
        if (params.LAYERS != strListLayers)
        {
          params.LAYERS = strListLayers;
          params.STYLES = this.buildListStyles(strListLayers);
          source.updateParams(params);
        }
      }
      else if (this.service == ServiceType.IMAGE_STATIC)
      {
        //TODO
      }
      // VECTOR layer -> we have to update filter on VECTOR source
      else
      {
        let filter = false;

        // cicle on composed layer items
        for (let idx=0, len=this.children.length; idx<len; idx++)
        {
          let minResolution = 0;
          let maxResolution = Infinity;

          let item =  this.children[idx];
          item.disabled = true;

          if (item.min_scale != undefined)
            minResolution = item.min_scale / (MPU * this.wgSvc._screenDPI *
              this.wgSvc._IPM);

          if (item.max_scale != undefined)
            // add 50 so that layer is already visible at maxscale
            maxResolution = (item.max_scale + 50) / (MPU * this.wgSvc._screenDPI *
              this.wgSvc._IPM);

          // item is visible
          if (minResolution <= resolutionMap && maxResolution >= resolutionMap)
          {
            item.disabled = false;
          }

          if (item.visibility && !item.disabled)
            filter = true;

          item.styleClass = item.disabled ? 'p-tree-item-disabled' : 'p-tree-item';
        }

        // if filter is true then turn on the visibility of layerOL
        // else turn off
        if (filter)
          this.manageComposedLayerVisibility(true);
        else
          this.manageComposedLayerVisibility(false);
      }
    }
    else if (this.id_type == LayerTypology.GROUP)
    {
      let groupDisabled = true;

       // cicle on group layer items
      for (let idx=0, len=this.children.length; idx<len; idx++)
      {
        let minResolution = 0;
        let maxResolution = Infinity;

        let groupItemDisabled = false;

        let groupItem = this.children[idx];

        if (groupItem.min_scale != undefined)
        {
          minResolution = groupItem.min_scale / (MPU * this.wgSvc._screenDPI * this.wgSvc._IPM);
          groupItem.layerOL.setMinResolution(minResolution);
        }

        if (groupItem.max_scale != undefined)
        {
          // add 50 so that layer is already visible at maxscale
          maxResolution = (groupItem.max_scale + 50) / (MPU * this.wgSvc._screenDPI * this.wgSvc._IPM);
          groupItem.layerOL.setMaxResolution(maxResolution);
        }

        if (minResolution > resolutionMap || maxResolution < resolutionMap)
          groupItemDisabled = true;

        groupItem.disabled = groupItemDisabled;

        // valorize disable flag for group
        groupDisabled = groupDisabled && groupItemDisabled;

        // invoke recursively this function for group items
        // (if layerType of item is GROUP_ITEM this invocation is unnecessary)
        groupItem.setResolution();
      }

      // set disabled on group
      this.disabled = groupDisabled;

    }

    this.styleClass = this.disabled ? 'p-tree-item-disabled' : 'p-tree-item';
  }

  getSource()
  {
    return this.cluster ? this.layerOL.getSource().getSource() : this.layerOL.getSource();
  }

  getOpacity(): number
  {
    return this.layerOL.getOpacity();
  }

  setOpacity(value: number): void
  {
    this.layerOL.setOpacity(value);
  }

  setVisibility(value: boolean): void
  {
    this.selected = value;
    this.visibility = value;

    // update layer visibility
    if (this.layerOL)
    {
      this.layerOL.setVisible(value);
    }

    // if layer have children -> manage their visibility
    if (this.children && this.children.length > 0)
    {
      this.manageChildrenVisibility(value);
    }

    // if layer have a parent -> manage its visibility
    if (this.id_parent)
    {
      this.manageParentVisibility(value);
    }
  }

   public buildFilter (filterObj)
  {
    let filter     = null;
    let filterItem = null;
    let value      = null;

    // manage property val data type
    switch(filterObj.property_type)
    {
      case 'date':
        value = new Date(filterObj.property_val*1).toDateString();
        break;

      case 'datetime':
        var hours = new Date(filterObj.property_val*1).toTimeString();

        // if datetime has time set to 0 --> it is a date
        if (hours.indexOf('00:00:00') >= 0)
        {
          value = new Date(filterObj.property_val*1).toDateString();
        }
        else
        {
          value = new Date(filterObj.property_val*1).toUTCString();
        }
        break;

      default:
        value = filterObj.property_val;
    }

    switch(filterObj.operator)
    {
      case "EQ":
        filter = new EqualTo(
          filterObj.property_name,
          value,
          false  // set true if case sensitive
        );
        break;

      case "NE":
        filter = new NotEqualTo(
          filterObj.property_name,
          value,
          false  // set true if case sensitive
        );
        break;

      case "LT":
        filter = new LessThan(
          filterObj.property_name,
          value
        );
        break;

      case "LE":
        filter = new LessThanOrEqualTo(
          filterObj.property_name,
          value
        );
        break;

      case "GT":
        filter = new GreaterThan(
          filterObj.property_name,
          value
        );
        break;

      case "GE":
        filter = new GreaterThanOrEqualTo(
          filterObj.property_name,
          value
        );
        break;

      case "ILIKE":
        filter = new IsLike(
          filterObj.property_name,
          "%" + filterObj.property_val + "%",
          "*",  // wildcard
          ".",  // single char
          "!",  // escape char
          false //set true if case sensitive
        );
        break;

      case "IS_NULL":
        filter = new IsNull(filterObj.property_name);
        break;

      case "IS_NOT":
        filter = new Not(
          new IsNull(filterObj.property_name)
        );
        break;

      default:
        console.error("filter operator " + filterObj.operator + " not managed yet!");
    };

    return filter;
  }

  /*
   * Build filter on vector layer
   */
  public buildWFSLayerFilter(filterCondArray, operator)
  {
    if (filterCondArray.length == 0)
      return null;

    // the condition of a vector composed layer are in OR between them
    function createFilter(filterArr, index, operator)
    {
      // only one item -> return a filter
      if (index === filterArr.length - 1)
          return filterArr[index];

      // more than 1 item -> call recursively the function
      switch (operator)
      {
        case "OR":
          return new Or(
            filterArr[index],
            createFilter(filterArr, index + 1, operator)
          );
          break;

        case "AND":
          return new And(
            filterArr[index],
            createFilter(filterArr, index + 1, operator)
          );
          break;
      }
    }

    let filterObj = createFilter(filterCondArray, 0, operator);

    return filterObj;
  }

  /*
   * Return geometry type
   */
  public getGeomType():string
  {
    if (this.geometry_field)
      return this.geometry_field.type;

    if (this.id_type == null && this.id_parent)
    {
      let parent = this.wgSvc.getLayerObjById(this.id_parent);

      if (parent && parent.service == "WFS" && parent.geometry_field)
        return parent.geometry_field.type;
    }

    return null;
  }

  /*public buildOLStyle(styleCfg:object)
  {
    let labelStyle;

    if (styleCfg && styleCfg['label'])
      labelStyle = styleCfg['label'];

    if (styleCfg['rules'])
    {
      for (let j=0; j < styleCfg['rules'].length; j++)
      {
        // create array of styles (symbol and label)
        styleCfg['rules'][j]['styles'] = [];
        styleCfg['rules'][j]['styles'].push(styleCfg['rules'][j].symbol);
        if (labelStyle)
          styleCfg['rules'][j]['styles'].push(labelStyle);
      }
    }

    return this.buildStyle(styleCfg['rules'], null, null);
  }*/

  /*
   * Private Method
   */
   /*
   * Manage visibility on layer's children
   */
  private manageChildrenVisibility(layerVisibility)
  {
    // cycle on all children to make them visible and selected
    for (let idx=0, len=this.children.length; idx<len; idx++)
    {
      let item: WGMapLayer = this.children[idx];

      item.selected = layerVisibility;
      item.visibility = layerVisibility;

      // update layer visibility
      // (for COMPOSED_LAYER we have to adjust
      //  layers list (IMAGE) or filter (VECTOR))
      if (this.id_type == LayerTypology.COMPOSED)
        this.manageComposedLayerVisibility(layerVisibility);
      else if (item.layerOL) //TODO optimize
        item.layerOL.setVisible(layerVisibility);

      // if children have children -> call recursively this function)
      if (item.children &&  item.children.length > 0)
        item.manageChildrenVisibility(layerVisibility);
    }
  }

  /*
   * Manage visibility on layer's parent
   */
  private manageParentVisibility(layerVisibility)
  {
    // retrieve parent layer configuration
    let parent: WGMapLayer = this.wgSvc.getLayerObjById(this.id_parent);

    // check for 'brother' of given layer
    // if layer is only child -> we have to do nothing
    // otherwise we have to check other brother visibility
    if (parent.children &&  parent.children.length > 1)
    {
      let allBrotherSelected = true;
      let allBrotherVisible  = false;

      // parent check is selected only if all children check are selected
      // parent layer is visible if at least one child layer is visible
      for (let idx=0, len=parent.children.length; idx<len; idx++)
      {
        let brother: WGMapLayer = parent.children[idx];

        allBrotherSelected = allBrotherSelected && brother.selected;
        allBrotherVisible  = allBrotherVisible || brother.visibility;
      }

      parent.selected = allBrotherSelected;
      parent.visibility  = allBrotherVisible;
    }
    else // parent has only one child
    {
      let child: WGMapLayer  = parent.children[0];

      parent.selected = child.selected ? true : false;
      parent.visibility  = child.visibility  ? true : false;
    }

    // update layer visibility
    // (for COMPOSED_LAYER_ITEM we have to adjust
    //  parent layers list (IMAGE) or parent filter (VECTOR))
    if (parent.id_type == LayerTypology.COMPOSED)
      parent.manageComposedLayerVisibility(layerVisibility);
    else if (parent.layerOL) //TODO optimize
      parent.layerOL.setVisible(parent.visibility);

    // if parent have a parent -> call recursively this function
    if (parent.id_parent)
      parent.manageParentVisibility(layerVisibility);
  }

  private manageComposedLayerVisibility(layerVisibility)
  {
    if (this.service == ServiceType.VECTOR || this.service == ServiceType.GEOJSON)
    {
      let filterArray = [];

      for (let idx=0, len=this.children.length; idx<len; idx++)
      {
        let childCfg = this.children[idx];

        if (childCfg.selected && !childCfg.disabled)
          filterArray.push(this.buildFilter(childCfg.filter));
      }

      //build wfs filter according to selection and disable
      //the different conditions are in OR between them
      this.wfsFilter = this.buildWFSLayerFilter(filterArray, "OR");

      //retrieve source of vector layer
      //(if layer is clustered vector source is a property of cluster source)
      let source = this.getSource();

      // clear source
      source.clear(true);

      // refresh source (and show layer) only if filter is valued
      if (this.wfsFilter != null)
      {
        source.refresh();
        this.layerOL.setVisible(true);
        this.visibility = true;
      }
      else
      {
        this.layerOL.setVisible(false);
        this.visibility = false;
      }
    }
    else if (this.service == ServiceType.WMS)
    {
      let strListLayers = '';
      let strListStyles = null;

      for (let idx=0, len=this.children.length; idx<len; idx++)
      {
        let child: WGMapLayer = this.children[idx];

        if (child.selected && !child.disabled)
          strListLayers += (child.layer_name + ',');
      }

      this.layerOL.setVisible(false);

      // if there are items to show we update WMS source params
      // and set composed layer visible, otherwise composed layer is hidden
      if (strListLayers != '')
      {
        strListLayers = strListLayers.substring(0, strListLayers.length-1);
        strListStyles = this.buildListStyles(strListLayers);

        this.getSource().updateParams({
          'LAYERS': strListLayers,
          'STYLES': strListStyles
        });

        this.layerOL.setVisible(true);
      }
    }
    else
    {
      // Attention: this else branch is unattainable
      console.error("manageComposedLayerVisibility service type " +
        this.service + " not managed!");
    }
  }

  /*
   * Build WMS list styles to apply to getMap request (STYLES parameter)
   * given related layers list (LAYERS parameter)
   */
  private buildListStyles(listLayers)
  {
    let stylesList = null;

//     if (listLayers && listLayers.length>0)
//     {
//       let layers = listLayers.split(",");
//
//       stylesList = "";
//
//       for (let idx=0, len=layers.length; idx<len; idx++)
//       {
//         stylesList += (userStyles[layers[idx]] ? this.userStyles[layers[idx]] : "");
//
//         if (idx<len-1)
//           stylesList += ",";
//       }
//     }

    return stylesList;
  }

  /*
   * Setting OpenLayers layer custom attributes
   */
  private setCustomAttribute = function():void
  {
    this.layerOL.set('id', this.id);
  }

  /*
   * Build an Image layer
   */
  private buildImageLayer = function():Layer
  {
    let options:Object = {};

    if (this.visibility != undefined)
      options['visible'] = this.visibility;

    if (this.opacity != undefined)
      options['opacity'] = this.opacity;

    if (this.extent)
    {
      let layerProj = this.projection;

      // convert layer extent (if necessary)
      if (layerProj != 'EPSG:' + this.wgSvc.getMapSrCode())
      {
        options['extent'] = transformExtent(
          this.extent,
          layerProj,
          'EPSG:' + this.wgSvc.getMapSrCode()
        );
      }
      else
        options['extent'] = this.extent;
    }

    return this.tiled ? new TileLayer(options) : new ImageLayer(options);
  }

  /*
   * Build a Vector layer
   */
  private buildVectorLayer = function():Layer
  {
    let options:Object = {};

    // configure options
    if (this.visibility != undefined)
      options['visible'] = this.visibility;

    if (this.extent)
    {
      let layerProj = this.projection;

      // convert layer extent (if necessary)
      if (layerProj != 'EPSG:' + this.wgSvc.getMapSrCode())
      {
        options['extent'] = transformExtent(
          this.extent,
          layerProj,
          'EPSG:' + this.wgSvc.getMapSrCode()
        );
      }
      else
        options['extent'] = this.extent;
    }

    // if layer hasn't style and hans't children -> we associate default WGStyle
    if ((!this.style && this.children.length == 0)  ||
      (!this.style && !this.childrenHaveStyle()))
    {
      let defaultStyle = null;

      switch(this.geometry_field['type'])
      {
        case GeometryType.POINT:
          defaultStyle = this.defaultPointStyle;
          break;

        case GeometryType.LINE:
        case GeometryType.MULTI_LINE:
          defaultStyle = this.defaultLineStyle;
          break;

        case GeometryType.MULTI_POLYGON:
        case GeometryType.POLYGON:
          defaultStyle = this.defaultPolygonStyle;
          break;

        case GeometryType.GEOMETRY:
          defaultStyle = this.defaultGeometryStyle;
          break;

        default:
          console.error("BuildVectorLayer: Error: geometry type " +
            this.geometry_field['type'] + " not managed!");
      }

      if (this.children.length == 0)
        // set default style on parent layer
        this.style = defaultStyle;
      else
      {
        // set default style on children
       for (let idx=0, len=this.children.length; idx<len; idx++)
         if (!this.children[idx].style)
          this.children[idx].style = defaultStyle;
      }
    }

    if (!this.style)
      this.styleTypeOL = 'PROPERTY'; //children have style
    else
      this.styleTypeOL = this.style.getOLType(); //style on layer

    // If layer is cluster overwrite styleTypeOL
    if (this.cluster)
    {
      // if layer hasn't clyster style, set the default
      if (!this.cluster_style)
        this.cluster_style = this.defaultClusterStyle;

      this.styleTypeOL = 'STYLE';
    }

    let styleCfgObj = null;

    if (this.styleTypeOL == "FIXED")
    {
      // in this case, the style is unique for all features of the layer
      // style is builded now and is associated to layer (no need style function)
      let labelStyle;
      if (this.style && this.style.label)
        labelStyle = this.style.label;

      if (this.style.rules)
      {
        for (let j=0; j < this.style.rules.length; j++)
        {
          // create array of styles (symbol and label)
          this.style.rules[j]['styles'] = [];
          this.style.rules[j]['styles'].push(this.style.rules[j].symbol);
          if (labelStyle)
            this.style.rules[j]['styles'].push(labelStyle);
        }
      }

      options['style'] = this.buildStyle(this.style.rules, null, null);
    }
    else
    {
      // in this case the style depends on the feature
      if (this.styleTypeOL == "STYLE")
      {
        let labelStyle = null
        if (this.style && this.style.label)
          labelStyle = this.style.label;

        if (this.style.rules)
        {
          for (let j=0; j < this.style.rules.length; j++)
          {
            // create array of styles (symbol and label)
            this.style.rules[j]['styles'] = [];
            this.style.rules[j]['styles'].push(this.style.rules[j].symbol);
            if (labelStyle)
              this.style.rules[j]['styles'].push(labelStyle);
          }
        }

        styleCfgObj = this.style;
      }
      else if (this.styleTypeOL == "PROPERTY")
      {
        // if layer have children, style is defined on them
        if (this.children && !this.style)
        {
          // style defined on children
          styleCfgObj = {rules: []};

          for (let idx=0, len=this.children.length; idx<len; idx++)
          {
            // wfs children on composed
            // Set attribute zIndex for style
            this.children[idx]['zIndex'] = idx + 1;

            let labelStyleChild = null;
            if (this.children[idx].style && this.children[idx].style.label)
              labelStyleChild = this.children[idx].style.label;

            // this.children[idx].style.rules has only one element
            // create array of styles (symbol and label)
            this.children[idx].style.rules[0]['styles'] = [];
            this.children[idx].style.rules[0]['styles'].push(
              this.children[idx].style.rules[0].symbol);
            if (labelStyleChild)
              this.children[idx].style.rules[0]['styles'].push(labelStyleChild);


            styleCfgObj.rules[idx] = {
              conditions: [this.children[idx].filter],
              id: this.children[idx].id,
              styles: this.children[idx].style.rules[0]['styles']
            };
          }
        }
        else
        {
          // style defined on parent
          let labelStyle = null
          if (this.style && this.style.label)
            labelStyle = this.style.label;

          if (this.style.rules)
          {
            for (let j=0; j < this.style.rules.length; j++)
            {
              // create array of styles (symbol and label)
              this.style.rules[j]['styles'] = [];
              this.style.rules[j]['styles'].push(this.style.rules[j].symbol);
              if (labelStyle)
                this.style.rules[j]['styles'].push(labelStyle);
            }
          }

          styleCfgObj = this.style;
        }
      }

      // if layer have cluster properties, we save also cluster style conf
      if (this.cluster && this.cluster_style)
      {
        let labelStyleCluster = null
        if (this.cluster_style && this.cluster_style.label)
          labelStyleCluster = this.cluster_style.label;

        if (this.cluster_style.rules)
        {
          for (let j=0; j < this.cluster_style.rules.length; j++)
          {
            // create array of styles
            this.cluster_style.rules[j]['styles'] = [];
            this.cluster_style.rules[j]['styles'].push(this.cluster_style.rules[j].symbol);
            if (labelStyleCluster)
              this.cluster_style.rules[j]['styles'].push(labelStyleCluster);
          }
        }
        styleCfgObj.clusterStyle = this.cluster_style;
      }

      let styleFunction = (feature, resolution) =>
      {
        if (!this.getSource())
          return null;

        let styleCfg = null;

        // variable to discriminate between cluster and simple feature
        let size = (this.cluster) ? feature.get('features').length : 1;

        // single feature
        if (size == 1)
        {
          // if source is a cluster, also single features are returned
          // with cluster structure
          // in this case we extract the inner feature
          // to pass them to buildStyle method
          let simpleFeature = (this.cluster) ? feature.get('features')[0] : feature;

//           /*
//           * if style type is 'PROPERTY'
//           * we build/retrieve from cache, for each class,
//           * the corresponding style in according  with condition
//           */
//           if (this.styleTypeOL == "PROPERTY")
//           {
            let rules = styleCfgObj.rules;

            // retrieve properties of the feature
            let featureProperties = simpleFeature.getProperties();

            for (let idx=0, len=rules.length; idx<len; idx++)
            {
              let property = rules[idx];

              // if array conditions has a single item, we force op to AND
              // in such a way that the check after for cycle working
              let op =  property['conditions'].length > 1 ? property['op'] : "AND";

              // support variable for exit to cycle on error
              let exit = false;

              // count verified condition
              let verifiedCond = 0;

              // cycle to find the condition verified by the given feature
              for (let jdx=0; jdx<property['conditions'].length; jdx++)
              {
                let itemProp = property['conditions'][jdx];

                let propertyName  = itemProp['name'] || itemProp['property_name'];
                let propertyValue = itemProp['value'] || itemProp['property_val'];
                let operator      = itemProp['op'] || itemProp['operator'];

                // check single condition item
                switch(operator)
                {
                  case "EQ":
                    if (featureProperties[propertyName] == propertyValue)
                      verifiedCond++;
                    break;

                  case "NE":
                    if (featureProperties[propertyName] != propertyValue)
                      verifiedCond++;
                    break;

                  case "LIKE":
                    let featureValue = featureProperties[propertyName];

                    // indexOf is case sensitive
                    if (featureValue.indexOf(propertyValue)!= -1)
                      verifiedCond++;
                    break;

                  case "ILIKE":
                    let featureValue1 = null;
                    if (featureProperties[propertyName])
                      featureValue1 = featureProperties[propertyName].toLowerCase();

                    if (featureValue1 && featureValue1.indexOf(propertyValue.toLowerCase())!= -1)
                      verifiedCond++;
                    break;

                  case "LT":
                    if (featureProperties[propertyName] < propertyValue)
                      verifiedCond++;
                    break;

                  case "LE":
                    if (featureProperties[propertyName] <= propertyValue)
                      verifiedCond++;
                    break;

                  case "GT":
                    if (featureProperties[propertyName] > propertyValue)
                      verifiedCond++;
                    break;

                  case "GE":
                    if (featureProperties[propertyName] >= propertyValue)
                      verifiedCond++;
                    break;

                  case "BETWEEN":
                    // in this case propertyValue is an array with two elements
                    if (featureProperties[propertyName] >= propertyValue[0] &&
                        featureProperties[propertyName] <= propertyValue[1])
                      verifiedCond++;
                    break;

                  case "NOT_IN":
                    // in this case propertyValue is an array
                    if (propertyValue.indexOf(featureProperties[propertyName]) < 0)
                      verifiedCond++;
                    break;

                  case "IS_NULL":
                    if (featureProperties[propertyName] == null)
                      verifiedCond++;
                    break;

                  case "IS_NOT":
                    if (featureProperties[propertyName] != null)
                      verifiedCond++;
                    break;

                  default:
                    exit = true;
                    console.error("The operator "+ operator +
                      " is not managed yet into styles building!");
                }

                if (exit)
                {
                  styleCfg = null;
                  break;
                }
              }

              if (op == "AND" && verifiedCond == property.conditions.length)
              {
                // on AND all conditions must be verified
                styleCfg = [property];
              }
              else if (op == "OR" && verifiedCond > 0)
              {
                // on OR at least one condition must be verified
                styleCfg = [property];
              }

              // we exit from classes loop
              // because we have founded the class for this feature
              if (styleCfg != null)
                break;
            }

            // control error TODO manage error
            if (styleCfg == null)
            {
            /* console.error("Feature " + feature.getId() +
                " not soddisfy any style property class");*/
              return null;
            }

            return this.buildStyle(styleCfg,feature,resolution);
//           }
//           else
//           {
//             // type style is 'STYLE'
//             return this.buildStyle(styleCfgObj.rules, simpleFeature,resolution);;
//           }
        }
        else
        {
          // in this case we have a cluster -> cluster style is unique for the layer
          return this.buildStyle(styleCfgObj.clusterStyle.rules, feature,resolution);
        }

      }

      // set function to style option
      options['style'] = styleFunction;
    }

    // build layer
    return new VectorLayer(options);
  }

  private buildStyle(rules,feature,resolution)
  {
    let stylesArr = [];
    let toCache  = true;
    let styleKey = null;
    let icon = null;

    //let units = this.wgSvc.mapComponent.view.getProjection().getUnits();
    let units = this.wgSvc.getMapProjectionUnit();
    let MPU   = METERS_PER_UNIT[units];

    // if feature is null, we have to build a style to associate to entire layer
    // this style is not cached (styleTypeOL == FIXED)
    if (feature == null)
      toCache = false;
    else
    {
      // feature is not null

      // build the key of style
      styleKey = this.generateStyleCacheKey(rules);

      if (this.styleTypeOL == 'STYLE')
        toCache = false;
      else  // in this case styleTypeOL == PROPERTY
      {
        // if style was already builded and there was no style update,
        // it is retrieved from cache
        if (this.cache[styleKey] && !this.updateStyle)
        {
          stylesArr = this.cache[styleKey];
          return stylesArr;
        }
      }
    }

    // Set variable geom necessary to retrieve image from style
    let geom = "";
    switch(this.geometry_field['type'])
    {
      case GeometryType.POINT:
        geom = "Point";
        break;

      case GeometryType.LINE:
      case GeometryType.MULTI_LINE:
        geom = "LineString";
        break;

      case GeometryType.MULTI_POLYGON:
      case GeometryType.POLYGON:
        geom = "Polygon";
        break;
    }

    if(rules)
    {
      for(let k = 0; k < rules.length; k++)
      {
        if (rules[k].styles)
        {
          for(let j = 0; j < rules[k].styles.length; j++)
          {
            // support variables to manage style visibility
            let minResolution = 0;
            let maxResolution = Infinity;

            if (rules[k].styles[j].textTo != undefined)
              minResolution = rules[k].styles[j].textTo /
                (MPU * this.wgSvc._screenDPI * this.wgSvc._IPM);

            if (rules[k].styles[j].textFrom != undefined)
              maxResolution = (rules[k].styles[j].textFrom) /
                (MPU * this.wgSvc._screenDPI * this.wgSvc._IPM);

            if (minResolution <= resolution && maxResolution >= resolution)
            {

              // Create simple style
              let simpleStyle = this.wgSvc.buildSimpleStyle(rules[k].styles[j],feature);

              // Create icon without text
              if (simpleStyle && Object.keys(simpleStyle).indexOf('text') < 0)
              {
                // Icon is image of layer
                if (rules[k].styles[j].src != null &&
                    (this.styleTypeOL == 'FIXED' || this.styleTypeOL == 'STYLE'))
                  this.icon = rules[k].styles[j].src;
                else
                {
                  if (rules[k].styles[j].src != null)
                    icon = rules[k].styles[j].src
                  else
                  {
                    // Retrieve image from style
                    let legend = new Legend({size:[16,16], margin:0, collapsed:false});

                    icon = legend.getStyleImage({
                      style: new Style(simpleStyle),
                      typeGeom: geom
                    }).toDataURL();
                  }

                  // Store icon
                  if (this.styleTypeOL == 'PROPERTY' || this.styleTypeOL == 'STYLE')
                  {
                    // styleTypeOL = PROPERTY || STYLE therefore this.icon is
                    // Object {key: {image: icon, label: name rules}}
                    // - icon is base64 or src image
                    if (this.children.length == 0)
                    {
                      // layer hasn't children => object icon on layer
                      if (!this.icon || typeof this.icon === 'string')
                        // Initialize object icon
                        this.icon = {};
                      // layer hasn't children => icon on layer
                      this.icon[styleKey] = {
                        image: icon, label: rules[k].name};
                    }
                    else
                      // layer has children => icon on child
                      // therefore this.icon is Object {image: icon, label: children label}
                    {
                      // wfs children on composed
                      for (let idx = 0; idx < this.children.length; idx++)
                      {
                        // Retrieve from child the attribute zIndex to set on STYLE
                        simpleStyle['zIndex'] = this.children[idx]['zIndex'];

                        if (this.children[idx].id == rules[k].id)
                        {
                          this.children[idx].icon = {
                            image: icon,
                            label: this.children[idx].label};
                          break;
                        }
                      }
                    }
                  }
                  else
                    // styleTypeOL = FIXED
                      this.icon = icon;
                }
              }

              // push styles into an array
              if (simpleStyle)  stylesArr.push(new Style(simpleStyle));
            }
          }
        }
      }
      // put style into cache
      if (toCache)
        this.cache[styleKey] = stylesArr;
    }

    return stylesArr;
  }

  // Removed buildSimpleStyle from here to webgis service

  /*
   * Build a Group layer
   */
  private buildGroupLayer = function():LayerGroup
  {
    let options:Object = {};

    if (this.extent)
    {
      let layerProj = this.projection;

      // convert layer extent (if necessary)
      if (layerProj != 'EPSG:' + this.wgSvc.getMapSrCode())
      {
        options['extent'] = transformExtent(
          this.extent,
          layerProj,
          'EPSG:' + this.wgSvc.getMapSrCode()
        );
      }
      else
        options['extent'] = this.extent;
    }

    options['layers'] = [];

    /* Manage children */
    // cicle on group to build layer for each item
    let parentVisible  = false;

    for (let idx=0, len=this.children.length; idx<len; idx++)
    {
      let subMapLayer = this.children[idx];

      // put OpenLayers layer into layer group array
      if (subMapLayer.layerOL)
        options['layers'].push(subMapLayer.layerOL);

      parentVisible  = parentVisible || subMapLayer.visibility;
    }

    // Set parent visibility: parent layer is visible if at least one child layer is visible
    options['visible'] = parentVisible;
    this.visibility = parentVisible;

    /* Ok */
    let layerOl = new LayerGroup(options);
    layerOl.setVisible(parentVisible);
    return layerOl;
  }

  /*
   * Build a layer source
   */
  private buildSource = function():Source
  {
    let source = null;

    // if layer has a url, we adjust it
    if (this.url)
    {
      // assign complete url to new parameter
      this.completeUrl = this.url;

      // add prefix to relative URL
      if (this.completeUrl.indexOf('http') != 0)
        this.completeUrl = this.wgSvc.getMsPrefix() + this.completeUrl;
    }

    /* Look for layer service */
    if (!this.service)
      return;

    switch(this.service)
    {
      case ServiceType.WMS:
        let layers:Array<string> = [];

        // retrieve layers name involved in this layer
        if (this.id_type == LayerTypology.COMPOSED)
        {
          // case of composed layer
          for (let idx=0, len=this.children.length; idx<len; idx++)
            layers.push(this.children[idx]["layer_name"]);
        }
        else
          layers.push(this.layer_name); // case of simple layer

        //  TODO: invoke service to check if there are styles
        // to apply to these layers related to logged user

        source = this.buildWMSSource();

        if (this.layer_name)
        {
          if (!this.isBaseLayer)
          {
            // Retrieve and store icon url
            let completeUrl = this.completeUrl;
            completeUrl += "?REQUEST=GetLegendGraphic";

            if (this.version)
              completeUrl += "&VERSION=" + this.version;

            completeUrl += "&FORMAT=image/png";

            // adding legend options
            completeUrl += "&LEGEND_OPTIONS=forceLabels:ON;fontAntiAliasing:true;";
            completeUrl += "&LAYER=" + this.layer_name;

            this.icon = completeUrl;
          }
        }
        else
        {
          //layer_name on children
          for (let idx=0, len=this.children.length; idx<len; idx++)
          {
            // Retrieve url from parent
            let completeUrl = this.completeUrl;

            completeUrl += "?REQUEST=GetLegendGraphic";

            if (this.children[idx].version)
              completeUrl += "&VERSION=" + this.children[idx].version;

            completeUrl += "&FORMAT=image/png";

            // adding legend options
            completeUrl += "&LEGEND_OPTIONS=forceLabels:ON;fontAntiAliasing:true;";
            completeUrl += "&LAYER=" + this.children[idx].layer_name;

            // Store icon
            this.children[idx].icon = completeUrl;
          }
        }

        break;

      case ServiceType.IMAGE_STATIC:
        source = this.buildImageStaticSource();
        break;

      case ServiceType.XYZ:
        source = this.buildXYZSource();
        break;

      case ServiceType.OSM:
        source = this.buildOSMSource();
        break;

      case ServiceType.VECTOR:
      case ServiceType.GEOJSON:
        source = this.buildVectorSource();
        break;

      default:
        console.error("Service " + this.service + " not managed yet!");
    }

    if (source)
      this.layerOL.setSource(source);
  }

  /*
   *  Build OSM source
   */
  private buildOSMSource = function():Source
  {
    let options:Object = {};

    if (this.url)
      options['url'] = this.url;

    options['wrapX'] = false;

    return new OSM(options);
  }

  /*
   * Build XYZ source
   */
  private buildXYZSource = function():Source
  {
    let options:Object = {};

    if (this.projection)
      options['projection'] = this.projection;

    options['url'] = this.completeUrl;

    return new XYZ(options);
  }

  /*
   * Build WMS source
   */
  private buildWMSSource = function():Source
  {
    let options:Object = {};
    let wmsParams:Object = {};

    /* // check if there is a style to apply to this layer related to logged user
    if (userStyles[sourceCfg.layer_name])
    {
      wmsParams.STYLES = userStyles[sourceCfg.layer_name];
    }
    else if (sourceCfg.layer_style)
      wmsParams.STYLES = sourceCfg.layer_style; */

    // configure WMS request parameters object
    if (this.layer_name)
      wmsParams['LAYERS'] = this.layer_name;

    if (this.style)
      wmsParams['STYLES'] = this.style;

    if (this.version)
      wmsParams['VERSION'] = this.version;

    wmsParams['FORMAT'] = OutputFormat.PNG;

    if (this.transparent != null)
      wmsParams['TRANSPARENT'] = this.transparent;

    if (this.tiled)
      wmsParams['TILED'] = this.tiled;

    if (this.projection)
      options['projection'] = this.projection;

    options['url']    = this.completeUrl;
    options['params'] = wmsParams;
    options['wrapX']  = false;
    //options['cacheSize'] = 1000;

    return this.tiled ? new TileWMS(options) : new ImageWMS(options);
  }

  /*
   * Build Image Static source
   */
  private buildImageStaticSource = function():Source
  {
    let options:Object = {};

    if (this.projection)
      options['projection'] = this.projection;

    options['url'] = this.completeUrl;
    options['imageSize'] = this.imageSize;
    options['imageExtent'] = this.imageExtent;

//     options['imageLoadFunction'] = function(image, src)
//     {
//       image.getImage()['src'] = src;
//     };

    return new Static(options);
  }


  /*
   * Build Vector source
   */
  private buildVectorSource = function():Source
  {
    let source:Source = null;
    let options:Object = {};
    let propNameArr  = null;
    let filter = null;

    options['wrapX'] = false;
     // valorize strategy source option
    options['strategy'] = BBStrategy;

    // build array of property names to return
    if (this.attributes && this.attributes.length)
    {
      propNameArr = [];

      for (let i = 0; i<this.attributes.length; i++)
        propNameArr.push(this.attributes[i]['key']);

      if (this.id_field)
        if (propNameArr.indexOf(this.id_field) < 0)
          propNameArr.push(this.id_field);

      if (this.geometry_field)
        propNameArr.push(this.geometry_field['name']);

      if (this.styleTypeOL == 'STYLE' && this.style && this.style.label)
      {
        // Retrieve attribute to push into propNameArr
        let aAttName = this.style.label.getDynamicAttribute();

        for (let j = 0; j< aAttName.length;j++)
          if (propNameArr.indexOf(aAttName[j]) < 0)
            propNameArr.push(aAttName[j]);
      }
    }

    if (this.service == ServiceType.GEOJSON)
    {
      ; // TODO
    }
    else
    {
      // loader function
      options['loader'] = (extent, resolution, projection) =>
      {
        // configure getFeature request
        let getFeatureCfgObj:Object = {
          srsName: 'EPSG:' + this.wgSvc.getMapSrCode(),
          featureTypes: [this.layer_name],
          outputFormat: OutputFormat.GEOJSON
        };

        // add propertyNames if presents
        if (propNameArr)
          getFeatureCfgObj['propertyNames'] = propNameArr;

        // add filter if presents
        if (this.wfsFilter)
          getFeatureCfgObj['filter'] = this.wfsFilter;

        // add bbox condition if we have a bbox loading strategy
        getFeatureCfgObj['bbox'] = extent;
        getFeatureCfgObj['geometryName'] = this.geometry_field['name'];

        // create getFeature request
        let getFeatureRequest = new WFS().writeGetFeature(getFeatureCfgObj);

        this.wgSvc.http.post(
          this.completeUrl,
          new XMLSerializer().serializeToString(getFeatureRequest),
          {
            headers: {"Content-Type":"text/mxl"}
          }
        ).subscribe(
          res => {
            // retrieve returned features format to encode
            // and decode features from specified output format
            let format = null;

            switch(this.format)
            {
              case OutputFormat.GEOJSON:
                format = new GeoJSON({defaultDataProjection:this.projection});
                break;

              default:
                format = new GeoJSON({defaultDataProjection:this.projection});
                break;
            };

            // clear source from previous result
            // IMPORTANT: do not use source.clear() method because into
            //            feature loader causes recursive call of reloadFeature.
            //            Note we use getFeatures() because with forEachFeature()
            //            will get a 'Can not remove value while reading' error.
            let features = source.getFeatures();

            for (let idx=0, len=features.length; idx<len; idx++)
              source.removeFeature(features[idx]);

            source.addFeatures(format.readFeatures(res, {
              dataProjection:   'EPSG:' + this.wgSvc.getMapSrCode(),
              featureProjection:'EPSG:' + this.wgSvc.getMapSrCode()
              })
            );
          },
          err => {
            // TODO manage error
          }
        );
      }
    }

    source = new VectorSource(options);

    // set custom attribute projection on source
    // we set the SR of the feature geometry so we can reproject
    // a vector layer to another SR
    source.set('projection', 'EPSG:' + this.wgSvc.getMapSrCode(), true);

    // cluster management
    if (this.cluster)
    {
      let clusterSourceOptions = {};

      clusterSourceOptions['wrapX'] = false;
      clusterSourceOptions['source'] = source;

      // function that return a point for cluster rappresentation of the feature
      // (the OL default function works only for Point geometry)
      var geometryFunction = function(feature)
      {
        let featureGeom = feature.getGeometry();
        let geom = null;

        // possible values are defined into ol.geom.GeometryType
        switch(featureGeom.getType())
        {
          case 'Point':
            geom = featureGeom;
            break;

          case 'MultiPoint':
            geom = new Point(getCenter(featureGeom.getExtent()));
            break;

          case 'LineString':
            geom = new Point(getCenter(featureGeom.getExtent()));
            break;

          case 'MultiLineString':
            geom = new Point(getCenter(featureGeom.getExtent()));
            break;

          case 'Polygon':
            geom = featureGeom.getInteriorPoint();
            break;

          case 'MultiPolygon':
            geom = new Point(getCenter(featureGeom.getExtent()));
            break;

          default:
            console.error("Geometry type " + featureGeom.getType() +
              " not managed yet into cluster source!");
        }

        return geom;
      }

      clusterSourceOptions['geometryFunction'] = geometryFunction;

      let clusterSource = new Cluster(clusterSourceOptions);

      return clusterSource;
    }
    else
      return source;
  }

  // Return TRUE if all children have style otherwise FALSE
  private childrenHaveStyle()
  {
    let haveStyle = true;

    if (this.children.length > 0)
    {
      for (let idx=0, len=this.children.length; idx<len; idx++)
      {
        if (this.children[idx].style)
          haveStyle = haveStyle && true;
        else
          haveStyle = haveStyle && false;
      }
    }

    return haveStyle;
  }

  // Generate unique key for style cache
  private generateStyleCacheKey(style)
  {
    let keyStyleCache = "";
    for (let i = 0; i < style[0].conditions.length; i++)
    {
      for(let keyObjCon in style[0].conditions[i])
      {
        if (keyObjCon == 'name' || keyObjCon == 'op' || keyObjCon == 'value' ||
          keyObjCon == 'property_name' || keyObjCon == 'operator' || keyObjCon == 'property_val')
          keyStyleCache = keyStyleCache + style[0].conditions[i][keyObjCon];
      }
    }
    return keyStyleCache;
  }
}
