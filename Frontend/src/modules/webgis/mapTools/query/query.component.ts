
import { Component, OnInit }           from '@angular/core';

import { HttpClient }                  from '@angular/common/http';

import {Subscription}                  from 'rxjs';


import {unByKey}                       from 'ol/Observable';
import Overlay                         from 'ol/Overlay';
import GeoJSON                         from  'ol/format/GeoJSON';
import WMSGetFeatureInfo               from  'ol/format/WMSGetFeatureInfo';

import {Stroke,
        Circle,
        Fill,
        Style}                         from 'ol/style.js';

import {WebgisService}                 from '../../webgis.service';

import {ConfigService}                 from '../../../core/config.service';

import { AuthService }                 from '../../../core/auth.service';

import {ServiceType,
        LayerTypology,
        fromDDToDMS,
        fromDMSToDD,
        getCodeFromEpsgString}         from '../../webgis.util';

import { parseString }                 from 'xml2js';

@Component({
  selector: 'webgis-query',
  templateUrl: './query.component.html',
  styleUrls: ['./query.component.css']
})

export class QueryComponent implements OnInit
{
  dictLayerQueryable: Object = {};

  // dictionary with key equal layer to layer name and object equal to info
  dLayersAttributes: Object = {};

  // boolean to store the map click behaviour (check if enabled or disabled map click)
  mapClickEnabled: boolean = false;

  /* Listener interaction map */
  pointerMoveListenerKey = null;
  pointerSingleClickListenerKey = null;

  showNoLayerMsg = null;

  // retrieve service layer for info highlight
  layerHighlight = null;

  // array of infos returned from getFeatureInfo
  getFeatureInfoArray = null;

  // Custom Coordinate Format function
  customCoordFormat = null;

  clickPointCoord   = null;

  numResult = 0;

  // flag to show loader while getFeatureInfo is awaiting response
  showLoader = false;

  // style to hilight linear and areal features
  lineAreaHighlightStyle = new Style(
    {
      stroke: new Stroke({
        color: '#FF0000',
        width: 2
      })
    }
  );

  // style to hilight point features
  pointHighlightStyle = new Style({
    image: new Circle(
      {
        radius: 24,
        fill: new Fill({
          color: '#FF0000'
        })
      })
    }
  );

  constructor(
    private webgisSvc:WebgisService,
    private configSvc:ConfigService,
    private authSvc: AuthService,
    private http:HttpClient
  ) {}

  ngOnInit()
  {
    this.dictLayerQueryable = {};

    for (let i = 0; i < this.webgisSvc.getArray("queryable").length; i++)
    {
      let item = this.webgisSvc.getArray("queryable")[i];
      let layer = this.webgisSvc.getLayerObjById(item['id']);
      if (layer && layer.service)
      {
        if (layer.service == ServiceType.WMS)
          this.dictLayerQueryable[item['id']] = layer;
      }
      else
      {
        if (layer &&
          layer.id_parent) // Item of composed
        {
          let parent = this.webgisSvc.getLayerObjById(layer.id_parent);
          if (parent.service && parent.service == ServiceType.WMS)
            this.dictLayerQueryable[item['id']] = layer;
        }
      }
    }

    // Get Custom Coordinate Format function
    this.customCoordFormat = this.webgisSvc.mapComponent.customCoordFormat();

     // Store the map click behaviour
    this.mapClickEnabled = this.webgisSvc.mapComponent.getDefaultMapClickEnabled();

    // Disable map click
    this.webgisSvc.mapComponent.setDefaultMapClickEnabled(false);

    // Retrieve map markers overlay
    this.layerHighlight = this.webgisSvc.getLayerObjById(9998).layerOL;

    // add listener on pointer move
    this.pointerMoveListenerKey = this.webgisSvc.mapComponent.map.on('pointermove', (event) =>
    {
      if (event.dragging)
      {
        this.webgisSvc.mapComponent.map.getTargetElement().style.cursor = 'default';
        return;
      }

      this.webgisSvc.mapComponent.map.getTargetElement().style.cursor = 'pointer';
    });

    // add listener on pointer single click
    this.pointerSingleClickListenerKey = this.webgisSvc.mapComponent.map.on('singleclick', (evt) =>
    {
       this.resetInfo();

      // Get clicked point coordinate
      this.clickPointCoord = evt.coordinate;

      // Clear featureinfo array
      this.getFeatureInfoArray = [];

      this.showLoader = true;

      let viewResolution = this.webgisSvc.mapComponent.view.getResolution();
      let numLayerToQuery = 0;

      // cicle on queryable and visible layers
      let layVis = Object.values(this.dictLayerQueryable).filter(
        (lay) => {return lay.visibility && lay.info_format;}
      );

      let count = 0;

      for (var idx=0, len = layVis.length; idx<len; idx++)
      {
        let layer = layVis[idx];

        let queryCfg = layer.objAttributes['query'];

        if (layer.visibility)
        {
          numLayerToQuery++;
          this.showLoader = true

          this.queryLayer(layer, queryCfg,  evt.coordinate, viewResolution,
            obj =>
            {
              count++;
              if (count == len)
                this.showLoader = false;

              if (obj) this.getFeatureInfoArray.push(obj);
              this.numResult = this.getFeatureInfoArray.filter((item) => {return item.data.length;}).length;
            }
          );
        }
      }

      this.showNoLayerMsg = numLayerToQuery ? false : true;

      if (this.showNoLayerMsg)
        this.showLoader = false;

    });

  }

  ngOnDestroy()
  {
    // Restore previous map click behaviour
    this.webgisSvc.mapComponent.setDefaultMapClickEnabled(this.mapClickEnabled);

    // remove listener
    unByKey(this.pointerMoveListenerKey);
    unByKey(this.pointerSingleClickListenerKey);

    // remove features from source (if is not null)
    if (this.layerHighlight && this.layerHighlight.getSource())
    {
      this.layerHighlight.getSource().clear(true);
      this.layerHighlight.getSource().refresh();
    }

  }

  /* Private function */

  /*
   * Execute GetFeatureInfo on layer given its id and coordinate
   */
  queryLayer(layer, queryCfg, coords, viewResolution, callback)
  {
    let layerId   = layer.id;
    let layerName = layer.label;

//     let parentName  = null;
    let layerOL     = null;
    let layerSource = null;

    // layer is a group item or composed layer item:
    // we need to access to group configuration to retrieve item layer
    if (layer.id_parent)
    {
      let parentCfg = this.webgisSvc.getLayerObjById(layer.id_parent);

//       let parentName = parentCfg.label;

      if (parentCfg.id_type == LayerTypology.GROUP)
      {
        let itemsArray = parentCfg.layerOL.getLayers().getArray();

        for (let idx=0, len=itemsArray.length; idx<len; idx++)
        {
          if (itemsArray[idx].get('id') == layerId)
          {
            layerOL     = itemsArray[idx];
            layerSource = layerOL.getSource();
          }
        }
      }
      else
      {
        layerOL = parentCfg.layerOL;
        layerSource = parentCfg.getSource();
      }
    }
    else
    {
      layerOL     = layer.layerOL;
      layerSource = layerOL.getSource();
    }

    // Put the queryable configuration into the dictionary
    this.dLayersAttributes[layerId] = queryCfg;

    // check for errors
    if (!layerOL)
    {
      console.error("ERROR: not layer founded with id " + layerId);
      return;
    }

    let newCoords = [];

    // Reproject coordinate
    if (getCodeFromEpsgString(layer.projection) != this.webgisSvc.getMapSrCode())
    {
       newCoords = this.webgisSvc.transformCoords(
         coords,
         'EPSG:'+ this.webgisSvc.getMapSrCode(),
         'EPSG:'+ getCodeFromEpsgString(layer.projection));
    }
    else
      newCoords = coords;

    let url = layerSource.getGetFeatureInfoUrl(
      newCoords,
      viewResolution,
      layer.projection,
      {
        'INFO_FORMAT'  : layer.info_format
      }
    );

    if (url)
    {
      // add layerId in query string to use it on asynchronous response
      url += '&layerId='+layerId;

      let reqOpt:any = {
        headers: {"it_app_auth": this.authSvc.getToken()}
      };

      if (layer.info_format != 'application/json')
        reqOpt['responseType'] = "text";

      // if url is an absolute url, we have to proxy it
      if (url.indexOf('http') == 0)
        url = this.configSvc.urlPrefix.er + "/utility/proxy?url=" + encodeURIComponent(url);

      this.http.get(url,reqOpt).subscribe
      (
        response =>
        {
          if (response)
          {
            // case application/json
            if(response['features']) //&& response['features'].length
            {
              let source = null;
              let attributes = [];
              let parser = new GeoJSON();

              // put features on layerHighlight to highlight them
              let features = parser.readFeatures(response);

              if (features.length > 0)
              {
                if (layer.id_parent)
                {
                  let parentCfg = this.webgisSvc.getLayerObjById(layer.id_parent);
                  source = parentCfg.getSource();
                }
                else
                  source = layer.getSource();

                let layProj = source.getProjection().getCode();
                let mapProj = this.webgisSvc.mapComponent.view.getProjection().getCode();

                // before to apply a style, verify if feature has a geometry
                // (if is a raster there isn't geometry)
                if (features[0].getGeometry())
                {
                  // reproject features
                  if (layProj != mapProj)
                  {
                    for (var idx=0, len=features.length; idx<len; idx++)
                    {
                      features[idx].setGeometry(
                        features[idx].getGeometry().transform(layProj, mapProj)
                      );
                    }
                  }

                  // set layer style
                  switch(features[0].getGeometry().getType())
                  {
                    case 'LineString':
                    case 'MultiLineString':
                    case 'Polygon':
                    case 'MultiPolygon':
                      this.layerHighlight.setStyle(this.lineAreaHighlightStyle);
                      break;

                    case 'Point':
                    case 'MultiPoint':
                      this.layerHighlight.setStyle(this.pointHighlightStyle);
                      break;
                  }

                  this.layerHighlight.getSource().addFeatures(features);
                }

                if (this.dLayersAttributes[layerId].length == 1 &&
                  this.dLayersAttributes[layerId][0].key == null &&
                  this.dLayersAttributes[layerId][0].query == true)
                {
                  for (let i= 0; i< Object.keys(response['features'][0]['properties']).length; i++)
                  {
                    let item = Object.keys(response['features'][0]['properties'][i]);
                    attributes.push({key: item, label: item});
                  }
                }
                else
                {
                  /* Show selected attributes for selected feature */
                  for (let j=0; j< this.dLayersAttributes[layerId].length; j++)
                  {
                    let item = this.dLayersAttributes[layerId][j];
                    attributes.push({key: item['key'], label: item['label']});
                  }
                }
              }

              let data = [];
              for(let i = 0; i < attributes.length; i++)
              {
                let item = attributes[i];
                let obj = {};
                obj[item['label']] = response['features'][0]['properties'][item['key']];
                data.push(obj);
              }

              let objJson =
              {
                layerName: layerName,
                data: data,
                format: 'json'
              };

              callback(objJson);
            }
            else
            {
              //case xml -> parse xml response
              parseString(response,{explicitArray:false},(err,res) =>
              {
                if (!err && res)
                {
                  /* check if use parse Esri or geoserver */
                  console.log(Object.values(res));
                  let ret = Object.values(res).some(
                    (item) =>
                    {
                      return item["$"]['xmlns'].includes("esri");
                    }
                  );

                  if (ret) //parse ESRI
                  {
                    let showAllAttr = null;
                    let attributes = [];
                    /* Show all attributes for selected feature */
                    if (this.dLayersAttributes[layerId].length == 1 &&
                      this.dLayersAttributes[layerId][0].key == null &&
                      this.dLayersAttributes[layerId][0].query == true)
                    {
                      showAllAttr = true;
                      attributes = Object.keys(res["FeatureInfoResponse"]["FIELDS"]["$"]);
                    }
                    else
                    {
                      showAllAttr = false;
                      /* Show selected attributes for selected feature */
                      for (let j=0; j< this.dLayersAttributes[layerId].length; j++)
                      {
                        let item = this.dLayersAttributes[layerId][j];
                        attributes.push({key: item['key'], label: item['label']});
                      }
                    }

                    let data = [];
                    data.push(this.parseEsri(res, showAllAttr, attributes));

                    // push data into array to view them
                    let objXml =
                    {
                      layerName: layerName,
                      data: data,
                      format: 'xml'
                    };

                    callback(objXml);
                  }
                  else
                  {
                    // TODO other parse
                  }
                }
                else
                {

                  // case text/plain
                  let data = response;
                  let objPlain =
                  {
                    layerName: layerName,
                    data: data,
                    format: 'plain'
                  };

                  callback(objPlain);
                }
              });
            }
          }
        },
        err =>
        {
          console.error("ERROR: " + err);
          this.showLoader = false;
        }
      );
    }
  }


  resetInfo = function()
  {
    this.getFeatureInfoArray = null;
    this.clickPointCoord     = null;

    this.numResult = 0;

    this.layerHighlight.getSource().clear();
  }

  /* Private function*/
  parseEsri(xml, allAttr, attributes)
  {
    console.log("esri");
    console.log(xml);

    let retFeatures = [];

    if (allAttr)
      return xml["FeatureInfoResponse"]["FIELDS"]["$"];
    else
    {
      for(let i = 0; i < attributes.length; i++)
      {
        let item = attributes[i];
        let obj = {};
        obj[item['label']] = xml["FeatureInfoResponse"]["FIELDS"]["$"][item['key']];
        retFeatures.push(obj);
      }
      return retFeatures.length ? retFeatures : null;
    }
  }

  parseGeoserver(xml, allAttr, attributes)
  {

    return null;
  }
}
