import { Component, OnInit, Input,
          Output, EventEmitter,
          ViewChildren, QueryList}  from '@angular/core';

import {HttpClient}                 from '@angular/common/http';

import WFS                          from 'ol/format/WFS.js';
import GeoJSON                      from 'ol/format/GeoJSON.js';

import GeometryCollection           from 'ol/geom/GeometryCollection.js';

import {pointerMove}                from 'ol/events/condition.js';

import Select                       from 'ol/interaction/Select';

import {unByKey}                    from 'ol/Observable';

import {transformExtent}            from 'ol/proj.js';

import {Stroke,
        Fill,
        Circle,
        Text,
        Icon,
        RegularShape,
        Style}                      from 'ol/style.js';

import {ContextService}             from '../../../../core/context.service';

import {ConfigService}              from '../../../../core/config.service';

import {HttpReaderService}          from '../../../../core/http-reader.service';

import {FormComponent}              from '../../../../core/form/form.component';

import {ServiceType,
        GeometryType,
        OutputFormat,
        maxFeatureInSearch,
        LayerTypology}              from '../../../webgis.util';

import {WebgisService}              from '../../../webgis.service';

import {WGStyle}                    from '../../../entity/wgStyle';

@Component({
  selector: 'webgis-search-condition',
  templateUrl: './search-condition.component.html',
  styleUrls: ['./search-condition.component.css']
})
export class SearchConditionComponent implements OnInit
{
  @ViewChildren(FormComponent) qlFormCondition: QueryList<FormComponent>;

  @Input() layer;
  @Input() config   //Dictionary to store all searchable attributes (type,options combo etc)

  searchObj = {opLogic:"AND",conditions:[]};
  showLoader: boolean = false;
  showResult: boolean = false;
  showError: boolean = false;
  totalFeatures:number = null;
  maxFeatures:number = null;
  featuresArray = [];

  // search service layer
  searchLayerOL = null;

  // styles for search results
  defaultLineStyle = new WGStyle({
    type: 1,
    label: null,
    rules:[
      {
        name: null,
        op:null,
        conditions: null,
        symbol:{
          type: "line",
          color: "#81d4f4aa",
          size: 2,
          id: 1
        },
      }
    ]
  });

  defaultPointStyle = new WGStyle({
    type: 1,
    label: null,
    rules:[
      {
        name: null,
        op:null,
        conditions: null,
        symbol:{
          type: "shape",
          id: 1,
          size: 20,
          color: "#81d4f4aa"
        }
      }
    ]
  });

  defaultPolygonStyle = new WGStyle({
    type: 1,
    label: null,
    rules:[
      {
        name: null,
        op:null,
        conditions: null,
        symbol:{
          type: "polygon",
          color: "#81d4f4aa",
          id: 1,
          strokeColor: "#81d4f4aa",
          strokeWidth: 2
        }
      }
    ]
  });

  // styles for selected item of search results
  pointSelectedStyle = new Style({
    image: new Circle({
      fill: new Fill({
        color: [255, 215, 0, 0.8]
      }),
      radius: 20
    })
  });

  lineSelectedStyle = new Style({
    stroke: new Stroke({
      color:  [255, 215, 0, 0.8],
      width: 4
    })
  });

  polygonSelectedStyle = new Style({
    fill: new Fill ({
      color:  [255, 215, 0, 0.8]
    }),
    stroke: new Stroke({
      color:  [255, 215, 0, 0.8],
      width: 4
    })
  });

  // interaction to select feature in map
  selectInteraction    = null;

  // unique key for select feature listener
  selectFeatureListenerKey = null;
  // unique key for remove select feature listener
  removeSelectFeatureListenerKey = null;

  // Identifier of search layer (id and name)
  static readonly searchLayerId   = 7777;
  static readonly searchLayerName = '_SEARCH_LAYER_';

  /* Dictionary to associate type attribute and select operations */
  private dictAttrOperations = {
    "int":{op: ["EQ","GT","GE","LT","LE","IS_NULL","IS_NOT"], form: "number"},
    "double":{op: ["EQ","GT","GE","LT","LE","IS_NULL","IS_NOT"], form: "number"},
    "timestamp":{op: ["EQ","GT","GE","LT","LE","IS_NULL","IS_NOT"], form: "timestamp"},
    "date":{op: ["EQ","GT","GE","LT","LE","IS_NULL","IS_NOT"], form: "timestamp"},
    "char":{op: ["EQ","ILIKE","IS_NULL","IS_NOT"], form: "text"},
    "boolean":{op: ["EQ","IS_NULL","IS_NOT"], form: "boolean"}
  }

  private operators = this.contextSvc.getContext("operator");

  // search condition form configuration
  private searchCondFormCfg =
  {
    fg:
    [
      {
        rows:
        [
          [
            {
              key: "attr",
              type: "select",
              label: "Attributi",
              width: 4,
              options:  [],
              required: true
            },
            {
              key: "op",
              type: "select",
              label: "Operazione",
              width: 4,
              options:  [],
              required: true
            },
            {
              key: "value",
              type: "text",
              label: "Valore",
              width: 4,
              required: false
            }
          ]
        ]
      }
    ]
  };

  constructor(private wgSvc:WebgisService,
              private contextSvc:ContextService,
              private httpReader:HttpReaderService,
              private http:HttpClient,
              private configSvc:ConfigService) { }

  ngOnInit()
  {
    let attributesSearchable = [];

    for (let idx = 0; idx<this.layer.objAttributes['search'].length; idx++)
    {
      attributesSearchable.push({
        id: this.layer.objAttributes['search'][idx]['key'],
        name: this.layer.objAttributes['search'][idx]['label']
      });
    }
    this.searchCondFormCfg.fg[0].rows[0][0].options = [...attributesSearchable];

    let attributes = Object.values(this.config);
    for (let j = 0; j < attributes.length; j++)
    {
      let attr = attributes[j]['column'];
      // Retrieve options to set in field value for each attribute
      if (attributes[j]['url'] || attributes[j]['context'])
      {
        let url = attributes[j]['url']  || attributes[j]['context'];
        this.httpReader.get(url).subscribe
        (
          res2 =>
          {
            this.config[attr]['options'] = res2['result'];
            if (Object.keys(res2['result'][0]).indexOf("name") <  0)
            {
              if (Object.keys(res2['result'][0]).indexOf("descr") < 0)
              {
                if (Object.keys(res2['result'][0]).indexOf("label"))
                  this.config[attr]['optionLabel'] = 'id';
                else
                  this.config[attr]['optionLabel'] = 'label';
              }
              else
                this.config[attr]['optionLabel'] = 'descr';
            }
          },
          err2 =>
          {
            console.log(err2);
          }
        );
      }
    }

    let form = JSON.parse(JSON.stringify(this.searchCondFormCfg));
    form['id'] = 0;

    let obj = new WGSearchCond({
      id:0,
      attr: null,
      op: null,
      value: null,
      formCfg: form
    });

    this.searchObj.conditions.push(obj);

    // retrieve search layer and if it exist delete it
    let searchLayer = this.wgSvc.getLayerObjById(SearchConditionComponent.searchLayerId);
    if (searchLayer)
        this.wgSvc.manageLayer("D", {id: searchLayer.id, isBaseLayer: false});
  }

  ngOnDestroy()
  {
    // remove print layer support
    let layerSearch = this.wgSvc.getLayerObjById(SearchConditionComponent.searchLayerId);
    if (layerSearch)
      this.wgSvc.manageLayer("D", {id: layerSearch.id, isBaseLayer: false});

    //Remove interaction from map
    this.wgSvc.mapComponent.map.removeInteraction(this.selectInteraction)

    // remove listener
    unByKey(this.selectFeatureListenerKey);
    unByKey(this.removeSelectFeatureListenerKey);

    this.searchLayerOL = null;
  }

  /* Public methods */
  addCondition()
  {
    let formCfg = JSON.parse(JSON.stringify(this.searchCondFormCfg));
    //let formCfg = Object.assign({}, this.searchCondFormCfg);
    formCfg['id'] = this.searchObj.conditions.length;
    let cond = new WGSearchCond({
      id:this.searchObj.conditions.length,
      attr: null,
      op: null,
      value: null,
      formCfg: formCfg
    });

    this.searchObj.conditions.push(cond);
    this.showResult = false;
  }

  deleteCondition(indexCond)
  {
    this.searchObj.conditions.splice(indexCond,1);
  }

  search()
  {
    let breakSearchValid = false;
    let breakSearchChange = false;

    this.qlFormCondition.forEach(form =>
    {
      if (!form.isValid())
        breakSearchValid = breakSearchValid || true;

      if (!form.isChanged())
        breakSearchChange = breakSearchChange || true;
      else
        breakSearchChange = breakSearchChange && false;

      let id = form.entity.id;

      // update entity
      this.searchObj.conditions[id].update(form.getChangedObj());
    });

    if (breakSearchValid || breakSearchChange)
      return;

    this.showLoader = true;

    // reset previous results
    this.resetResult();

    switch(this.layer.service)
    {
      // data retrieved from mapserver WFS layer
      case ServiceType.VECTOR:
        this.queryWFSLayer(this.layer);
        break;

      // data retrieved from backend url
      case ServiceType.GEOJSON:
        // TODO
        //queryGeoJSONLayer();
        break;
    }
  }

  resetSearch ()
  {
    for (let i = 0; i<this.searchObj.conditions.length; i++)
      this.searchObj.conditions[i] = new WGSearchCond(Object.assign(this.searchObj.conditions[i].getInitialCfg()));

    this.showResult = false;
    this.showError = false;
    this.showLoader = false;

    this.resetResult();

    this.qlFormCondition.forEach(f => {
      // restore form
       f.disableFields(['value'],false);
    });

  }

  clickFeature(feature)
  {
    let feature_ol = this.searchLayerOL.getSource().getFeatureById(feature.id);

    // set extent for each feature selected
    let extent_feature = feature_ol.getGeometry().getExtent();

    if (this.searchLayerOL.getSource().get('projection') != 'EPSG:'+this.wgSvc.getMapSrCode())
    {
      extent_feature = transformExtent(
        extent_feature,
        this.searchLayerOL.getSource().get('projection'),
        'EPSG:'+this.wgSvc.getMapSrCode()
      );
    }

    // center on point
    this.wgSvc.mapComponent.view.setCenter([
      (extent_feature[0]+extent_feature[2])/2,
      (extent_feature[1]+extent_feature[3])/2
    ]);

    // add alternately feature selected into collection interaction of type select
    if (this.selectInteraction.getFeatures().getLength() > 0)
      this.selectInteraction.getFeatures().pop();

    this.selectInteraction.getFeatures().push(feature_ol);

  }

  /* event handler*/
  onSearchCondFormChanged(event)
  {
    if (event.key == 'op')
    {
      switch (event.val)
      {
        case "IS_NULL":
        case "IS_NOT":
          let f = this.qlFormCondition.find(form =>
            (form.getChangedObj() && (form.getChangedObj()['op'] == 'IS_NULL' ||
              form.getChangedObj()['op'] == 'IS_NOT'))
          );
          f.disableFields(['value'],true);
          f.setValueForKey('value',null);
          break;

        default:
          let field = this.qlFormCondition.find(form =>
            (form.getChangedObj() && (form.getChangedObj()['op'] != 'IS_NULL' &&
              form.getChangedObj()['op'] != 'IS_NOT'))
          );
          field.disableFields(['value'],false);
      }
    }
    if (event.key == 'attr') // Set options in combo operators and set type in field value
    {
      // Reset form and result
      this.searchObj.conditions[event.id].op = null;
      this.searchObj.conditions[event.id].formCfg.fg[0].rows[0][1].options = [];
      this.searchObj.conditions[event.id].value = null;
      this.showResult = false;
      // hide search result layer
      if (this.searchLayerOL)
        this.searchLayerOL.setVisible(false);

      // remove features from source (if is not null)
      if (this.searchLayerOL && this.searchLayerOL.getSource())
      {
        this.searchLayerOL.getSource().clear(true);
        this.searchLayerOL.getSource().refresh();
      }

      let f = this.qlFormCondition.find(form =>
      {
        return form.id == event.id;
      });

      f.setValueForKey('value',null);
      f.setValueForKey('op',null);

      let att = this.config[event.val];

      for (let key in this.dictAttrOperations)
      {
        if (att && att['type'].includes(key))
        {
          // Retrieve config form
          let configForm = this.searchObj.conditions.find(item =>
          {
            return item.formCfg['id'] == event.id;
          }).formCfg;

          let optionsOperators = [];
          if (att.url || att.context)
          {
            optionsOperators = this.operators.filter( x => {
              return x['id'] == "EQ";
            });

            // Set options in combo operator
            configForm['fg'][0]['rows'][0][1]['options'] = [...optionsOperators];

            let optValues = this.config[event.val]['options'];

            if (Object.keys(this.config[event.val]).indexOf("optionLabel") >=  0)
              configForm['fg'][0]['rows'][0][2]['optionLabel'] =
                this.config[event.val]['optionLabel'];

            //Set type and options in field value
            configForm['fg'][0]['rows'][0][2].type = "select";
            configForm['fg'][0]['rows'][0][2].options =
              optValues && optValues.length ? [...optValues] : [];

          }
          else
          {
            optionsOperators = this.operators.filter( x => {
              return this.dictAttrOperations[key].op.indexOf(x['id']) >=0;
            });

            configForm['fg'][0]['rows'][0][1]['options'] = [...optionsOperators];

            configForm['fg'][0]['rows'][0][2]['type'] = this.dictAttrOperations[key].form;
          }
          break;
        }
        else
        {
          // Attribute don't match into tableInfo call then set value field type "text"

          // Retrieve config form
          let configForm = this.searchObj.conditions.find(item =>
          {
            return item.formCfg['id'] == event.id;
          }).formCfg;

          let optionsOperators = this.operators.filter( x => {
            return x['id'] == "EQ" || x['id'] == "ILIKE" ;
          });

          // Set options in combo operator
          configForm['fg'][0]['rows'][0][1]['options'] = [...optionsOperators];

          configForm['fg'][0]['rows'][0][2]['type'] = "text";

        }
      }
    }
  }

  /* Private function */
  /*
   * Build filter for WFS mapserver request and invoke call
   */
  queryWFSLayer(layer)
  {
    let filterArray = [];

    // retrieve conditions from search form
    let rules_filter = this.searchObj.conditions;

    let operator_filter = this.searchObj.opLogic;

    for (let i = 0 ; i < rules_filter.length; i++)
    {
      let objFilter = {};

      objFilter["property_name"] = rules_filter[i]['attr'];
      objFilter["operator"]      = rules_filter[i]['op'];
      objFilter["property_val"]  = rules_filter[i]['value'];

      filterArray.push(layer.buildFilter(objFilter));
    }

    // if not filter condition
    if (filterArray.length == 0)
    {
      console.log ("No filter conditions")
      this.showLoader  = false;
      return;
    }

    // build condition AND|OR between more objFilter and return it
    let filter = layer.buildWFSLayerFilter(filterArray, operator_filter);

    this.retrieveSearchResult(layer.completeUrl, this.featureRequest(filter));
  }

  /*
   * Execute http post call to retrieve search resutl
   */
  private retrieveSearchResult(postURL, postBody)
  {
    // function to retrieve feature format
    // to encode and decode features from specified output format
    let getFormat = () =>
    {
      var format = null;

      switch(this.layer.format)
      {
        case "application/json":
          format = new GeoJSON({defaultDataProjection:this.layer.projection});
          break;

        default:
          format = new GeoJSON({defaultDataProjection:this.layer.projection});
          break;
      };

      return format;
    };

    this.http.post(postURL, postBody).subscribe(
      response =>
      {
        this.showLoader = false;
        // error or no result management
        if (!response || !response['features'])
        {
          this.showError = true;
          this.showResult = false;
          return;
        }

        this.showError = false;
        this.showResult = true;

        if (response['features'].length == 0)
        {
          this.featuresArray = [];
          return;
        }

        this.totalFeatures = response['totalFeatures'];
        this.maxFeatures = maxFeatureInSearch;

        let features = response['features'];

        let attributesArr = this.layer.attributes;

        for (let i=0; i < features.length; i++)
        {
          let feature = features[i];

          feature["custom_properties"] = {};

          let properties = Object.keys(feature.properties);

          properties.forEach(key =>
          {
            let val = feature.properties[key];
            for (let jdx=0; jdx<attributesArr.length; jdx++)
            {
              if (attributesArr[jdx].key === key &&
                attributesArr[jdx].label != null && attributesArr[jdx].label != "")
              {
                let value = null;

                switch(attributesArr[jdx].type)
                {
                  case 'date':
                    value = this.getFormattedDate(val);
                    break;

                  case 'date-time':
                    value = this.getFormattedDateTime(val);
                    break;

                  case 'boolean':
                    value = this.getFormattedBool(val);
                    break;

                  default:
                    if (Object.keys(this.config).indexOf(key) >= 0)
                    {
                      if (Object.keys(this.config[key]).indexOf('options') >= 0)
                      {
                        let obj = this.config[key]['options'].find(item =>
                        {
                            return item.id == val;
                        });
                        if (obj)
                          value = obj['name'] || obj['optionLabel']
                      }
                      else
                        value = val;
                    }
                    else
                      value = val;
                }

                feature["custom_properties"][attributesArr[jdx].label] = value;
              }
            }
          });
        }

        // populate array with features filtered and elaborated
        this.featuresArray = features;

        // retrieve returned features format
        let format = getFormat();

        var geometries = [];

        // setting extent for geometries filtered
        for(let i=0; i<features.length;i++)
        {
          let featureOl  = format.readFeature(features[i]);
          geometries.push(featureOl.getGeometry());
        }

        let geomCollection = new GeometryCollection(geometries);
        let extent = geomCollection.getExtent();

        this.wgSvc.mapComponent.view.fit(extent);

        // select appropriate styles based on geometry type
        let geomType = geometries[0].getType();
        let style = null;
        let selectedStyle = null;

        switch (geomType)
        {
          case GeometryType.POINT:
          case GeometryType.MULTI_POINT:
            style = this.defaultPointStyle;
            selectedStyle = this.pointSelectedStyle;
            break;
          case GeometryType.LINE:
          case GeometryType.MULTI_LINE:
            style = this.defaultLineStyle;
            selectedStyle = this.lineSelectedStyle;
            break;
          case GeometryType.POLYGON:
          case GeometryType.MULTI_POLYGON:
            style = this.defaultPolygonStyle;
            selectedStyle = this.polygonSelectedStyle;
            break;
        }

        // retrieve search layer and if it exist delete it then create new
        let searchLayer = this.wgSvc.getLayerObjById(SearchConditionComponent.searchLayerId);
        if (searchLayer)
            this.wgSvc.manageLayer("D", {id: searchLayer.id, isBaseLayer: false});

        // create new search layer
        let searchLayerCfg:Object = {
          id:              SearchConditionComponent.searchLayerId,
          layer_name:      SearchConditionComponent.searchLayerName,
          id_type:         LayerTypology.LAYER,
          opacity:         1,
          visible:         true,
          service:         ServiceType.VECTOR,
          projection:      'EPSG:' + this.wgSvc.getMapSrCode(),
          geometry_field:  {'name':'geom','type':geomType},
          support:         true,
          style:           style
        };

        // build layer and add to the map
        this.wgSvc.manageLayer("I", {cfg: searchLayerCfg, isBaseLayer: false});

        this.searchLayerOL = this.wgSvc.getLayerObjById(SearchConditionComponent.searchLayerId).layerOL;


        this.searchLayerOL.getSource().addFeatures(
          format.readFeatures(response,
          {
            dataProjection:    'EPSG:' + this.wgSvc.getMapSrCode,
            featureProjection: 'EPSG:' + this.wgSvc.getMapSrCode
          })
        );

          // add interaction to map
          this.selectInteraction = new Select({
            condition: pointerMove,
            layers: [this.searchLayerOL],
            style: selectedStyle
          });

          // add click interaction to map
          this.wgSvc.mapComponent.map.addInteraction(this.selectInteraction);

          this.selectFeatureListenerKey = this.selectInteraction.getFeatures().on("add", (e:any) =>
          {
            let feature = e.element;

            let ftId = this.getFeatureId(feature.getId());

            let el = document.getElementById(ftId);
            if (el)
              el.classList.add('feature-selected');

            el.scrollIntoView();
          });


          this.removeSelectFeatureListenerKey = this.selectInteraction.getFeatures().on("remove", (e:any) =>
          {
            let feature = e.element;

            let ftId = this.getFeatureId(feature.getId());

            let element = document.getElementById(ftId);
            if (element)
              element.classList.remove('feature-selected');
          });

          this.showResult = true;
          this.showLoader = false;
      },
      error =>
      {
        this.showLoader = false;
        this.showError = true;
        this.showResult = false;
        console.error(error);
      }
    );
  }

  private featureRequest(filter)
  {
    // attributes returned
    let propNameArr = [];

    // build array of property names to return
    if (this.layer.attributes && this.layer.attributes.length)
    {
      propNameArr = [];

      for (let i = 0; i<this.layer.attributes.length; i++)
        propNameArr.push(this.layer.attributes[i]['key']);

      if (this.layer.id_field)
        if (propNameArr.indexOf(this.layer.id_field) < 0)
          propNameArr.push(this.layer.id_field);

      if (this.layer.geometry_field)
        propNameArr.push(this.layer.geometry_field['name']);

      if (this.layer.styleTypeOL == 'STYLE' && this.layer.style && this.layer.style.label)
      {
        // Retrieve attribute to push into propNameArr
        let aAttName = this.layer.style.label.getDynamicAttribute();

        for (let j = 0; j< aAttName.length;j++)
          if (propNameArr.indexOf(aAttName[j]) < 0)
            propNameArr.push(aAttName[j]);
      }
    }

    // configure getFeature request
    let getFeatureCfgObj:Object = {
      srsName: 'EPSG:' + this.wgSvc.getMapSrCode(),
      featureTypes: [this.layer.layer_name],
      outputFormat: OutputFormat.GEOJSON,
      maxFeatures: maxFeatureInSearch
    };

    // add propertyNames if presents
    if (propNameArr)
      getFeatureCfgObj['propertyNames'] = propNameArr;


    // add filter if presents
    getFeatureCfgObj['filter'] = filter;

    getFeatureCfgObj['geometryName'] = this.layer.geometry_field['name'];


    // create getFeature request
    let getFeatureRequest = new WFS().writeGetFeature(getFeatureCfgObj);

    // serialize and return feature request
    return new XMLSerializer().serializeToString(getFeatureRequest);
  }

  /*
   * Called on new search
   */
  private resetResult()
  {
    // remove features from array
    this.featuresArray = [];

    // hide search result layer
    if (this.searchLayerOL)
      this.searchLayerOL.setVisible(false);

    // remove features from source (if is not null)
    if (this.searchLayerOL && this.searchLayerOL.getSource())
    {
      this.searchLayerOL.getSource().clear(true);
      this.searchLayerOL.getSource().refresh();
    }
  };

  /*
   * convert js object Date (in string format) to formatted string
   */
  private getFormattedDate(dateStr)
  {
    let date = new Date(dateStr);

    let year = date.getFullYear();

    let month = (1 + date.getMonth()).toString();
    month = month.length > 1 ? month : '0' + month;

    let day = date.getDate().toString();
    day = day.length > 1 ? day : '0' + day;

    return day + '-' + month + '-' + year;
  }

  /*
   * convert js object Datetime (in string format) to formatted string
   */
  private getFormattedDateTime(dateStr)
  {
    let onlyData = this.getFormattedDate(dateStr);

    let date = new Date(dateStr);

    let h = date.getHours();
    let m = date.getMinutes();
    let s = date.getSeconds();

    return onlyData + " " +
        ("0" + h).slice(-2) + ":" +
        ("0" + m).slice(-2) + ":" +
        ("0" + s).slice(-2);
  }

  /*
   * convert Bool object into string
   */
  private getFormattedBool(bool)
  {
    return bool ? "Sì" : "No";
  }

    /*
   * Convert feature id into a string without '.' char
   * (feature id is different depending on whether the layer is WFS or GEOJSON)
   */
  getFeatureId = function(id)
  {
    let ftId = Number.isInteger(id) ? id + '' : id.replace(".","");

    return ftId;
  }
}

export class WGSearchCond
{
  id: number = null;
  attr: string = null;
  op: string = null;
  value: any = null;
  formCfg: Object = null;

  /* Private attributes */
  private initialCfg:any = {};

  /*
   * Methods
   */
 constructor(cfg:any)
  {
    Object.assign(this.initialCfg,cfg);
    this.update(cfg);
  }

  update(cfg:any)
  {
    for (let key in cfg)
    {
      if (this[key] !== undefined)
        this[key] = cfg[key];
    }
  }

  getInitialCfg()
  {
    return this.initialCfg;
  }

  isChanged():boolean
  {
    return this.op != this.initialCfg.op ||
      this.attr != this.initialCfg.attr ||
      this.value != this.initialCfg.value;
  }
}
