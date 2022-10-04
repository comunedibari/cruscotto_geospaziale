import {Component, OnInit,
        Input, ViewChild}           from '@angular/core';

import VectorLayer                  from 'ol/layer/Vector.js';
import VectorSource                 from 'ol/source/Vector.js';
import LineString                   from 'ol/geom/LineString.js';
import Polygon                      from 'ol/geom/Polygon.js';
import {getArea, getLength,
        getDistance}                from 'ol/sphere.js';

import Draw                         from 'ol/interaction/Draw';

import {containsCoordinate}         from 'ol/extent.js'

import Overlay                      from 'ol/Overlay';

import {Stroke, Fill,
        Style, Circle}              from 'ol/style.js';

import {FormComponent}              from '../../../core/form/form.component';

import {WebgisService}              from '../../webgis.service';

import {WGTool}                     from '../../entity/wgtool';

import {SR,getCoordNumDec,
      fromDDToDMS,fromDMSToDD}      from '../../webgis.util';

@Component({
  selector: 'webgis-measure',
  templateUrl: './measure.component.html',
  styleUrls: ['./measure.component.css']
})

export class MeasureComponent implements OnInit
{
  cfg: WGTool;

  @ViewChild(FormComponent) coordsFormComp: FormComponent;

  buttons: Array<Object> = [
    {name: "coords", tooltip: "WEBGIS.COORDS_CONVERT", selected: false},
    {name: "length", tooltip: "WORD.DISTANCE", selected: false},
    {name: "area", tooltip: "WORD.AREA", selected: false}
  ];

  selected: boolean = false;
  btnSelected: Object = null;

  // define object for changing um
  objUm: Object = {};

  // define object for changing coords
  coordsObj: Object = {};
  lengthOptions: Array<any> = [];
  areaOptions: Array<any> = [];

  // boolean to store the map click behaviour (check if enabled or disabled map click)
  mapClickEnabled: boolean = false;

  // Overlay to show markers on the map
  markerOverlay: Overlay;

  // service layer for measure
  measureLayer = null;

  // interaction to draw length or area
  interaction: any = null;

  // Identifier of measure layer
  static readonly measureLayerName = '_MEASURE_LAYER_';

  // define style vector length
  styleLength = new Style(
  {
    image: new Circle({radius: 2,fill:  new Fill({color: "rgba(255, 0, 0, 1)"})}),
    stroke:new Stroke({color: "rgba(255, 0, 0, 1)",width: 1})
  });

  // define style vector area
  styleArea = new Style(
  {
    image:  new Circle({radius: 2,fill:  new Fill({color: "rgba(255, 0, 0, 1)"})}),
    fill:   new Fill({color: "rgba(192,192,192,0.4)"}),
    stroke: new Stroke({color: "rgba(255, 0, 0, 1)",width: 1})
  });

  // coordinate management form configuration
  coordsFormCfg =
  {
    id: "coordsForm", fg:
    [
      {
        label: "WORD.REFERENCE_SYSTEM", rows:
        [
          [
            {
              key: "mapSR",
              type: "select",
              width: 12,
              options: []
            }
          ]
        ]
      },
      {
        label: "WEBGIS.COORDS_ACQUISITION", rows:
        [
          [
            {
              key: "xCoord",
              type: "text",
              label: this.wgSvc.getMapSR()['x_label'],
              width: 6,
              required: true
            },
            {
              key: "yCoord",
              type: "text",
              label: this.wgSvc.getMapSR()['y_label'],
              width: 6,
              required: true
            }
          ],
          [
            {
              key: "selectCoords",
              type: "button",
              btnLabel: "WEBGIS.POINT_SELECT",
              width: 4
            },
            {
              key: "goToCoords",
              type: "button",
              btnLabel: "WORD.ZOOM",
              width: 4,
            },
            {
              key: "resetCoords",
              type: "button",
              btnLabel: "WORD.CANCEL",
              width: 4,
            }
          ]
        ]
      },
      {
        label: "WEBGIS.COORDS_CONVERT", rows:
        [
          [
            {
              key: "convertSR",
              type: "select",
              label: "WORD.NEW_REFERENCE_SYSTEM",
              width: 12,
              options: [],
              required: true
            }
          ],
          [
            {
              key: "convertCoords",
              type: "button",
              btnLabel: "WORD.CONVERT",
              width: 6
            },
            {
              key: "resetConvert",
              type: "button",
              btnLabel: "WORD.CANCEL",
              width: 6
            }
          ],
          [
            {
              key: "xCoordNew",
              type: "text",
              width: 6,
              disabled: true,
            },
            {
              key: "yCoordNew",
              type: "text",
              width: 6,
              disabled: true
            }
          ]
        ]
      }
    ]
  };

  constructor(private wgSvc:WebgisService) {}

  ngOnInit()
  {
    // Store the map click behaviour
    this.mapClickEnabled = this.wgSvc.mapComponent.getDefaultMapClickEnabled();

    // Set length options
    let lengthKeys = Object.keys(this.cfg['params']['length']['options']);

    for(let i = 0; i<lengthKeys.length; i++)
    {

      let key = lengthKeys[i];
      let optLength = this.cfg['params']['length']['options'][key];

      this.lengthOptions.push(
        {
          id: key,
          label: optLength['label']
        });

      if(optLength['default'])
        var defLen = {um: key, opt: optLength}
    }

    // Set area options
    let areaKeys = Object.keys(this.cfg['params']['area']['options']);

    for(let i = 0; i<areaKeys.length; i++)
    {

      let key = areaKeys[i];
      let optArea = this.cfg['params']['area']['options'][key];

      this.areaOptions.push(
        {
          id: key,
          label: optArea['label']
        });

      if(optArea['default'])
        var defArea = {um: key, opt: optArea}
    }

    // initialize object who contains current status of measure for each type
    this.objUm['length'] = {value:0,um:defLen['um'],symbol:defLen['opt']['symbol']};

    this.objUm['last_segment']={value:0,um:defLen['um'],symbol:defLen['opt']['symbol']};

    this.objUm['area'] = {value:0,um:defArea['um'],symbol:defArea['opt']['symbol']};

    this.objUm['perimeter'] = {value:0,um:defLen['um'],symbol:defLen['opt']['symbol']};

    // Set SR options
    let coordsOptions = [];
    let coordsKeys = Object.keys(this.wgSvc.getMapCfgObj().getMapSr());

    for(let i = 0; i<coordsKeys.length; i++)
    {
      let key = coordsKeys[i];
      coordsOptions.push(
      {
        id: Number(key),
        name: this.wgSvc.getMapCfgObj().getMapSr()[key]['prefix']
      });
    }

    this.coordsFormCfg.fg[0].rows[0][0]['options'] = coordsOptions;
    this.coordsFormCfg.fg[2].rows[0][0]['options'] = coordsOptions;

    /*
     * Init object binded to coordinate form
     */

    if(this.wgSvc.getMapSR()['id'] == SR.WGS84DMS)
    {
      // Set coords fields's type as text
      this.coordsFormCfg.fg[1].rows[0][0]['type'] = "text";
      this.coordsFormCfg.fg[1].rows[0][1]['type'] = "text";
    }
    else
    {
      // Set coords fields's type as number
      this.coordsFormCfg.fg[1].rows[0][0]['type'] = "number";
      this.coordsFormCfg.fg[1].rows[0][1]['type'] = "number";
    }
    this.coordsObj =
    {
      mapSR: this.wgSvc.getMapSR()['id'],
      xCoord: null,
      yCoord: null
    };

    // Disable map click
    this.wgSvc.mapComponent.setDefaultMapClickEnabled(false);

    // retrieve map markers overlay
    this.markerOverlay = this.wgSvc.mapComponent.map.getOverlayById('mapMarkerOverlay');
  }

  ngOnDestroy()
  {
    this.resetInteraction();

    // Restore previous map click behaviour
    this.wgSvc.mapComponent.setDefaultMapClickEnabled(this.mapClickEnabled);

    // hide marker from map
    this.markerOverlay.setPosition(undefined);

  }

  /*
  * Methods
  */
  onCoordsFormChanged(change)
  {
    this.coordsObj[change.key] = change.val;
    switch (change.key)
    {
      case "mapSR":
         // change map SR
        this.wgSvc.mapComponent.setMapSR(change.val);

        // empties fields from previous values
        this.coordsObj['xCoord'] = null;
        this.coordsObj['yCoord'] = null;

        this.coordsFormComp.setValueForKey('xCoord',this.coordsObj['xCoord']);
        this.coordsFormComp.setValueForKey('yCoord',this.coordsObj['yCoord']);

        // empties fields from previous values
        this.coordsObj['xCoordNew'] = null;
        this.coordsObj['yCoordNew'] = null;

        this.coordsFormComp.setValueForKey('xCoordNew',this.coordsObj['xCoordNew']);
        this.coordsFormComp.setValueForKey('yCoordNew',this.coordsObj['yCoordNew']);

        // Define mask to show DMS correctly
        if(change.val == SR.WGS84DMS)
        {
          let mask = "99° 99' 99.9\"";
          // Set coords fields's type as text
          this.coordsFormCfg.fg[1].rows[0][0]['type'] = "mask";
          this.coordsFormCfg.fg[1].rows[0][1]['type'] = "mask";
          // Set mask to the coords field
          this.coordsFormCfg.fg[1].rows[0][0]['mask'] = mask;
          this.coordsFormCfg.fg[1].rows[0][1]['mask'] = mask;
        }
        else
        {
          // Set coords fields's type as number
          this.coordsFormCfg.fg[1].rows[0][0]['type'] = "number";
          this.coordsFormCfg.fg[1].rows[0][1]['type'] = "number";
        }

        // change label on coords fields
        this.coordsFormCfg.fg[1].rows[0][0]['label'] = this.wgSvc.getMapSR()['x_label'];
        this.coordsFormCfg.fg[1].rows[0][1]['label'] = this.wgSvc.getMapSR()['y_label'];
        break;

      case "convertSR":
        // empties fields from previous values
        this.coordsObj['xCoordNew'] = null;
        this.coordsObj['yCoordNew'] = null;

        this.coordsFormComp.setValueForKey('xCoordNew',this.coordsObj['xCoordNew']);
        this.coordsFormComp.setValueForKey('yCoordNew',this.coordsObj['yCoordNew']);

        let newSR = this.wgSvc.getMapCfgObj().getSrById(change.val)

        // check for change label on coords fields
        this.coordsFormCfg.fg[2].rows[2][0]['label'] = newSR.x_label;
        this.coordsFormCfg.fg[2].rows[2][1]['label'] = newSR.y_label;
        break;

      case "selectCoords":

        // empties fields from previous values
        this.coordsObj['xCoord'] = null;
        this.coordsObj['yCoord'] = null;

        // invoke function to get coords values
        this.wgSvc.getCoordinate((coordinates) =>
        {
          this.coordsObj['xCoord'] = coordinates[0];
          this.coordsObj['yCoord'] = coordinates[1];

          this.coordsFormComp.setValueForKey('xCoord',this.coordsObj['xCoord']);
          this.coordsFormComp.setValueForKey('yCoord',this.coordsObj['yCoord']);
        });
        break;

      case "goToCoords":
        // check if the coords fields are valued
        if (this.coordsObj['xCoord'] != null && this.coordsObj['yCoord'] != null)
        {
          let newSR = this.wgSvc.getMapCfgObj().getSrById(this.coordsObj['mapSR']);
          let coordArray = [];

          switch(newSR.id)
          {
            case SR.WGS84DMS:
              coordArray = [
                fromDMSToDD(this.coordsObj['xCoord']),
                fromDMSToDD(this.coordsObj['yCoord'])
              ];
              break;

            default:
              coordArray = [this.coordsObj['xCoord'],this.coordsObj['yCoord']];
          }

          let mapExtent  =this.wgSvc.getMapSR()['mapExtent']

          // check if the coords are valid (into bounding box)
          if (containsCoordinate(mapExtent, coordArray))
          {
            // center map
            this.wgSvc.mapComponent.view.setCenter(coordArray);

            // show overlay
            this.markerOverlay.setPosition(coordArray);

            this.wgSvc.mapComponent.view.setZoom(this.wgSvc.getMapCfgObj()['point_zoom_level']);
          }
        }
        break;

      case "resetCoords":
        this.coordsObj['xCoord'] = null;
        this.coordsObj['yCoord'] = null;

        this.coordsFormComp.setValueForKey('xCoord',this.coordsObj['xCoord']);
        this.coordsFormComp.setValueForKey('yCoord',this.coordsObj['yCoord']);

        // hide marker from map
        this.markerOverlay.setPosition(undefined);
        break;

      case "convertCoords":
        if (!this.coordsFormComp.isValid())
          return;

        // empties fields from previous values
        this.coordsObj['xCoordNew']     = null;
        this.coordsObj['yCoordNew']     = null;

        // check if the coords fields are valued
        if (this.coordsObj['xCoord'] != null && this.coordsObj['yCoord'] != null)
        {
          // check if dest SR combo is valued
          if(this.coordsObj.hasOwnProperty('convertSR'))
          {
            let coordArray = [];

            let fromSR = this.wgSvc.getMapCfgObj().getSrById(this.coordsObj['mapSR']);
            let toSR   = this.wgSvc.getMapCfgObj().getSrById(this.coordsObj['convertSR']);

            switch(fromSR.id)
            {
              case SR.WGS84DMS:
                coordArray = [
                  fromDMSToDD(this.coordsObj['xCoord']),
                  fromDMSToDD(this.coordsObj['yCoord'])
                ];
                break;

              default:
                coordArray = [this.coordsObj['xCoord']*1, this.coordsObj['yCoord']*1];
            }

            // set any as type because we could have number or string (WGS84DMS) in this array
            var convertedCoords:Array<any> = this.wgSvc.transformCoords(
              coordArray,
              'EPSG:'+fromSR.code, 'EPSG:'+toSR.code);

            let newProjUnits = toSR.units;

            let numDec = getCoordNumDec(newProjUnits);

            switch(toSR.id)
            {
              case SR.WGS84DMS:
                convertedCoords = [
                  fromDDToDMS(convertedCoords[0]),
                  fromDDToDMS(convertedCoords[1])
                ];

                this.coordsObj['xCoordNew'] = convertedCoords[0];
                this.coordsObj['yCoordNew'] = convertedCoords[1];
                break;

              default:
                convertedCoords = [
                  convertedCoords[0].toFixed(numDec)*1,
                  convertedCoords[1].toFixed(numDec)*1
                ];

                this.coordsObj['xCoordNew']  = convertedCoords[0];
                this.coordsObj['yCoordNew']  = convertedCoords[1];
            }
          }
        }

        this.coordsFormComp.setValueForKey('xCoordNew',this.coordsObj['xCoordNew']);
        this.coordsFormComp.setValueForKey('yCoordNew',this.coordsObj['yCoordNew']);
        break;

      case "resetConvert":
        // empties fields from previous values
        this.coordsObj['xCoordNew']     = null;
        this.coordsObj['yCoordNew']     = null;

        this.coordsFormComp.setValueForKey('xCoordNew',this.coordsObj['xCoordNew']);
        this.coordsFormComp.setValueForKey('yCoordNew',this.coordsObj['yCoordNew']);

        // remove labels from converted coords fields
        this.coordsFormCfg.fg[2].rows[2][0]['label'] = null;
        this.coordsFormCfg.fg[2].rows[2][1]['label'] = null;

        // reset combo
        this.coordsObj['convertSR'] = null;
        this.coordsFormComp.setValueForKey('convertSR',this.coordsObj['convertSR']);
        break;
    }
  }

  setCfg(cfg: WGTool)
  {
    this.cfg = cfg;
  }

  selectMeasureTool(measureType)
  {
    for(let i=0; i< this.buttons.length; i++)
    {
      if(this.buttons[i]['name'] == measureType)
      {
        this.buttons[i]['selected'] = !this.selected;
        this.btnSelected = this.buttons[i];
      }
      else
        this.buttons[i]['selected'] = this.selected;
    }

    if (measureType == 'coords')
      this.resetInteraction();
    else
    {
      // settings default value for each type of measure
      this.objUm['length']['value'] = 0;
      this.objUm['area']['value']      = 0;
      this.objUm['perimeter']['value'] = 0;

      if (measureType == "length")
        this.objUm['last_segment']['value'] = 0;

      // build vector draw
      this.buildVectorDraw(measureType);
    }
  }

  changeMeasure(um, type)
  {
    var objUmCfg = {};

    // type of measure who was selected
    switch(type)
    {
      case "length":
      case "last_segment":
      case "perimeter":
        objUmCfg = this.cfg['params']['length']['options'];
        break;

      case "area":
        objUmCfg = this.cfg['params']['area']['options'];
        break;
    }

    // update object with last changed of um
    this.objUm[type]['um']     = um;
    this.objUm[type]['symbol'] = objUmCfg[um]['symbol'];

    // update value of measure with last changed of um
    if (this.objUm[type].hasOwnProperty('current_value'))
    {
      let current = this.objUm[type]['current_value'];
      let current_um = current['um'];
      let conversion_meters = current['value'] / objUmCfg[current_um]['factor'];
      let measure_final = conversion_meters * objUmCfg[um]['factor'];
      let output = measure_final.toFixed(2);

      this.objUm[type]['value'] = output;
    }
  }

  /*
   * Private Methods
   */
  private buildVectorDraw(measureType)
  {
    if (this.interaction)
    {
      this.wgSvc.mapComponent.map.removeInteraction(this.interaction);
      this.interaction = null;
    }

    let geom = null;

    // set style related to selected measure type
    let style = (measureType == "length") ? this.styleLength : this.styleArea;

    // remove if exist, previous draw layer
    this.wgSvc.mapComponent.map.removeLayer(this.measureLayer);

    // create vector draw
    let source = new VectorSource({wrapX: false});
    this.measureLayer = new VectorLayer({source: source,style: style});

    this.measureLayer.set("id", MeasureComponent.measureLayerName);

    this.interaction = new Draw(
    {
      source: source,
      type: (measureType == 'length') ? 'LineString' : 'Polygon',
      id: measureType,
      style: style
    });

    // Add interaction to map
    this.wgSvc.mapComponent.map.addInteraction(this.interaction);

    // start drawing
    this.interaction.on('drawstart',(e) =>
    {
      source.clear();
      this.wgSvc.mapComponent.map.removeLayer(this.measureLayer);
      geom = e.feature.getGeometry();

    });

    // finish draw
    this.interaction.on('drawend',(e) =>
    {
      this.wgSvc.mapComponent.map.addLayer(this.measureLayer);
      geom = {};
    });

    // event pointer move to calculate length or area
    this.wgSvc.mapComponent.map.on('pointermove', (event) =>
    {
      // get length of vector line drew
      if (geom instanceof LineString)
      {
        let output = this.formatLength(geom,"length");

        // calculate length of last segment
        geom.forEachSegment((i,v) =>
        {
          let last_segment = this.formatLength(new LineString([i,v]),"last_segment");

          this.objUm['last_segment']['value'] = last_segment;
        });

        // get total length
        this.objUm['length']['value'] = output;

      }

      // get area of vector polygon drew
      if (geom instanceof Polygon)
      {
        let output = this.formatArea(geom);

        this.objUm['area']['value'] = output['area'];
        this.objUm['perimeter']['value'] = output['perimeter'];
      }
    });
  }

  private formatArea(polygon)
  {
    let um_area = this.objUm['area']['um'];
    let convertor_area = this.cfg['params']['area']['options'][um_area]['factor'];

    let um_perimeter = this.objUm['perimeter']['um'];
    let convertor_perimeter = this.cfg['params']['length']['options'][um_perimeter]['factor'];

    let mapProjection = this.wgSvc.mapComponent.map.getView().getProjection();

    let area = getArea(polygon, {projection: mapProjection});

    // Convert area
    let areaConvert = area * convertor_area;
    let outputArea = areaConvert.toFixed(2);

    // stores value and um for area
    this.objUm['area']['current_value'] = {value: areaConvert, um: um_area};

    let geom = (polygon.clone().transform(mapProjection, 'EPSG:4326'));
    let coordinates = geom.getLinearRing(0).getCoordinates();

    let length = 0;
    let first_point = coordinates[0];
    let last_point  = coordinates[coordinates.length -1];
    let last_line   = getDistance(first_point, last_point);

    for (let i = 0, len = coordinates.length - 1; i < len; ++i)
    {
      let c1 = coordinates[i];
      let c2 = coordinates[i + 1];

      length += getDistance(c1, c2);
    }

    // Convert perimeter
    let perimeter_measure = (length + last_line) * convertor_perimeter;
    let outputPerimeter = perimeter_measure.toFixed(2);

    // stores value and um of last measure for perimeter
    this.objUm['perimeter']['current_value'] = {value: perimeter_measure, um: um_perimeter};

    return { area: outputArea, perimeter: outputPerimeter};
  }

  private formatLength(line, type)
  {
    let output = null, um = null, convertor = null, symbol = null, lineConvert = null;
    // Return length in meters
    let length = getLength(
          line,
          {projection: this.wgSvc.mapComponent.map.getView().getProjection()}
      );

    // get value + symbol for measure of length
    if (type == "length")
    {
      um = this.objUm['length']['um'];
      convertor = this.cfg['params']['length']['options'][um]['factor'];
      symbol = this.objUm['length']['symbol'];
      lineConvert = length * convertor;

      // stores value and um of length
      this.objUm['length']['current_value'] = {
        value: lineConvert,
        um: um
      };

      output = lineConvert.toFixed(2);
    }
    // get value + symbol for measure of the last segment
    else
    {
      um = this.objUm['last_segment']['um'];
      convertor = this.cfg['params']['length']['options'][um]['factor'];
      symbol = this.objUm['last_segment']['symbol'];
      lineConvert = length * convertor;

      // stores value and um of last segment
      this.objUm['last_segment']['current_value'] = {
        value: lineConvert,
        um: um
      };

      output = lineConvert.toFixed(2);
    }

    return output;
  }

  private resetInteraction()
  {
    // Remove interaction
    if (this.interaction) this.wgSvc.mapComponent.map.removeInteraction(this.interaction);

    // Remove measureLayer to map
    if (this.measureLayer) this.wgSvc.mapComponent.map.removeLayer(this.measureLayer);

    this.measureLayer = null;
  }
}
