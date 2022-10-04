import {Component,
        OnInit,
        Input,
        ViewChild}            from '@angular/core';

import { HttpClient }         from '@angular/common/http';

import {Subscription}         from 'rxjs';

import WFS                    from 'ol/format/WFS.js';

import {Stroke,
        Fill,
        Style}                from 'ol/style.js';

import {get as getProjection,
        METERS_PER_UNIT,
        transformExtent}      from 'ol/proj.js';

import {asArray,
        asString}             from 'ol/color.js';

import Feature                from 'ol/Feature';
import {fromExtent}           from 'ol/geom/Polygon.js';

import {pointerMove}          from 'ol/events/condition.js';
import Select                 from 'ol/interaction/Select';
import Translate              from 'ol/interaction/Translate';

import {unByKey}              from 'ol/Observable';

import {ServiceType,
        OutputFormat,
        GeometryType,
        LayerTypology,
        StyleType,
        ShapeType,
        getCoordNumDec,
        StyleStrokePattern}   from '../../webgis.util';

import {WebgisService}        from '../../webgis.service';

import {WGMapLayer}           from '../../entity/wgmapLayer';
import {WGStyle}              from '../../entity/wgStyle';
import {WGTool}               from '../../entity/wgtool';

import {ConfigService}        from '../../../core/config.service';
import {AuthService}        from '../../../core/auth.service';
import {HttpWriterService}    from '../../../core/http-writer.service';

import {FormComponent}        from '../../../core/form/form.component';

import {Print}                from './print';

@Component({
  selector: 'webgis-print',
  templateUrl: './print.component.html',
  styleUrls: ['./print.component.css']
})

export class PrintComponent implements OnInit
{
  cfg: WGTool;

  @ViewChild(FormComponent) printFormComp: FormComponent;

  printCfg: Object = {};

  // service layer for print
  printLayerOL = null;

  // entity binded to print form
  printEnt: Print = null;

  // form controller object
  formCtrlObj: Object = {};

  // options array for print form combo
  scaleOpt: Array<Object> = [];
  dpiOpt: Array<Object> = [];
  formatOpt: Array<Object> = [];
  orientationOpt: Array<Object> = [];

  // boolean to store the map click behaviour (check if enabled or disabled map click)
  mapClickEnabled: boolean = false;

  // flag to manage print error
  printError: boolean = false;

  // flag to manage 'wrong' projection on base map
  // (OSM and MapBox are printable only in EPSG:3857)
  printBadEPSGMsg: boolean = false;

  // loader
  showLoader: boolean = false;

  // legend object
  legendPrint = {name:'', classes:[]};

  // print form configuration
  printFormCfg =
  {
    id: "printForm",
    fg:
    [
      {
        id: "info",
        label: "Informazioni",
        rows:
        [
          [
            {
              key: "title",
              type: "text",
              label: "WORD.TITLE",
              width: 12,
              required: true
            }
          ],
          [
            {
              key: "description",
              type: "textarea",
              label: "WORD.DESCRIPTION",
              width: 12
            }
          ]
        ],
      },
      {
        id: "setting",
        label: "Impostazioni",
        rows:
        [
          [
            {
              key: "format",
              type: "select",
              label: "WEBGIS.PRINT_FORMAT",
              width: 6,
              options: [],
              required: true
            },
            {
              key: "orientation",
              type: "select",
              label: "WEBGIS.PRINT_ORIENTATION",
              width: 6,
              options: [
                {id:"Landscape",name:"WEBGIS.PRINT_LANDSCAPE"},
                {id:"Portrait",name:"WEBGIS.PRINT_VERTICAL"}
              ],
              required: true
            }
          ],
          [
            {
              key: "scale",
              type: "select",
              label: "WORD.SCALE",
              width: 6,
              options: [],
              required: true
            },
            {
              key: "dpi",
              type: "select",
              label: "WEBGIS.PRINT_QUALITY",
              width: 6,
              options: [],
              required: true
            }
          ],
          [
            {
              key: "legend",
              type: "boolean",
              label: "WEBGIS.LEGEND",
              width: 6,
              withoutNull: true
            },
            {
              key: "overview",
              type: "boolean",
              label: "WEBGIS.OVERVIEW",
              width: 6,
              withoutNull: true
            }
          ],
          [
            {
              key: "btPrint",
              type: "button",
              label: "",
              width: 12,
              btnLabel: "WORD.PRINT"
            }
          ]
        ]
      }
    ]
  };

  private subscriptionPrint:Subscription;
  private subscription: Subscription;

  // interactions to select and translate print box area
  translateInteraction = null;
  selectInteraction    = null;

  // unique key for pointer move listener
  pointerMoveListenerKey = null;

 // extent of print area
  printAreaExtent = null;

  // Identifier of print layer (id and name)
  static readonly printLayerId   = 8888;
  static readonly printLayerName = '_PRINT_LAYER_';

  // preview print area style
  printPreviewStyle = new Style({
    stroke: new Stroke({
      color: '#7A7A7A',
      width: 1.4
    }),
    fill: new Fill({
      color: [0, 0, 0, 0.2]
    })
  });

  constructor(private wgSvc:WebgisService,
              private http:HttpClient,
              private configSvc:ConfigService,
              private auth:AuthService,
              private httpWriter: HttpWriterService)
  {}

  ngOnInit()
  {
    this.printCfg = this.cfg['params'];

    this.subscription = this.wgSvc.observer.subscribe(layerObj =>
    {
      switch(layerObj['key'])
      {
        // Catch the change SR event
        case 'changeSR':
          this.configurePrint();
          break;
      }
    });


    this.subscriptionPrint = this.wgSvc.loadCapabilitiesPrint(this.printCfg['printAppName']).subscribe
    (
      val =>
      {
        if (val)
        {
          let layoutArray = this.wgSvc.printCapabilities['layouts'];

          // cycle on layouts
          for (var idx=0, len=layoutArray.length; idx<len; idx++)
          {
            let layout = layoutArray[idx];
            let layoutMapAttr = null;

            // split format and orientation into 2 variables
            let layoutNameFormatArray = layout.name.split('|');

            let layoutFormat      = layoutNameFormatArray[0];
            let layoutOrientation = layoutNameFormatArray[1];

            if (!this.printCfg['format'])
              this.printCfg['format'] = {};
            if (!this.printCfg['format'][layoutFormat])
              this.printCfg['format'][layoutFormat] = {};

            // retrieve layout map attributes (to read width and height)
            let layoutAttr = layout.attributes;

            for (let jdx=0, numAttr=layoutAttr.length; jdx<numAttr; jdx++)
            {
              if (layoutAttr[jdx].name == "map")
              {
                layoutMapAttr = layoutAttr[jdx];
                break;
              }
            }

            // save map size
            switch(layoutOrientation)
            {
              case "Portrait":
                this.printCfg['format'][layoutFormat].Portrait = [
                  layoutMapAttr.clientInfo.width,
                  layoutMapAttr.clientInfo.height
                ];
                break;

              case "Landscape":
                this.printCfg['format'][layoutFormat].Landscape = [
                  layoutMapAttr.clientInfo.width,
                  layoutMapAttr.clientInfo.height
                ];
                break;

              default:
                console.error("Bad orientation value in print configuration: " +
                  layoutOrientation);
            }
          }

          for (let key in this.printCfg['format'])
            this.formatOpt.push({"id": key, "name":key});

          this.configureForm();
          this.configurePrint();
        }
        else
        {
          this.printError = true;
        }
      }
    );
  }

  ngOnDestroy()
  {
    this.subscriptionPrint.unsubscribe();
    this.subscription.unsubscribe();

    // remove print layer support
    let layerPrint = this.wgSvc.getLayerObjById(PrintComponent.printLayerId);
    this.wgSvc.manageLayer("D", {id: layerPrint.id, isBaseLayer: false});

    //Remove interaction
    this.wgSvc.mapComponent.map.removeInteraction(this.translateInteraction);
    this.wgSvc.mapComponent.map.removeInteraction(this.selectInteraction);

    this.printLayerOL = null;

    // Restore previous map click behaviour
    this.wgSvc.mapComponent.setDefaultMapClickEnabled(this.mapClickEnabled);

    // remove listener on pointer move
    unByKey(this.pointerMoveListenerKey);
  }

    /*
   * Event handler
   */
  onPrintFormChanged(obj)
  {

    switch (obj.key)
    {
      case "format":
      case "orientation":
      case "scale":
        if (!this.printFormComp.isChanged())
          return;

        let changedObj = this.printFormComp.getChangedObj();

        this.printEnt.update(changedObj);

        this.drawAreaPrint();
        break;
      case "btPrint":
        /* Check validity and changed */
        if (!this.printFormComp.isValid())
          return;

        /* Update entity Print */
        let chObj = this.printFormComp.getChangedObj();
        this.printEnt.update(chObj);

        // reset print error flag
        this.printError = false;

        // reset print bad EPSG flag
        this.printBadEPSGMsg = false;

         // reset legend object
        this.legendPrint = {name:'', classes:[]};

        // retrieve layer to print
        this.getLayersToPrint();

        break;
    }
  }

  setCfg(cfg: WGTool)
  {
    this.cfg = cfg;
  }

  /*
   * Private Method
   */

  private getLayersToPrint()
  {
    let printLayerArray     = [];
    let buildPrintSupportArray = [];

    // retrieve ordered layers array from map
    let layersArray = this.wgSvc.mapComponent.map.getLayers().getArray();

    // counter to manage async layer cycle to retrieve layers data
    let count = 0;

    // cycle on map layers
    for (var idx=0; idx<layersArray.length; idx++)
    {
      // retrieve layer id
      let layerId = layersArray[idx].get('id');

      // retrieve layer
      let layer = this.wgSvc.getBaseLayerObjById(layerId) || this.wgSvc.getLayerObjById(layerId);

      // remove special or support layers from print
      if (layer.support)
        continue;

      this.retrieveLayerToPrint(layer, buildPrintSupportArray);
    }

    let numLayerToPrint = buildPrintSupportArray.length;

    for (let idx=0, len=numLayerToPrint; idx<len; idx++)
    {
      // invoke async function to retrieve layers print configuration
      // the callback put layer configuration into an array;
      // when we have retrieved info from all layers (if condition),
      // we invoke managePrint function
      this.buildPrintLayer(
        idx,
        buildPrintSupportArray[idx].param1,
        buildPrintSupportArray[idx].param2,
        buildPrintSupportArray[idx].param3,
        (res) =>
        {
          if (res && res.printLayer)
          {
            // in this way we mantain map layers order
            printLayerArray[res.index] = res.printLayer;

            // if legend flag is true, build legend object for this layer
            if (this.printEnt.legend)
              this.buildLayerLegend(res.param1, res.param3);
          }
          else
             printLayerArray[idx] = res;

          // print
          if (numLayerToPrint == ++count)
          {
            // remove null from array
            // (there are null for WFS call that hasn't return)
            for (let j = printLayerArray.length-1; j>=0; j--)
            {
              if (!printLayerArray[j])
                printLayerArray.splice(j,1);
            }

            // From mapfish documentation:
            // (https://mapfish.github.io/mapfish-print-doc/attributes.html)
            // The first layer in the array will be the top layer in the map.
            // The last layer in the array will be the bottom layer in the map.
            //
            // so, we have to revert layers array order
            this.managePrint(printLayerArray.reverse());
          }
        }
      );
    }

  }

  /*
   * Function that retrieve layer print configuration
   * The configuration founded is returneb invoking callback function
   */
  private buildPrintLayer(index, layer, itemsArray, child, callback)
  {
    if (!layer && !itemsArray)
      callback(null);
    else
    {
      // check if layer is reprojectable when called from print server
      if (layer.service == ServiceType.OSM || layer.service == ServiceType.XYZ)
      {
        if (layer.projection &&
            layer.projection != 'EPSG:' + this.wgSvc.getMapSrCode())
        {
          this.printBadEPSGMsg = true;
          callback(null);
          return;
        }
      }

      // return also input variables because this function
      // makes async calls and is invoked into a cycle
      let objToRet = {
        index:  index,
        param1: layer,
        param2: itemsArray,
        param3: child
      };

      let printLayerCfg = {};

      // switch on source type
      switch(layer.service)
      {
        case ServiceType.OSM:
        case ServiceType.XYZ:
          // in this case layer configuration is retrieved in sync way
          printLayerCfg['type'] = 'osm';
          printLayerCfg['imageExtension'] = 'png';
          printLayerCfg['opacity'] = layer.getOpacity();
          printLayerCfg['customParams'] = {"TRANSPARENT": true};

          printLayerCfg['baseURL']  =
            (layer.completeUrl.indexOf('http') == 0) ?
              layer.url :
              this.printCfg['mapserverUrl'] + layer.url;

          objToRet['printLayer'] = printLayerCfg;

          callback(objToRet);
          break;

        case ServiceType.WMS:
          // in this case layer configuration is retrieved in sync way
          printLayerCfg['type'] = layer.tiled ? 'tiledwms' : 'wms';

          // itemsArray, if presents, contains layers list
          printLayerCfg['layers'] = itemsArray ? itemsArray : [layer.layer_name];
          printLayerCfg['imageFormat'] = 'image/png';
          printLayerCfg['opacity'] = layer.getOpacity();
          printLayerCfg['customParams'] = {'TRANSPARENT': true};

          printLayerCfg['baseURL']  =
            (layer.completeUrl.indexOf('http') == 0) ?
              layer.completeUrl :
              this.printCfg['mapserverUrl'] + layer.url;

          if (layer.tiled)
            printLayerCfg['tileSize'] = [256, 256];

          objToRet['printLayer'] = printLayerCfg;

          callback(objToRet);
          break;

        case ServiceType.VECTOR:
          // in this case layer configuration is retrieved in async way
          // itemsArray, if presents, contains filter to apply to this layer
          if (itemsArray)
            var filter = layer.buildWFSLayerFilter(itemsArray, 'OR');

          // if the user choise print legend we save icon on server (if base64)
          if (this.printEnt.legend)
          {
            // Put icon on server
            let urlImage = "/wgLayer/updatePrintImage/" + layer.id;

            let bodyImage = null;
            let keyImage = null;
            let iconUrl = window.location.protocol + "//" + window.location.host +
              window.location.pathname + this.configSvc.urlPrefix.er.slice(1,3) + "/wgLayer/" +
              layer.id + "/getFile/";
            let baseUrl = window.location.protocol + "//" + window.location.host +
              window.location.pathname;

            // Icon is image of layer (layer.icon is a src)
            if (layer.icon instanceof String && !layer.icon.includes("base64"))
              layer['urlIconPrint'] = window.location.protocol + "//" + window.location.host +
              window.location.pathname + layer.icon;
            else
            {
              // icon is object or base64 image for styleTypeOL == 'FIXED'
              if (layer.styleTypeOL == 'FIXED')
              {
                // icon is base 64
                keyImage =
                  layer.id + (layer.layer_name ? "_" + layer.layer_name : "") + ".png";
                bodyImage = {};
                bodyImage[keyImage] = layer.icon;
                layer['iconUrlPrint'] = iconUrl + keyImage;
              }
              else
              {
                // styleTypeOL = PROPERTY || STYLE therefore this.icon is an object like:
                // if layer hasn't children: {key: {image: icon, label: name rules}}
                // if layer has children, the icon is on child {image: icon, label: children label}
                if (layer.children.length == 0)
                {
                  // layer hasn't children
                  layer['iconUrlPrint'] = [];
                  bodyImage = {};
                  for (let key in layer.icon)
                  {
                    let obj = {};
                    if (layer.icon[key]['image'].includes("base64"))
                    {
                      //icon is base64
                      keyImage = layer.id + "_"  + key.replace(/\s+/g,'') + ".png";
                      bodyImage[keyImage] = layer.icon[key]['image'];
                      obj = {label: layer.icon[key]['label'], icon: iconUrl + keyImage}
                    }
                    else
                    {
                      //src of image
                      obj = {
                        label: layer.icon[key]['label'],
                        icon: baseUrl + layer.icon[key]['image']
                      }
                    }
                    layer['iconUrlPrint'].push(obj);
                  }

                }
                else
                {
                  // layer has children
                  bodyImage = {};
                  for (let idx = 0; idx < layer.children.length; idx++)
                  {
                    if (layer.children[idx].selected && layer.children[idx].visibility)
                    {
                      if (layer.children[idx].icon['image'].includes("base64"))
                      {
                        // icon is base64
                        keyImage = layer.children[idx].id +
                          (layer.children[idx].layer_name ? "_" + layer.children[idx].layer_name
                          : "") + ".png";
                        bodyImage[keyImage] = layer.children[idx].icon['image'];
                        layer.children[idx]['iconUrlPrint'] = iconUrl + keyImage;
                      }
                      else
                        //src of image
                        layer.children[idx]['iconUrlPrint'] =
                          baseUrl + layer.children[idx].icon['image'];
                    }
                  }
                }

              }
            }


            if (bodyImage)
            {
              this.httpWriter.put(urlImage, bodyImage).subscribe
              (
                res =>
                {
                  if (!res)
                    console.error("Error on save icon " + keyImage +  " on server");
                },
                err =>
                {
                  console.error("Error on save icon " + keyImage +  " on server");
                }
              );
            }
          }

          // invoke wfs layer
          this.http.post(
            layer.completeUrl,
            this.featureRequest(layer, filter)).subscribe(response =>
            {
              // if there aren't result we skip layer also if it's selected
              if (response['features'] && response['features'].length == 0)
                objToRet = null;
              else
              {
                // see https://groups.google.com/forum/#!topic/mapfish-print-users/28XsAZUxFSk
                // The standard EPSG:4326 is Lat-Long;
                // CRS:84 changing the axis from Lat-Long to Long-Lat
                if (this.wgSvc.getMapSrCode() == 4326 && response['features'])
                  response['crs']['properties']['name'] = 'urn:ogc:def:crs:CRS::84';

                printLayerCfg['type'] = 'geojson';
                printLayerCfg['geoJson'] = response;

                // If layer has polygon geometry use Mapfish SLD Style
                // then pass url to retrieve file sld with style
                // otherwise create mapfish JSON style
                let url = null;

                // case of composed child
                let id = child ? child.id : layer.id;

                if (layer.getGeomType().includes("Polygon"))
                  url = window.location.protocol + "//" + window.location.host +
                    window.location.pathname + this.configSvc.urlPrefix.er.slice(1,3) +
                    "/wgStyle/polygonSLD?layer_id=" + id;

                if (this.wgSvc.getUserStyle(id) && layer.getGeomType().includes("Polygon"))
                  url = url + "&user_id=" + this.auth.userInfo['id'] ;

                printLayerCfg['style'] =  url ? url : this.buildLayerStyle(layer, response['features']);

                objToRet['printLayer'] = printLayerCfg;
              }

              callback(objToRet);
            }
          );

          break;

        case ServiceType.GEOJSON:
          // in this case layer configuration is retrieved in async way

          //TODO
          break;

        case ServiceType.IMAGE_STATIC:
          //TODO
          break;
      }
    }
  }

  /*
   * Build style object (for vector layer) to pass to print server
   */
  private buildLayerStyle(layer, features)
  {
    // use Mapfish JSON Style Version 2
    let printStyle = {
      version: "2"
    };

    switch(layer.styleTypeOL)
    {
      case "FIXED":

        printStyle["*"] = this.buildStyleRule(layer.style.rules[0]['styles'], null);
        break;

      case "PROPERTY":
      case "STYLE":

        var styleCfgObj = null;

        if (layer.children.length > 0)
        {
          // style defined on children
          styleCfgObj = {rules: []};

          for (let idx=0, len=layer.children.length; idx<len; idx++)
          {
            let labelStyleChild = null;
            if (layer.children[idx].style.label)
              labelStyleChild = layer.children[idx].style.label;

            // layer.children[idx].style.rules has only one element
            // create array of styles (symbol and label)
            layer.children[idx].style.rules[0]['styles'] = [];
            layer.children[idx].style.rules[0]['styles'].push(
              layer.children[idx].style.rules[0].symbol);
            if (labelStyleChild)
              layer.children[idx].style.rules[0]['styles'].push(labelStyleChild);


            styleCfgObj.rules[idx] = {
              conditions: [layer.children[idx].filter],
              styles: layer.children[idx].style.rules[0]['styles']
            };
          }
        }
        else
          // style defined on layer
          styleCfgObj = layer.style;

        var numRules = styleCfgObj.rules.length;

        for (var idx=0; idx<numRules; idx++)
        {
          let itemRule = styleCfgObj.rules[idx];

          if (itemRule['conditions'].length == 0)
          {
            printStyle["*"] = this.buildStyleRule(layer.style.rules[0]['styles'], features);
          }
          else
          {
            let op =  itemRule['conditions'].length > 1 ? itemRule['op'] : "AND";

            let styleRuleCond = this.buildStyleCond(itemRule['conditions'], op);

            printStyle[styleRuleCond] = this.buildStyleRule(itemRule.styles, features);
          }
        }

        break;

//       case "STYLE":
//
//         printStyle["*"] = this.buildStyleRule(layer.style.rules[0]['styles'], features);
//         break;
    }

    return printStyle;
  }

  /*
   * Build mapfish style rules
   */
  private buildStyleRule(styleObjArray, featuresArray)
  {
    // retrieve num of style rules
    let numStyleRules = styleObjArray.length;

    // object to return
    let styleCfg = {
      symbolizers: []
    };

    if (numStyleRules == 1)
      styleCfg['symbolizers'].push(this.buildSimpleStyle(styleObjArray[0], featuresArray));
    else
    {
      // more styles to combine into one
      for (var i=0; i<numStyleRules; i++)
      {
        styleCfg['symbolizers'].push(this.buildSimpleStyle(styleObjArray[i], featuresArray));
      }
    }

    return styleCfg;
  }

  /*
   * Build mapfish style rule key from style conditions (read from configuration)
   */
  private buildStyleCond(condArray, condOperator)
  {
    // return value
    var cond = "[";

    // cycle conditions array to build condition
    for (var idx=0; idx<condArray.length; idx++)
    {
      let condObj = condArray[idx];

      let propertyVal = condObj.hasOwnProperty('value') ? condObj['value'] : condObj['property_val'];
      let value = null;

      // if propertyVal is a string, we surround it with quotes
      // this is useful for EQ operator, that is valid for both string and numbers
      if (typeof propertyVal === 'string' || propertyVal instanceof String)
        value = "'" + propertyVal + "'";
      else
        value = propertyVal;

      let operator      = condObj.hasOwnProperty('op') ? condObj['op'] : condObj['operator'];
      let propertyName  = condObj.hasOwnProperty('name') ? condObj['name'] : condObj['property_name'];

      // NOTE: id is keyword for ECQL therefore we surround it in escaped double quotes
      if (propertyName == 'id')
        propertyName = "\"" + propertyName + "\"";

      switch(operator)
      {
        case "EQ":
          cond += (propertyName + " = " + value);
          break;

        case "NE":
          cond += (propertyName + " <> " + value);
          break;

        case "LT":
          cond += (propertyName + " < " + propertyVal);
          break;

        case "LE":
          cond += (propertyName+ " <= " + propertyVal);
          break;

        case "GT":
          cond += (propertyName + " > " + propertyVal);
          break;

        case "GE":
          cond += (propertyName+ " >= " + propertyVal);
          break;

        case "LIKE":
          cond += (propertyName + " LIKE '%" + propertyVal + "%'");
          break;

        case "ILIKE":
          cond += (propertyName + " ILIKE '%" + propertyVal + "%'");
          break;

        case "BETWEEN":
          // in this case propertyVal is an array with two elements
          cond += ("("+ propertyName+ " BETWEEN " +
                  propertyVal[0] + "AND" +propertyVal[1] + ")");
          break;

        case "NOT_IN":
          // in this case propertyVal is an array
          cond += (propertyName + " NOT IN (" + propertyVal + ")");
          break;

        case "IS_NULL":
          cond += (propertyName + " IS NULL ");
          break;

        case "IS_NOT":
          cond += (propertyName + " IS NOT NULL ");
          break;

        default:
          console.error("filter operator " + operator + " not managed yet!");
      };

      // add operator if not is last condition added
      if (idx < condArray.length-1)
        cond += " " + condOperator + " ";
    }

    return cond + "]";
  }

  /*
   * Build mapfish style
   */
  private buildSimpleStyle(styleObj, featuresArray)
  {
    let styleRule = {};
    let type = styleObj['type'];

    /*
    * Build mapfish style for the type.
    */
    switch(type)
    {
      case StyleType.LINE:
        styleRule['type'] = "line";

        if (styleObj.color)
        {
          let strokeColorArray = asArray(styleObj.color);

          styleRule['strokeColor'] = asString(styleObj.color).slice(0,7);

          styleRule['strokeOpacity'] = strokeColorArray[3];
        }

        if (styleObj.size)
          styleRule['strokeWidth'] = styleObj.size;

        if (styleObj.id)
        {
          switch(styleObj.id)
          {
            case StyleStrokePattern.DASH: // dash
              styleRule['strokeDashstyle'] = "dash";
              break;
          }
        }

        break;

      case StyleType.POLYGON:
        //NOTE: Don't use MapFish JSON Style but SLD style and pass url to retrieve file sld
        break;

      case StyleType.TEXT:
        styleRule['type'] = "text";

        if (styleObj.textColor)
        {
          let fillColorArray = asArray(styleObj.textColor);

          styleRule['fontColor'] = asString(styleObj.textColor).slice(0,7);

          styleRule['fontOpacity'] = fillColorArray[3];
        }

        if (styleObj.textBackColor)
        {
          let strokeColorArray = asArray(styleObj.textBackColor);

          styleRule['haloColor'] = asString(styleObj.textBackColor).slice(0,7);

          styleRule['haloOpacity'] = strokeColorArray[3];

          styleRule['haloRadius'] = "0.5";
        }

        if (styleObj.offsetX)
          styleRule['labelXOffset'] = styleObj.offsetX + '';
        // convert to string

        if (styleObj.offsetY)
          styleRule['labelYOffset'] = -(styleObj.offsetY) + '';
        // offset with positve number put the text above the geometry
        // convert to string

        if (styleObj.offsetY)
          styleRule['labelPerpendicularOffset'] = -(styleObj.offsetY) + '';
        // the labelPerpendicularOffset property defined the a line placement will be created for the text symbolizer.
        // offset with positve number put the text above the geometry
        // convert to string

        if (styleObj.fontSize)
          styleRule['fontSize'] = Math.round(0.8*styleObj.fontSize )+ 'px'; // scale fontSize

        let labelAlign = "";

        if (styleObj.textAlign)
        {
          switch(styleObj.textAlign)
          {
            case 'left'   : labelAlign = 'lm'; break;
            case 'right'  : labelAlign = 'rm'; break;
            case 'center' : labelAlign = 'cm'; break;
            case 'end'    : labelAlign = 'lm'; break;
            case 'start'  : labelAlign = 'rm'; break;
          }
        }
        else
          labelAlign = 'lm';

        styleRule['labelAlign'] = labelAlign;

        //TODO To Optimize with tag `string template` for max 3 dynamic attributes

        // Retrieve attributes
        let aAttrName = styleObj.getDynamicAttribute();
        // Retrieve separators
        let aSep = styleObj.getSeparatorAttribute();

        if (aAttrName.length == 0)
         styleRule['label'] = styleObj.text;
        else
        {
          let label = "";
          switch (aAttrName.length)
          {
            case 1:
              label =
              "[if_then_else((isNull(" + aAttrName[0] + "))," +
                "''," +
                aAttrName[0] + ")]";
              break;

            case 2:
              label =
                "[if_then_else((isNull(" + aAttrName[0] + ")), " +
                  "if_then_else((isNull(" + aAttrName[1] + "))," +
                    " '', " +
                    aAttrName[1] + ")," +
                "if_then_else((isNull(" + aAttrName[1] + "))," +
                  aAttrName[0] + "," +
                  "concatenate(" + aAttrName[0] + ", '" + aSep[0] + "', " +
                    aAttrName[1] + ")))]";
              break;

            case 3:
              label =
                "[if_then_else((isNull(" + aAttrName[0] + "))," +
                  "if_then_else((isNull(" + aAttrName[1] + "))," +
                    "if_then_else((isNull(" + aAttrName[2] + "))," +
                      "'',"+
                      aAttrName[2] + ")," +
                  "if_then_else((isNull(" + aAttrName[2] + "))," +
                    aAttrName[1]  + ", " +
                    "concatenate(" + aAttrName[1] + ", '" + aSep[1] + "', " +
                      aAttrName[2] + ")))," +
                "if_then_else((isNull(" + aAttrName[1] + "))," +
                  "if_then_else((isNull(" + aAttrName[2] + "))," +
                    aAttrName[0] + "," +
                    "concatenate(" + aAttrName[0] + ",' " + aSep[1] + "'," +
                      aAttrName[2] + "))," +
                  "if_then_else((isNull(" + aAttrName[2] + "))," +
                    "concatenate(" + aAttrName[0] + ", '" + aSep[0] + "', " +
                      aAttrName[1] + ")," +
                    "concatenate(" + aAttrName[0] + ", '" + aSep[0] + "', " +
                      aAttrName[1] + ",'" + aSep[1] + "', " + aAttrName[2] + "))))]";
              break;
          }

          styleRule['label'] = label;
        }

        break;

      case StyleType.IMAGE:
        styleRule['type'] = "point";

        if (styleObj.src)
          styleRule['externalGraphic'] = window.location.protocol + "//" +
            window.location.host + window.location.pathname + styleObj.src;

        break;

      case StyleType.SHAPE:
        styleRule['type'] = "point";

        if (styleObj.color)
        {
          let fillColorArray = asArray(styleObj.color);

          styleRule['fillColor'] = asString(styleObj.color).slice(0,7);

          styleRule['fillOpacity'] = fillColorArray[3];
        }

        if (styleObj.strokeColor)
        {
          let strokeColorArray = asArray(styleObj.strokeColor);

          styleRule['strokeColor'] = asString(styleObj.strokeColor).slice(0,7);

          styleRule['strokeOpacity'] = strokeColorArray[3];
        }
        else
        {
          // NOTE: Mapfish set default stroke: dark color
          // then if !strokeColor set fillColor
          if (styleObj.color)
          {
            let strokeColorArray = asArray(styleObj.color);

            styleRule['strokeColor'] =  asString(styleObj.color).slice(0,7);

            styleRule['strokeOpacity'] = strokeColorArray[3];
          }
        }


        if (styleObj.strokeWidth)
          styleRule['strokeWidth'] = styleObj.strokeWidth;

        if (styleObj.size)
          styleRule['pointRadius'] = styleObj.size/2;

        if (styleObj.id)
        {
          switch(styleObj.id)
            {
              case ShapeType.CIRCLE:
                styleRule['graphicName'] = "circle";
                break;
              case ShapeType.SQUARE:
                styleRule['graphicName'] = "square";
                break;
              case ShapeType.TRIANGLE:
                styleRule['graphicName'] = "triangle";
                break;
            }
        }
        break;

      default:
        console.error("Error: Style type " + type + " not implemented yet!");
        break;
    }

    return styleRule;

  }

  /*
   * generate a GetFeature request on WFS layer
   */
  private featureRequest(layer, filter)
  {
    let propNameArr  = null;

    // build array of property names to return
    if (layer.attributes && layer.attributes.length)
    {
      propNameArr = [];

      for (let i = 0; i<layer.attributes.length; i++)
        propNameArr.push(layer.attributes[i]['key']);

      if (layer.id_field)
        if (propNameArr.indexOf(layer.id_field) < 0)
          propNameArr.push(layer.id_field);

      if (layer.geometry_field)
        propNameArr.push(layer.geometry_field['name']);
    }

    // configure getFeature request
    let getFeatureCfgObj:Object = {
      srsName: 'EPSG:' + this.wgSvc.getMapSrCode(),
      featureTypes: [layer.layer_name],
      outputFormat: OutputFormat.GEOJSON,
    };

    // add propertyNames if presents
    if (propNameArr)
      getFeatureCfgObj['propertyNames'] = propNameArr;


    // add filter if presents
    if (filter)
      getFeatureCfgObj['filter'] = filter;


    // added print extent restriction to load only features into print area
    getFeatureCfgObj['bbox'] = this.printAreaExtent;

    getFeatureCfgObj['geometryName'] = layer.geometry_field['name'];

    // create getFeature request
    let getFeatureRequest = new WFS().writeGetFeature(getFeatureCfgObj);

    // serialize and return feature request
    return new XMLSerializer().serializeToString(getFeatureRequest);
  }

  private managePrint(printlayerCfgArray)
  {
    // decimal position of coordinate
    let numDec = getCoordNumDec(this.wgSvc.mapComponent.currentMapSr.units);

    // create json object to post to print url
    var printPostData = {};

    printPostData['layout'] = this.printEnt.format + "|" + this.printEnt.orientation;
    printPostData['outputFormat'] = "pdf";
    printPostData['attributes'] = {};

    printPostData['attributes']['map'] = {
      dpi: this.printEnt.dpi,
      rotation: 0,
      scale: this.printEnt.scale,
      projection: 'EPSG:' + this.wgSvc.getMapSrCode(),
      bbox: this.printAreaExtent,
      layers: printlayerCfgArray
    };

    printPostData['attributes']['authority'] = this.printCfg['authority'];
    printPostData['attributes']['title'] = this.printEnt.title;
    printPostData['attributes']['descr'] = this.printEnt.description;
    printPostData['attributes']['scale'] = this.printEnt.scale;
    printPostData['attributes']['projection'] = this.wgSvc.mapComponent.currentMapSr.name;
    printPostData['attributes']['printURL'] = this.printCfg['printURL'];
    printPostData['attributes']['xmin'] = this.printAreaExtent[0].toFixed(numDec);
    printPostData['attributes']['ymin'] = this.printAreaExtent[1].toFixed(numDec);
    printPostData['attributes']['xmax'] = this.printAreaExtent[2].toFixed(numDec);
    printPostData['attributes']['ymax'] = this.printAreaExtent[3].toFixed(numDec);

    // overview attributes settings
    printPostData['attributes']['thereIsOverview'] = this.printEnt.overview || false;

    let ovwLyrCfg = this.wgSvc.getMapCfgObj().getToolsById('overview')['params']['layer'];

    // build overview layer object
    let ovwLayer = new WGMapLayer(this.wgSvc, ovwLyrCfg, false)

    // retrieve overview map url
    let mapOverviewURL =
      (ovwLayer.completeUrl.indexOf('http') == 0) ?
        ovwLayer.completeUrl :
        this.printCfg['mapserverUrl'] + ovwLayer.url;

    printPostData['attributes']['overviewMap'] = {
      layers: [
        {
          baseURL: mapOverviewURL,
          opacity: 1,
          type: ovwLayer.service,
          layers: [ovwLayer.layer_name],
          imageFormat: "image/png",
          customParams: {"TRANSPARENT": false}
        }
      ]
    };

    // legend attribute settings
    printPostData['attributes']['thereIsLegend'] = this.printEnt.legend || false;
    printPostData['attributes']['legend_title'] = "Legenda";

    if (printPostData['attributes']['thereIsLegend'])
      printPostData['attributes']['legend']= this.legendPrint;

    // adjust coordinate order for EPSG:4326
    // (see http://docs.geotools.org/latest/userguide/library/referencing/order.html)
    if (this.wgSvc.getMapSrCode() == 4326)
      printPostData['attributes']['map']['longitudeFirst'] = true;

    var startTime = new Date().getTime();

    this.showLoader = true;

    // invoke print server
    // extension (.pdf) could be customized with print supported format
    let url =  this.configSvc.urlPrefix.as + "/print/print/" +
      this.printCfg['printAppName'] + "/report.pdf";

    this.http.post(url,printPostData).subscribe (
      res =>
      {
        if (!res)
        {
          this.printError = true;
          this.showLoader = false;
        }
        else
        {
          // recursive function to request print status
          this.downloadWhenReady(startTime, res);
        }
      },
      err=>
      {
        this.printError = true;
        this.showLoader = false;
        console.error(err);
      }
    );
  }

  /*
   * Recursive function to request print status
   */
  private downloadWhenReady(startTime, postPrintRes)
  {
    if ((new Date().getTime() - startTime) > 60000)
    {
      // after 60 sec notify a print error and invoke cancel on print job
      this.showLoader = false;

      let urlDel = this.configSvc.urlPrefix.as + "/print/print/cancel/"+postPrintRes.ref;
      this.http.delete(urlDel).subscribe();
    }
    else
    {
      // every 2 seconds poll print server
      setTimeout(() => {
        let urlStatus = this.configSvc.urlPrefix.as +
          "/print/print/status/"+postPrintRes.ref+".json";

        this.http.get(urlStatus).subscribe(status =>
        {
          switch (status['status'])
          {
            case 'error':
            case 'cancelled':
              this.printError = true;
              this.showLoader = false;
              break;

            case 'running':
            case 'waiting':
              this.downloadWhenReady(startTime, postPrintRes);
              break;


            case 'finished':
              if (status['done'])
              {
                this.showLoader = false;
                this.printError = false;
                let urlDownload = this.configSvc.urlPrefix.as +
                  "/print/print/report/" + postPrintRes.ref;
                window.location.href = urlDownload;
              }
              break;
          }
        });
      }, 2000);
    }
  }

    /*
   * Build legend object (for a given layer) to be passed to mapfish
   */

  private buildLayerLegend(layer,child)
  {
    switch(layer.id_type)
    {
      case LayerTypology.GROUP:
        // NOTE:The layer typology will not be GROUP because
        // the layers sent to Mapfish will be always and only simple layers
        // or composed
        break;

      case LayerTypology.COMPOSED:
        // in this case invoke function on visible and enabled children
//         for (var idx=0, len=layer.children.length; idx<len; idx++)
//         {
//           let item = layer.children[idx];
//
//           if (item.selected && !item.disabled)
//           {
//             this.buildLegendItem(item, layer);
//           }
//         }
        this.buildLegendItem(child, layer);
        break;

      case LayerTypology.LAYER:
        // this case invoke function on single layer
        let parent = layer.id_parent ? this.wgSvc.getLayerObjById(layer.id_parent) : null;
        this.buildLegendItem(layer,parent);
        break;

      case LayerTypology.RASTER:
        break;

      default:
        console.error("Error: type " + layer.id_type + " not managed!");
        break;
    }
  }

  /*
   * Build item legend object
   */
  private  buildLegendItem(layer, parent)
  {
    // create legend object
    let legendObj = {};

    // In this case we have layer WMS (simple layer WMS or child of composed WMS)
    if ((layer.service && layer.service == ServiceType.WMS) ||
        (parent && parent.service == ServiceType.WMS))
    {
      if (!layer.isBaseLayer)
      {
        // layer.icon is a URL
        // if layer.icon is a relative url, we transform it into absolute url
        let iconUrl = layer.icon;
        if (iconUrl.indexOf('http') < 0)
          iconUrl = window.location.protocol + "//" + window.location.host +
            window.location.pathname + iconUrl.slice(1,iconUrl.length);

        legendObj['icons'] = [iconUrl];
        legendObj['name'] = layer.label;
        this.legendPrint.classes.push(legendObj);
      }
    }
    else
    {
       // In this case we have layer WFS (simple layer WFS or child of composed WFS)
      if (layer['iconUrlPrint'])
      {
        if (parent &&
          (parent.id_type == LayerTypology.COMPOSED || parent.id_type == LayerTypology.GROUP))
          legendObj['name'] = parent.label + " - " + layer.label;
        else
          legendObj['name'] = layer.label;

        if (Array.isArray(layer['iconUrlPrint']))
        {
          legendObj['classes'] = []
          for (let idx = 0; idx < layer['iconUrlPrint'].length; idx++)
          {
            let obj = {};
            obj['icons'] = [layer['iconUrlPrint'][idx]['icon']];
            obj['name'] = layer['iconUrlPrint'][idx]['label'];
            legendObj['classes'].push(obj);
          }
        }
        else
        {
          legendObj['icons'] = [layer['iconUrlPrint']];
        }
        this.legendPrint.classes.push(legendObj);
      }
    }
  }

  /*
   * Recursive function to retrieve configuration of map layers to print
   */
  private retrieveLayerToPrint(layer, buildPrintSupportArray)
  {
    // support variables
    let param1 = null;
    let param2 = null;
    let param3 = null;

    switch(layer.id_type)
    {
      case LayerTypology.GROUP:
        let groupItems = layer.layerOL.getLayers().getArray();

        for (var i=0, len=groupItems.length; i<len; i++)
        {
          // retrieve group items layer configuration
          let groupItemId = groupItems[i].get("id");
          let groupItem = this.wgSvc.getLayerObjById(groupItemId);

          let minScale = (groupItem.min_scale) != null ? groupItem.min_scale: 1;
          let maxScale = (groupItem.max_scale) != null ? groupItem.max_scale: Infinity;

          // if group item layer is out of print scale, we skip it,
          // else we have to invoke function to build layer print configuration
          // valorize params to be passed to the function
          if ((groupItem.selected || groupItem.partialSelected)&&
              (Number(this.printEnt.scale) >= minScale &&
               Number(this.printEnt.scale) <= maxScale))
          {
            this.retrieveLayerToPrint(groupItem, buildPrintSupportArray)
          }
        }
        break;

      case LayerTypology.LAYER:
          let minScale = (layer.min_scale) ? layer.min_scale: 1;
          let maxScale = (layer.max_scale) ? layer.max_scale: Infinity;

          // if is current base layer (base layers are always simple layers)
          // or layer is selected and in print scale
          // we have to invoke function to build layer print configuration;
          // else we skip it
          // valorize params to be passed to the function
          if ((layer.isBaseLayer && layer.visibility) ||
              (layer.selected &&
                (Number(this.printEnt.scale) >= minScale &&
                 Number(this.printEnt.scale) <= maxScale)))
          {
            param1 = layer;
            param2 = null;
            param3 = null;
          }

        break;

      case LayerTypology.COMPOSED:

        for (let i=0, len=layer.children.length; i<len; i++)
        {
          let itemsArray = [];
          // retrieve child layer configuration
          let child = layer.children[i];

          let childMinScale = (child.min_scale) ? child.min_scale : 1;
          let childMaxScale = (child.max_scale) ? child.max_scale : Infinity;

          // if child layer is off or out of print scale, we skip it
          if(child.selected &&
              (Number(this.printEnt.scale) >= childMinScale &&
               Number(this.printEnt.scale) <= childMaxScale))
          {
            if (layer.service == ServiceType.WMS)
              itemsArray.push(child.layer_name);
            else
              itemsArray.push(layer.buildFilter(child.filter));

            buildPrintSupportArray.push({
              param1: layer,
              param2: itemsArray,
              param3: child
            });
          }
        }

//         // if array is not empty, we have to invoke function
//         // to build layer print configuration
//         // valorize params to be passed to the function
//         if (itemsArray.length > 0)
//         {
//           param1 = layer;
//           param2 = itemsArray;
//         }

        break;

      case LayerTypology.RASTER:
        break;

      default:
        console.error("Error: type " + layer.id_type + " not managed!");
        console.error(layer);
        break;
    }

    if (param1 != null || param2 != null || param3 != null)
    {
      buildPrintSupportArray.push({
        param1: param1,
        param2: param2,
        param3: param3
      });
    }
  }

  private configureForm()
  {
    // setting format combo
    this.printFormCfg['fg'][1].rows[0][0]["options"] = this.formatOpt;

    // setting scales combo
    let scales = this.wgSvc.getMapCfgObj().getScales();
    for(let idx = 0; idx < scales.length; idx++)
    {
      let scale = scales[idx];
      this.scaleOpt.push({"id": scale, "name": "1:" + scale});
    }
    this.printFormCfg['fg'][1].rows[1][0]["options"] = this.scaleOpt;

    // setting dpi combo
    let dpi = this.printCfg['dpi'];
    for(let idx = 0; idx < dpi.length; idx++)
    {
      let item = dpi[idx];
      this.dpiOpt.push({"id": item.id, "name": item.name});
    }
    this.printFormCfg['fg'][1].rows[1][1]["options"] = this.dpiOpt;

    // valorize Print entity binded to print form
    this.printEnt = new Print({
      format: this.printCfg['default_format'],
      orientation: "Landscape",
      scale: this.wgSvc.getMapCfgObj().getCurrentScale(),
      dpi: this.printCfg['default_dpi']
    });
  }

  private configurePrint()
  {
    // retrieve ore create print layer
    let printLayer = this.wgSvc.getLayerObjById(PrintComponent.printLayerId);
    if (!printLayer)
    {
      // calculate default map extent in current map SR to assign it to
      // editing layer (necessary to enable reprojection on this layer)
      let currentEPSGCode = 'EPSG:' + this.wgSvc.getMapSrCode();

      let printLayerCfg:Object = {
        id:              PrintComponent.printLayerId,
        layer_name:      PrintComponent.printLayerName,
        id_type:         LayerTypology.LAYER,
        opacity:         1,
        visible:         true,
        service:         ServiceType.VECTOR,
        projection:      currentEPSGCode,
        geometry_field:  {'name':'geom','type':GeometryType.POLYGON},
        support:          true
      };

      // build layer and add to the map
      this.wgSvc.manageLayer("I", {cfg: printLayerCfg, isBaseLayer: false});

      this.printLayerOL = this.wgSvc.getLayerObjById(PrintComponent.printLayerId).layerOL;
      this.printLayerOL.setStyle(this.printPreviewStyle);

       // Store the map click behaviour and disable it
      this.mapClickEnabled = this.wgSvc.mapComponent.getDefaultMapClickEnabled();
      this.wgSvc.mapComponent.setDefaultMapClickEnabled(false);

      // create select and translate interaction and add them to the map
      // (these interactions working only on printLayer layer)
      this.selectInteraction = new Select({
        condition: pointerMove,
        layers: [this.printLayerOL],
        style: new Style({
          stroke: new Stroke({
            color: '#5A5A5A',
            width: 1.6
          }),
          fill: new Fill({
            color: [0, 0, 0, 0.15]
          })
        })
      });

      this.translateInteraction = new Translate({
        features: this.selectInteraction.getFeatures(),
        layers: [this.printLayerOL]
      });

      this.wgSvc.mapComponent.map.getInteractions().extend(
        [this.selectInteraction, this.translateInteraction]
      );

      // read new print area extent at the end of translate
      this.translateInteraction.on("translateend", (e:any) =>
      {
        let feature = this.selectInteraction.getFeatures();
        if (feature.getArray().length > 0)
          this.printAreaExtent = feature.getArray()[0].getGeometry().getExtent();
      });

      // change mouse cursor when mouse is over print box feature
      // return key listener because we have to remove it on controller destroy
      this.pointerMoveListenerKey = this.wgSvc.mapComponent.map.on('pointermove', (e:any) =>
      {
        let pixel =  this.wgSvc.mapComponent.map.getEventPixel(e.originalEvent);

        let hit =  this.wgSvc.mapComponent.map.hasFeatureAtPixel(pixel,
          function(layer){return layer.get('id') === PrintComponent.printLayerId;}
        );

        this.wgSvc.mapComponent.map.getTarget().style.cursor = hit ? 'move' : '';
      });
    }
    else
      this.printLayerOL = printLayer.layerOL;

    // Draw area aprint
    this.drawAreaPrint();
  }

  private drawAreaPrint()
  {
    // clear layer from previous feature
    this.printLayerOL.getSource().clear(true);
    this.printLayerOL.getSource().refresh();

    // retrieve selected print format
    let selectedFormat = this.printEnt.format;

    // retrieve selected print orientation
    let selectedOrientation = this.printEnt.orientation;

    // get print area (in mm) [width, height]
    let printArea = this.printCfg['format'][selectedFormat][selectedOrientation];

    // get print extent
    this.printAreaExtent = this.getPrintExtent(this.wgSvc.mapComponent.view.getCenter(), printArea);

    // convert extent to geometry
    let printRectGeom = fromExtent(this.printAreaExtent);

    // create feature
    let printRectFeature = new Feature({
      name: 'printBox',
      geometry: printRectGeom
    });

    this.printLayerOL.getSource().addFeature(printRectFeature);
  }

    /*
   * Retrieve print extent
   */
  private getPrintExtent(center, printArea)
  {
    // meters per map unit
    let MPU = METERS_PER_UNIT[getProjection('EPSG:'+ this.wgSvc.getMapSrCode()).getUnits()];

    /*
     * Calculate width and height of print area:
     *
     *              pixel       inch       m         m
     * ((( pixel / ------- ) / -------) * --- ) / -------- = map unit
     *              inch         m         m      map unit
     *
     */
    let width  = (((printArea[0]/this.wgSvc._screenDPI)/this.wgSvc._IPM) * Number(this.printEnt.scale))/MPU;

    let height = (((printArea[1]/this.wgSvc._screenDPI)/this.wgSvc._IPM) * Number(this.printEnt.scale))/MPU;

    return [
      center[0] - width/2,
      center[1] - height/2,
      center[0] + width/2,
      center[1] + height/2
    ];
  }
}
