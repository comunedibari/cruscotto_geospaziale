/*
 *
 */

import {Component,
        OnInit,
        OnDestroy,
        AfterViewInit,
        ComponentFactoryResolver,
        ViewChild,
        ElementRef,
        ViewContainerRef,
        Renderer2}             from '@angular/core';

import {Subject,
        Observable,
        Subscription}          from 'rxjs';

import Map                     from 'ol/Map.js';
import View                    from 'ol/View.js';
import Overlay                 from 'ol/Overlay';
import Layer                   from 'ol/layer/Layer.js';
import Cluster                 from 'ol/source/Cluster';

import {getCenter,
        getWidth,
        getHeight}             from 'ol/extent.js';

import {Style}                 from 'ol/style.js';

import {ScaleLine,
        OverviewMap}           from 'ol/control.js';

import {default as
         MousePosition}        from 'ol/control/MousePosition.js';

import {defaults as
         defaultInteractions,
        DragZoom}              from 'ol/interaction.js';

import {pointerMove,
        always as
          evt_cond_always}     from 'ol/events/condition.js';

/*import {Observable as
          olObservable}        from 'ol/Observable';*/
import {unByKey}               from 'ol/Observable';

import {get as getProjection,
        METERS_PER_UNIT,
        transformExtent}       from 'ol/proj.js';

import {WGSr}                  from '../entity/wgsr';
import {WGMap}                 from '../entity/wgmap';
import {WGTool}                from '../entity/wgtool';

import {WebgisService}         from '../webgis.service';
import {WGMapLayer}            from '../entity/wgmapLayer';

import {fromDDToDMS,
        getCoordNumDec,
        ServiceType,
        LayerTypology,
        GeometryType,
        QueryMode,
        HilightMode}           from '../webgis.util';

import {getMapToolsClass}      from '../mapTools/util'

@Component({
  selector: 'webgis-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})

export class MapComponent implements OnInit, AfterViewInit {

  // access DOM elements
  @ViewChild('overviewDivRef')     mapOverviewDiv:ElementRef;
  @ViewChild('mapDivRef')          mapDiv:ElementRef;
  @ViewChild('mapFooterRef')       mapFooter:ElementRef;
  @ViewChild('mapCoordsRef')       mapCoords:ElementRef;
  @ViewChild('mapScaleLineRef')    mapScaleLine:ElementRef;
  @ViewChild('mapToolbarRef')      mapToolbar:ElementRef;
  @ViewChild('mapFtrPopupRef')     mapFeaturePopup:ElementRef;
  @ViewChild('mapSumPopupRef')     mapSummaryPopup:ElementRef;
  @ViewChild('mapClusterPopupRef') mapClusterPopup:ElementRef;
  @ViewChild('mapPopupCloserRef')  mapPopupCloser:ElementRef;
  @ViewChild('mapFtrTooltipRef')   mapFeatureTooltip:ElementRef;
  @ViewChild('ftrPop')             ftrPopover:ElementRef;
  @ViewChild('sumPop')             sumPopover:ElementRef;
  @ViewChild('clusterPop')         clusterPopover:ElementRef;
  @ViewChild('ftrHover')           ftrHover:ElementRef;

  // container where add advanced map tool
  @ViewChild('mapToolContainer', {read: ViewContainerRef}) mapToolContainer:ViewContainerRef;

  // declarations
  map:   Map;
  view:  View;
  wgMap: WGMap;

  // support variable to store advanced tool component instance corresponding to toolActive
  mapToolCmp;

  // configuration of overview map
  overviewCfg: Object;

  // overview map
  overviewMap: OverviewMap;

  // flag to check if overview is open (visible)
  isOvwOpen:boolean;

  // zoom box interaction
  dragZoomInteraction: DragZoom;

  // scale line and mouse position controls
  ctrl_scaleLine: ScaleLine;
  ctrl_mousePos:  MousePosition;

  // current scale (shown on map bottom bar)
  currScale: number;

  // configuration of tools in advanced tool bar
  toolCfg:Array<WGTool>;

  // flag that indicate if tools container is opened
  toolsContainerOpened: boolean = false;

  // keep track of tools active in toolsContainer
  toolActive: WGTool;

  // id of active (selected) tool
  toolSelectedId:string;

  // current map reference system
  currentMapSr: WGSr;

  // Overlay to shows feature/cluster popup
  mapFeaturePopupOverlay:Overlay;

  // Overlay to shows features summary popup
  mapSummaryPopupOverlay:Overlay;

  // Overlay to shows features cluster popup
  mapClusterPopupOverlay:Overlay;

  // Overlay to shows feature/cluster tooltip
  mapFeatureTooltipOverlay:Overlay;

  // Overlay to shows markers on map (on get/retrieve coordinates)
  mapMarkerOverlay:Overlay;

  // flag
  initDone:boolean = false;

  // content of map click popup
  // single, multiple (summary) and cluster feature click
  featurePopupContent;
  featurePopupTitle;
  summaryPopupContent;
  summaryPopupTitle;
  clusterPopupContent;
  clusterPopupTitle;

  // content of feature mouse hover
  featureHoverContent;

  // support variable to change view into summary popup
  summaryPopupSelectedLayer;

  // if set, this layer override check in layer filter function on map click
  // (layer filter function return true only on this layer)
  activeQueryableLayerId;

  // if set, this filter is applied to map click function
  // at features of queryable layer
  // It is an array of condition (attribute name and value)
  // conditions are in AND between them
  private ftrFilterQueryableLayer:Array<object>;

  // flag to enable/disable default map click on queryable layer
  // (we have to disable it when activate editing)
  private defaultMapClickEnabled:boolean;

  // flag to enable/disable default map hover on configured WFS layer
  // (we have to disable it when activate editing)
  private defaultMapHoverEnabled:boolean;

  // flag to set behaviour on feature click (show info popup o return feature id)
  private mapClickBehaviour:QueryMode;

  // object that store map click behaviour
  private mapClickStatus:Object = {};

  // store callback to invoke on map click
  // (mapClickBehaviour imust be setted to QueryMode.ID)
  private mapClickCallback;

  //
  private subscription:Subscription;

  // Identifier of overlay layer (id and name - layer to highlight clicked features)
  static readonly overlayLayerId   = 9998;
  static readonly overlayLayerName = '_OVERLAY_LAYER_';

  // support layer for hilite features on click
  overlayLayer:WGMapLayer;

  constructor(private wgSvc:WebgisService,
              private renderer: Renderer2,
              private componentFactoryResolver: ComponentFactoryResolver)
  {
    // initialization
    this.isOvwOpen = false;

    this.toolActive = new WGTool({});

    this.defaultMapClickEnabled = true;
    this.defaultMapHoverEnabled = true;

    this.ftrFilterQueryableLayer = null;

    this.mapClickBehaviour = QueryMode.POPUP;

    // set map component instance to webgis service
    this.wgSvc.setMapComponent(this);
  }

  ngOnInit()
  {
    // subscribe on event
    // obj is an object with key and val
    this.subscription = this.wgSvc.observer.subscribe((obj) =>
    {
      if (obj && obj.key)
      {
        switch(obj.key)
        {
          // manage popup on map click
          case 'showFeaturePopup':
            this.showFeaturePopup(obj['val']);
            break;

          // set temporary layer active and query mode
          // (this layer is the only that listen map click)
          case 'activeQueryableLayer':
            this.activeQueryableLayerId = obj['val']['layerKey'] ?
              this.wgSvc.getLayerObjByKey(obj['val']['layerKey'])['id'] : null;
            this.mapClickBehaviour = obj['val']['queryMode'];
            break;

          // clear overlay layer (feature highlighted)
          case 'resetHighlight':
            this.resetOverlayLayer();
            break;

          // retrieve feature id from map click
          case 'getFeatureId':
            this.getFeatureId(obj['val']);
            break;

          // change layer order into map in response to drag event on layer panel
          case 'layerOrder':
            this.layerOrder(obj['val']);
            break;

          // zoom to layer extent in response to zoom button press on layer panel
          case 'layerZoom':
            this.zoomLayer(obj['val']);
            break;
        }
      }
    });
  }

  ngAfterViewInit()
  {
    // this setTimeout is necessary because we have to wait for page rendering
    // (otherwise map div height is equal to 0)
    setTimeout(() =>
    {
      // retrieve map and layers configuration from service
      this.wgSvc.getWGConfiguration().subscribe(val => {
        // valorize map configuration object
        this.wgMap = val;

        this.initMap().subscribe(
          res => {
            // Fix sidebar height TODO: wrong value!!!!
            this.mapToolbar.nativeElement.style.height = this.getToolbarHeight() + "px";

            // after the map and view are created -> add layers to the map
            this.addLayersToMap();

            // add mouse hover pointer interaction (change cursor)
            this.addPointerInteraction();

            // add feature hover interaction
            this.addHoverInteraction();

            // add click map event to query vector features
            this.addMapClickEvent();

            // valorize initDone flag and send mapReady event
            this.initDone = true;
            this.wgSvc.sendMessage('mapReady',{});
          }
        );
      });
    }, 100);
  }

  ngOnDestroy()
  {
    // remove subscription
    this.subscription.unsubscribe();
  }

  /**
   * custom implementation of ol.CoordinateFormat() function
   * format the coords to show mousePosition control according to the map SR
   */
  customCoordFormat = function()
  {
    return ((coords) =>
      {
        let strCoord = '';

        switch(this.currentMapSr.id)
        {
          case 5: // TODO: remove id and change with prefix or name
            strCoord =
              this.currentMapSr.x_prefix + ': ' + fromDDToDMS(coords[0]) +
              ', ' +
              this.currentMapSr.y_prefix + ': ' + fromDDToDMS(coords[1]);

            break;

          default:
            let numDec = getCoordNumDec(this.currentMapSr.units);
            strCoord =
              this.currentMapSr.x_prefix + ': ' + coords[0].toFixed(numDec) +
              ', ' +
              this.currentMapSr.y_prefix + ': ' + coords[1].toFixed(numDec);
        }

        return strCoord;
      }
    );
  }

  /*
   * click on button on webgis-tools component
   */
  onToolClicked(toolId:string)
  {
    // we have to control also if we pressed again already selected button
    this.toolSelectedId = (this.toolSelectedId  == toolId) ? null : toolId;

    if (this.toolsContainerOpened)
    {
      // destroy component
      this.removeTool();

      if (this.toolActive['id'] == toolId)
      {
        this.toolsContainerOpened = !this.toolsContainerOpened;
      }
      else
      {
        this.toolActive = this.wgMap.getToolsById(toolId);

        // create component
        this.addTool();
      }
    }
    else
    {
      this.toolActive = this.wgMap.getToolsById(toolId);
      this.toolsContainerOpened = !this.toolsContainerOpened;

      // create component
      this.addTool();
    }
  }

  /**
   * on window resize event we have to resize gis tools sidebar to adjust it's height
   */
  onResize(event)
  {
    this.mapToolbar.nativeElement.style.height = this.getToolbarHeight() + "px";
  }

  getToolbarHeight():number
  {
    let footerH = this.mapFooter.nativeElement.offsetHeight;
    let mapDivH = this.mapDiv.nativeElement.offsetHeight;

    // TODO: 48 is height of edit component (gistools module)
    // 35 is height toolbarTitle
    return  (mapDivH - 48 - footerH - 35);
  }

  zoomLayer(layer)
  {
    let bbox, bboxEPSG;
    // Retrieve layer bbox
    if (layer.extent != undefined)
    {
      bbox     = layer.extent;
      bboxEPSG = layer.projection;
    }
    else
    {
      bbox     = this.wgSvc.getMapBBox();
      bboxEPSG = this.wgSvc.getDefaultMapSrCode();
    }

    // Convert bbox into current map SR (if it necessary)
    if (this.currentMapSr.code != bboxEPSG)
    {
      bbox = transformExtent(
        bbox,
        bboxEPSG,
        'EPSG:' + this.currentMapSr.code
      );
    }

    this.zoomToExtent(bbox);
  };

  /*
   * Change map layer order in response to a drag event on layers tree
   */
  layerOrder(itemsTree)
  {
    // retrieve layer destination
    let destItem = itemsTree.dropNode;

    // retrieve layer to move
    let layerToMove = itemsTree.dragNode;

    if (layerToMove.id_parent)
    {
      // layer have a parent -> we have to move it into parent boundaries
      let parent = this.wgSvc.getLayerObjById(layerToMove.id_parent);

      if (parent.id_type == LayerTypology.COMPOSED)
      {
        // in this case we have to change order into parent layer
        if (parent.service == ServiceType.WMS)
        {
          // arrange wmsParams.LAYERS attribute
          let strListLayers = '';

          let source = parent.layerOL.getSource();
          let params = source.getParams();

          let parChildren = parent.children ? Object.values(parent.children) : [];

          if (layerToMove.selected && !layerToMove.disabled)
            strListLayers += (layerToMove.layer_name + ',');

          for (let idx=0, len=parChildren.length; idx<len; idx++)
          {
            let itemComp = parChildren[idx];
            if(itemComp != layerToMove && itemComp != destItem)
            {
               if (itemComp.selected && !itemComp.disabled)
                strListLayers += (itemComp.layer_name + ',');
            }
          }

          if (destItem.selected && !destItem.disabled)
            strListLayers += (destItem.layer_name);

          // update layer source
          params.LAYERS = strListLayers;
          source.updateParams(params);
        }
        else if (parent.service == ServiceType.VECTOR || parent.service == ServiceType.GEOJSON)
        {
          if (parent.styleTypeOL != 'FIXED')
          {
            if (parent.cache && Object.keys(parent.cache).length > 0)
            {

              for (let idx = 0; idx < destItem.parent.children.length; idx++)
              {
                let itemComp = destItem.parent.children[idx];
                let keyStyleCache = "";

                for (let key in itemComp.filter)
                  keyStyleCache = keyStyleCache + itemComp.filter[key];

                itemComp['zIndex'] = idx + 1;

                // If child layer has cached style -> update zIndex in STYLE
                if (parent.cache[keyStyleCache])
                  parent.cache[keyStyleCache][0].setZIndex(itemComp['zIndex']);
              }

              // redraw layer
              parent.layerOL.getSource().refresh();
            }
            else
            {
              // in this case layer has never been turned on then styles are not created.
              // We have to change only zIndex attributes to create correctly Style
              for (let idx = 0; idx < destItem.parent.children.length; idx++)
                destItem.parent.children[idx]['zIndex'] = idx + 1;
            }
          }
        }
      }
      else
      {
        //Typology GROUP
        let destLayer   = destItem.layerOL;
        let sourceLayer = layerToMove.layerOL;

        let sourceIndex = -1;
        let destIndex   = -1;

        let sourceLayerId = sourceLayer.get('id');
        let destLayerId   = destLayer.get('id');

        // in this case we have to change order into group
        let group = this.wgSvc.getLayerObjById(layerToMove.id_parent);

        let groupOL = group.layerOL;
        let groupItemArray = groupOL.getLayers().getArray();

        for (let idx=0; idx<groupItemArray.length; idx++)
        {
          if (groupItemArray[idx].get('id') == sourceLayerId)
            sourceIndex = idx;

          if (groupItemArray[idx].get('id') == destLayerId)
            destIndex = idx;

          // remove moved layer from the original position and place it in the new one
          if (sourceIndex >= 0 && destIndex >= 0)
          {
            groupOL.getLayers().removeAt(sourceIndex);
            groupOL.getLayers().insertAt(destIndex, sourceLayer);

            break;
          }
        }
      }
    }
    else
    {
      //Typology LAYER
      // layer haven't a parent -> we have to move it into its category
      let destLayer   = destItem.layerOL;
      let sourceLayer = layerToMove.layerOL;

      let sourceIndex = -1;
      let destIndex   = -1;

      let sourceLayerId = sourceLayer.get('id');
      let destLayerId   = destLayer.get('id');

      // map layers array
      let layersArr = this.map.getLayers().getArray();

      let itemId = null;

      // cycle into map layers array to find source and dest index
      for (let idx=0, len=layersArr.length; idx<len; idx++)
      {
        let item = layersArr[idx];

        itemId = layersArr[idx].get('id');

        if (itemId == sourceLayerId)
          sourceIndex = idx;

        if (itemId == destLayerId)
          destIndex = idx;

        // remove moved layer from the original position and place it in the new one
        if (sourceIndex >= 0 && destIndex >= 0)
        {
          this.map.getLayers().removeAt(sourceIndex);
          this.map.getLayers().insertAt(destIndex, sourceLayer);

          break;
        }
      }
    }
  }

  /*
   * Private functions
   */

  /*
   * Zoom to extent
   */
  private zoomToExtent(bbox)
  {
    // Retrieve max resolution for given extent
    let xResolution = getWidth(bbox) / this.map.getSize()[0];
    let yResolution = getHeight(bbox) / this.map.getSize()[1];
    let res = Math.max(xResolution, yResolution);

    // Retrieve our resolution that best fit resolution's extent
    let aRes = this.view.getResolutions();
    for (let i=0; i<aRes.length-1; i++)
    {
      if (aRes[i] < res && aRes[i+1] > res)
        res = aRes[i];
    }

    // Fit view to bounding box
    this.view.fit(bbox);
  }

  private initMap():Observable<boolean>
  {
    /*
     * Set initial map SR (is the default SR) to create map view
     * (initial map SR is the default SR)
     */
    this.currentMapSr = this.wgMap.getDefaultSr();

    // Create an overlay to anchor the feature popup to the map
    this.mapFeaturePopupOverlay = new Overlay({
      element: this.mapFeaturePopup.nativeElement,
      autoPan: true,
      autoPanAnimation: {
        duration: 250
      }
    });

    // Create an overlay to anchor the summary popup to the map
    this.mapSummaryPopupOverlay = new Overlay({
      element: this.mapSummaryPopup.nativeElement,
      autoPan: true,
      autoPanAnimation: {
        duration: 250
      }
    });

    // Create an overlay to anchor the cluster popup to the map
    this.mapClusterPopupOverlay = new Overlay({
      element: this.mapClusterPopup.nativeElement,
      autoPan: true,
      autoPanAnimation: {
        duration: 250
      }
    });

    this.mapFeatureTooltipOverlay = new Overlay({
      element: this.mapFeatureTooltip.nativeElement,
      offset: [10, 0],
      positioning: 'bottom-left'
    });

    // img element to put into marker overlay
    let redDot:HTMLImageElement = document.createElement('img');
    redDot.src = 'assets/webgis/redDot.png';

    // Create an overlay to shows markers on the map
    this.mapMarkerOverlay = new Overlay({
      id: 'mapMarkerOverlay',
      position: undefined,
      positioning: 'center-center',
      element: redDot,
      autoPan: true,
      autoPanAnimation: {
        duration: 250
      }
    });

    // create map object
    this.map = new Map({
      target: this.mapDiv.nativeElement,
      // initialize map without layers
      layers:[],
      // initialize map without controls
      controls:[],
      // disable shiftDragZoom interaction to add our zoom box
      interactions: defaultInteractions({shiftDragZoom: false}),
      // add overlays
      overlays: [
        this.mapFeaturePopupOverlay,
        this.mapSummaryPopupOverlay,
        this.mapClusterPopupOverlay,
        this.mapMarkerOverlay,
        this.mapFeatureTooltipOverlay
      ]
    });

    // create scale line control
    this.ctrl_scaleLine = new ScaleLine({
      target: this.mapScaleLine.nativeElement,
      className: 'custom-scale-line'
    });

    // create mouse position control
    this.ctrl_mousePos = new MousePosition({
      target: this.mapCoords.nativeElement,
      className: 'custom-mouse-position',
      undefinedHTML: '',
      coordinateFormat: this.customCoordFormat()
    });

    // add new controls to the map
    this.map.getControls().extend([
      this.ctrl_mousePos,
      this.ctrl_scaleLine
    ]);

    // retrieve tools configuration to build advanced toolbar
    this.toolCfg = this.wgSvc.wgMap.getToolbarToolsArray();

    // retrieve overview configuration to build button and related control
    this.overviewCfg = this.wgSvc.wgMap.getToolsById('overview');

    // zoom box interaction
    this.dragZoomInteraction = new DragZoom({
      condition: evt_cond_always,
      className: 'custom-drag-zoom'
    });

    // add condition on zoom box interaction to remove it on boxend event
    this.dragZoomInteraction.on('boxend',() => {
      this.wgSvc.mapComponent.map.removeInteraction(this.dragZoomInteraction);
    }, false);

    // return
    return new Observable(observer => {
      // retrieve user bounding box
      this.wgSvc.getUserExtent().subscribe
      (
        res => {
          // Build object with map projection data and extent
          for(let idx=0; idx<this.wgMap.sr.length; idx++)
          {
            // transform bounding box in other SR used
            let mapExtentProj = transformExtent(
              res['bbox'],
              'EPSG:' + res['srCode'],
              'EPSG:' + this.wgMap.sr[idx].code
            );

            this.wgMap.sr[idx].mapExtent = mapExtentProj;
          }

          // Create view with given sr id and add to the map
          observer.next(this.setMapSR(this.currentMapSr.id));
        },
        err => {
          // notify error
          observer.next(false);
        });
    });
  }

  /*
   * Change the map SR receiving the new SR EPSG id
   * This necessitates the creation of new map view
   */
  public setMapSR(srId:number):boolean
  {
    let firstAccess = true;

    let newSR:WGSr = this.wgMap.getSrById(srId);

    if (!newSR)
    {
      console.error("The EPSG id " + srId + " is not available!");
      return false;
    }

    // retrieve EPSG code
    let epsgCode = newSR.code;

    // retrieve actual extent and zoom before to change map resolutions
    let actualZoomLevel = this.map.getView().getZoom();

    // Define resolutions array for new map SR
    let resolutions:Array<number> = this.setResolutions(srId);

    let optionView = {};

    // initialize view options
    // in the first case (if branch) view already exists
    // in the second case (else branch) we are at first system access
    if (this.view)
    {
      firstAccess = false;

      let actualExtentOldSR = this.map.getView().calculateExtent(this.map.getSize());

      let actualExtentNewSR = transformExtent(
        actualExtentOldSR,
        'EPSG:' + this.currentMapSr.code,
        'EPSG:' + epsgCode
      );

      optionView['extent'] = newSR.mapExtent;
      optionView['center'] = getCenter(actualExtentNewSR || [0, 0, 0, 0]);
      optionView['zoom']   = actualZoomLevel;
    }
    else
    {
      let defSr:WGSr = this.wgMap.getDefaultSr();

      // set map extent and center
      optionView['extent'] = defSr.mapExtent;
      optionView['center'] = [
        (defSr.mapExtent[0] + defSr.mapExtent[2])/2,
        (defSr.mapExtent[1] + defSr.mapExtent[3])/2
      ];

      /*
       * retrieve current scale value from current resolution value
       */

      // meters per unit for the given SR
      let MPU = METERS_PER_UNIT[getProjection('EPSG:' + epsgCode).getUnits()];

      // convert extent width and height in pixel
      let extPxW = (defSr.mapExtent[2] - defSr.mapExtent[0]) *
        (MPU * this.wgSvc._screenDPI * this.wgSvc._IPM);

      let extPxH = (defSr.mapExtent[3] - defSr.mapExtent[1]) *
        (MPU * this.wgSvc._screenDPI * this.wgSvc._IPM);

      // retrieve max scale between  width and height scales
      let scaleW = extPxW / this.mapDiv.nativeElement.offsetWidth;
      let scaleH = extPxH / this.mapDiv.nativeElement.offsetHeight;

      let scale = Math.max(scaleW, scaleH);

      // retrieve minimum map scale that is greather than current scale
      let initScaleIdx = null;

      for (let idx=0; idx<this.wgMap['scales'].length; idx++)
      {
        if (this.wgMap['scales'][idx] > scale)
          initScaleIdx = idx;
      }

      initScaleIdx = initScaleIdx ? initScaleIdx : 0;

      // set scale and resolution in according to founded value
      this.currScale = Math.round(
        resolutions[initScaleIdx] * (MPU * this.wgSvc._screenDPI * this.wgSvc._IPM)
      );

      this.wgMap.setCurrentScale(this.currScale);

      optionView['resolution'] = resolutions[initScaleIdx];

      // remove scale and resolution greather than initScaleIdx
      this.wgMap.scales.splice(0, initScaleIdx);
      resolutions.splice(0, initScaleIdx);
    }

    optionView['projection']  = 'EPSG:' + epsgCode;
    optionView['resolutions'] = resolutions;

    // create new map view
    this.view = new View(optionView);

    // set map view on the map
    this.map.setView(this.view);

    // if overview is defined, we also change its view
    if (this.overviewMap)
      this.setOverviewMapSR(srId);

    // set new SR to service
    this.wgSvc.setMapSR(newSR);

    // Listen on change resolution event to update scale value.
    // This code is here because we have generated a new OL view
    this.view.on('change:resolution', (e:any) => {

      let MPU = METERS_PER_UNIT[getProjection('EPSG:' + epsgCode).getUnits()];

      // retrieve current scale value from current resolution value
      this.currScale = Math.round(
        e.target.get(e.key) * (MPU * this.wgSvc._screenDPI * this.wgSvc._IPM)
      );

      this.wgMap.setCurrentScale(this.currScale);

      let aLayers = this.wgSvc.getLayers();

      for (let idx=0; idx<aLayers.length; idx++)
      {
        let lyr = aLayers[idx];

        lyr.setResolution();
      }

      this.wgSvc.sendMessage('changeResolution', null);

    });


    // set new map SR variable
    this.currentMapSr = newSR;

    // adjust layers extent and reproject vector layers
    for (let idx=0; idx<this.wgSvc.getLayers().length; idx++)
    {
      let layer = this.wgSvc.getLayers()[idx];

      // if layer have extent and a source
      if (layer.extent && layer.projection)
      {
        let layerProj = layer.projection;
        let layerOL:Layer;

        // layer is a group item:
        // we need to access to group configuration to retrieve item layer
        if (layer.id_parent)
        {
          let parentLayer:WGMapLayer = this.wgSvc.getLayerObjById(layer.id_parent);

          let grpLayer:Layer = parentLayer.layerOL;
          let itemsArray:Array<Layer> = grpLayer.getLayers().getArray();

          for (let idx=0, len=itemsArray.length; idx<len; idx++)
          {
            if (itemsArray[idx].get('id') == layer.id)
            {
              layerOL = itemsArray[idx];
            }
          }
        }
        else
          layerOL = layer.layerOL;

        // set layer extent (before, if necessary, convert them)
        if (layerProj != 'EPSG:' + this.currentMapSr.code)
        {
          layerOL.setExtent(transformExtent(
            layer.extent,
            layerProj,
            'EPSG:' + this.currentMapSr.code
          ));
        }
        else
          layerOL.setExtent(layer.extent);

      }

      // cicle on all vector layer
      // (we have to convert also hidden layers because if they are turned on
      //  after a reference system change, they are not visible)
      // layer.source condition is to avoid to call function on member of
      // vector composed layer
      if ((layer.service == ServiceType.VECTOR || layer.service == ServiceType.GEOJSON
        || layer.id_type == LayerTypology.GROUP)
        && layer && !firstAccess)
      {
        this.vectorLayerReproject(layer.id, 'EPSG:' + epsgCode);
      }
    }

    this.wgSvc.sendMessage('changeSR', null);

    // return to notify completion of system reference change
    return true;
  }

  /*
   *
   */
  private setOverviewMapSR(srId:number)
  {
    let newSR:WGSr = this.wgMap.getSrById(srId);

    if (!newSR)
    {
      console.error("The EPSG id " + srId + " is not available!");
      return false;
    }

    let ovwOptionView = {};

    let currOverviewMapView  = this.overviewMap.getOverviewMap().getView();
    let ovwActualExtentOldSR = currOverviewMapView.calculateExtent(this.overviewMap.getOverviewMap().getSize());

    let ovwActualExtentNewSR = transformExtent(
      ovwActualExtentOldSR,
      'EPSG:' + this.currentMapSr.code,
      'EPSG:' + newSR.code
    );

    ovwOptionView['extent']     = newSR.mapExtent;
    ovwOptionView['center']     = getCenter(ovwActualExtentNewSR || [0, 0, 0, 0]);
    ovwOptionView['zoom']       = currOverviewMapView.getZoom();
    ovwOptionView['projection'] = 'EPSG:' + newSR.code;

    // create new map view
    let ovwView = new View(ovwOptionView);

    // set map view on the map
    this.overviewMap.getOverviewMap().setView(ovwView);
  }

  /*
   * Calculate resolutions array for given map scales and given map SR
   */
  private setResolutions = function(srId):Array<number>
  {
    let resolutions:Array<number> = [];

    // check if EPSG id is among those in the map
    if (!this.wgMap.getSrById(srId))
    {
      console.error("The EPSG id " + srId + " is not available!");
      return;
    }

    let epsgCode = this.wgMap.getSrById(srId).code;

    // empties resolutions array
    //self.resolutions.length = 0;

    // meters per unit for the given SR
    let MPU = METERS_PER_UNIT[getProjection('EPSG:'+epsgCode).getUnits()];

    // calculate resolutions for each scale level
    for (let idx=0; idx<this.wgMap.scales.length; idx++)
    {
      resolutions.push(
        this.wgMap.scales[idx] / (MPU * this.wgSvc._screenDPI * this.wgSvc._IPM)
      );
    }

    return resolutions;
  };

  private vectorLayerReproject(layerId:number, toEpsgCode:string):void
  {
    // retrieve configuration
    var layer:WGMapLayer =  this.wgSvc.getLayerObjById(layerId);
    var layerOL:Layer  = null;

    if (layer.id_type == LayerTypology.GROUP)
    {
      if(layer['children'] && layer['children'].length > 0)
      {
        for (let idx=0; idx<layer['children'].length; idx++)
        {
          let item = layer['children'][idx];

          // if item have extent and a projection set extent
          if (item.extent && item.projection)
          {
            let itemProj = item.projection;
            let layerOLItem = item.layerOL;

            // set layer extent (before, if necessary, convert them)
            if (itemProj != 'EPSG:' + this.currentMapSr.code)
            {
              layerOLItem.setExtent(transformExtent(
                item.extent,
                itemProj,
                'EPSG:' + this.currentMapSr.code
              ));
            }
            else
              layerOLItem.setExtent(item.extent);
          }

          if ((item.service == ServiceType.VECTOR || item.service == ServiceType.GEOJSON
            || item.id_type == LayerTypology.GROUP)
            && item)
          this.vectorLayerReproject(item.id, toEpsgCode);
        }
        layer.setResolution();
        return;
      }
    }

    // layer is a group item:
    // we need to access to group configuration to retrieve item layer
    if (layer.id_parent)
    {
      let parentLayer:WGMapLayer = this.wgSvc.getLayerObjById(layer.id_parent);

      // only layerOL of groups with group items have getLayers method;
      // composed layers with group items haven't it -> in this case layerOL
      // is that of the parent
      if (parentLayer.layerOL.getLayers())
      {
        let itemsArray = parentLayer.layerOL.getLayers().getArray();

        for (let idx=0, len=itemsArray.length; idx<len; idx++)
        {
          if (itemsArray[idx].get('id') == layerId)
          {
            layerOL = itemsArray[idx];
          }
        }
      }
      else
        layerOL = parentLayer.layerOL;
    }
    else
      layerOL = layer.layerOL;

    // retrieve layer source
    // (if layer is clustered vector source is a property of cluster source)
    let source = (layerOL == null) ? null : layer.getSource();

    // reprojection is made only if layer has a source
    // (for service layer, source couldn't be defined)
    if (source)
    {
      // read source custom attribute projection
      let fromEpsg = source.get('projection');

      // get all features from source
      let featureArray = layerOL.getSource().getFeatures();

      // remove all features from source
      layerOL.getSource().clear();

      // cicle on all features to reproject them and add to source
      for (let idx=0, len=featureArray.length; idx<len; idx++)
      {
        featureArray[idx].getGeometry().transform(fromEpsg, toEpsgCode);
        layerOL.getSource().addFeature(featureArray[idx]);
      }

      // set new value on source custom attribute projection
      source.set('projection', toEpsgCode, true);
      layer.setResolution();
      // redraw layer
      layerOL.getSource().refresh();
    }
  }

  private addLayersToMap():void
  {
    // read base layers configuration
    let blArray = this.wgSvc.getBaseLayers();

    // cicle on base layers
    for (let idx=0; idx<blArray.length; idx++)
    {
      let bl = blArray[idx];

      // add base layer to the map
      this.map.addLayer(bl.layerOL);
    }

    // cycle to create layers
    let layersArray = this.wgSvc.getLayers();

    for (let idx=0; idx<layersArray.length; idx++)
    {
      let layer = layersArray[idx];

      if (layer &&
         (layer.service == ServiceType.VECTOR || layer.service ==  ServiceType.GEOJSON))
        layer.layerOL.getSource().set('projection', 'EPSG:' + this.wgSvc.getMapSrCode(), true);


      // if layer hasn't parent and belong to a category, we add it to the map
      if (layer.id_category != null && layer.id_parent == null)
      {
        layer.setResolution();
        this.map.addLayer(layer.layerOL);
      }
    }
  }

  /*
   *
   */
  private addHoverInteraction()
  {
    this.map.on('pointermove', (event) =>
    {
      // check if map hover event is enabled
      if (!this.defaultMapHoverEnabled)
        return;

      let layerId = null;
      let wgMapLayer:WGMapLayer = null;

      // retrieve feature at mouse position that belongs to a layer with hover enabled
      // is also defined a layer filter function
      let feature = this.map.forEachFeatureAtPixel(
        event.pixel,
        (feature, layer) =>
        {
          let hoverableLayer = this.wgSvc.getArray("hoverable");
          for (let idx=0; idx<hoverableLayer.length; idx++)
          {
            if (layer != null && hoverableLayer[idx]['id'] == layer.get('id'))
            {
              layerId    = layer.get('id');
              wgMapLayer = this.wgSvc.getLayerObjById(layerId);
              break;
            }
          }

          // discriminate between cluster and simple feature
          let size = 1;

          if (wgMapLayer && wgMapLayer.cluster)
          {
            size = feature.get('features').length;

            if (size == 1)
              feature = feature.get('features')[0];
          }

          return (layerId && size == 1) ? feature : null;
        }/*,
        {
          layerFilter:function(layer)
          {
            return self.hoverLayerIdArr.indexOf(layer.get('id')) >=0 ? true : false;
          }
        }*/
      );

      // if there is founded a feature,
      // we read its attributes configured to be showed on mouse hover and display tooltip
      // otherwise hide tooltip and set hover content to null
      if (feature)
      {
        let featureIdAttrName = wgMapLayer.id_field;
        let featureId = feature.get(featureIdAttrName);

        let featureObj:Object = {
          label: wgMapLayer.label,
          featureId: featureId,
          x: event.pixel[0] + this.mapDiv.nativeElement.offsetLeft,
          y: event.pixel[1] + this.mapDiv.nativeElement.offsetTop
        };

        // add fields (if exists)
        if (wgMapLayer.hoverable)
        {
          featureObj['data'] = {fields:[]};

          for (let idx = 0; idx<wgMapLayer.objAttributes['hover'].length; idx++)
          {
            let item = wgMapLayer.objAttributes['hover'][idx];

            featureObj['data']['fields'][idx] =
            {
              "key" : item['label'],
              "val" : feature.get(item['key']),
              "type": item['type']
            };
          }
        }

        this.featureHoverContent = featureObj;
        this.mapFeatureTooltipOverlay.setPosition(event.coordinate);
        this.mapFeatureTooltip.nativeElement.style.display = '';
      }
      else
      {
        this.featureHoverContent = null;
        this.mapFeatureTooltip.nativeElement.style.display = 'none';
      }
    });
  }

  /*
   *
   */
  private addPointerInteraction()
  {
    let cursorHoverStyle = "pointer";

    this.map.on("pointermove", (event) =>
    {
      var mouseCoordInMapPixels = [
        event.originalEvent.offsetX,
        event.originalEvent.offsetY
      ];

      // detect feature at mouse coords
      // callback function verify if feature belongs to queryable layer
      var hit = this.map.forEachFeatureAtPixel(
        mouseCoordInMapPixels,
        (feature, layer) =>
        {
          if (!layer)
            return true;
          else
          {
            let queryableLayer = this.wgSvc.getArray("queryable");
            for (let idx=0; idx<queryableLayer.length; idx++)
            {
              if (queryableLayer[idx]['id'] == layer.get('id'))
                return true;
            }

            return false;
          }
        }
      );

      if (hit)
        this.renderer.setStyle(this.mapDiv.nativeElement, 'cursor', cursorHoverStyle);
      else
        this.renderer.setStyle(this.mapDiv.nativeElement, 'cursor', '');
    });
  }

  /*
   *
   */
  private addMapClickEvent()
  {
    // calculate default map extent in current map SR to assign it to
    // editing layer (necessary to enable reprojection on this layer)
    let defaultEPSGCode = 'EPSG:' + this.wgMap.getDefaultSr().code
    let currentEPSGCode = 'EPSG:' + this.wgSvc.getMapSrCode();

    let mapExtentProj = (defaultEPSGCode == currentEPSGCode) ?
      this.wgMap.getDefaultSr().mapExtent :
      this.wgSvc.transformExtent(
        this.wgMap.getDefaultSr().mapExtent,
        defaultEPSGCode,
        currentEPSGCode
      );

    // feature overlay layer configuration object
    let overlayLayerCfg:Object = {
      id:              MapComponent.overlayLayerId,
      layer_name:      MapComponent.overlayLayerName,
      id_type:         LayerTypology.LAYER,
      opacity:         1,
      visible:         true,
      service:         ServiceType.VECTOR,
      projection:      currentEPSGCode,
      extent:          mapExtentProj,
      geometry_field:  {name:'geom'},
      support:          true,
      style: {
        type: 1,
        label: null,
        rules:[
          {
            name: null,
            op:null,
            conditions: null,
            symbol:{
              type: "line",
              color: "#57FEFFFF",
              size: 3,
              id: 1
            }
          },
          {
            name: null,
            op:null,
            conditions: null,
            symbol:{
              type: "polygon",
              color: "#F0FFFFFF",
              id: 1,
              strokeColor: "#57FEFFFF",
              strokeWidth: 1
            }
          },
          {
            name: null,
            op:null,
            conditions: null,
            symbol:{
              type: "shape",
              id: 1,
              offsetX: 8,
              offsetY: 8,
              size: 16,
              color: "#57FEFFFF"
            }
          }
        ]
      }
    };

    // build overlay layer and add to the map
    this.wgSvc.manageLayer("I", {cfg: overlayLayerCfg, isBaseLayer: false});
    this.overlayLayer = this.wgSvc.getLayerObjById(MapComponent.overlayLayerId);

    // add click event on map
    this.map.on("singleclick", (event) =>
    {
      // check if map click event is enabled
      if (!this.defaultMapClickEnabled)
        return;

      // support variables
      let lyrFtObj:Object = {};
      let featureClicked = 0;
      let clickOnCluster = false;
      let coords;

      this.map.forEachFeatureAtPixel(
        event.pixel,
        (feature, layer) =>
        {
          // retrieve layer id and related WGMapLayer object
          let layerId = layer.get('id');
          let wgMapLayer:WGMapLayer = this.wgSvc.getLayerObjById(layerId);

          // retrieve layerKey
          let layerKey = wgMapLayer.key;

          // retrieve feature identifier attribute name
          let featureIdAttrName = wgMapLayer.id_field;

          // feature cluster management
          let featuresArray = feature.get('features');


          if (featuresArray && featuresArray.length > 1)
          {
            clickOnCluster = true;
            lyrFtObj = {
              label: wgMapLayer.label,
              clusterFeature: feature,
              features: []
            };

            // manage click on cluster
            for (let idx=0; idx<featuresArray.length; idx++)
            {
              let ftr = featuresArray[idx];

              // retrieve the feature identifier value
              let featureId = ftr.get(featureIdAttrName);

              // build object with info to display
              let featureObj:Object = {
                feature: ftr,
                layerKey: layerKey,
                label: wgMapLayer.label,
                featureId: featureId,
                x: event.pixel[0] + this.mapDiv.nativeElement.offsetLeft,
                y: event.pixel[1] + this.mapDiv.nativeElement.offsetTop,
                coords: event.coordinate
              };

              // add fields (if exists)
              if (wgMapLayer.queryable)
              {
                featureObj['data'] = {fields:[]};

                for (let jdx = 0; jdx<wgMapLayer.objAttributes['query'].length; jdx++)
                {
                  let item = wgMapLayer.objAttributes['query'][jdx];

                  featureObj['data']['fields'][jdx] =
                  {
                    "key" : item['label'],
                    "val" : ftr.get(item['key']),
                    "type": item['type']
                  };
                }
              }

              // retrieve and set on feature data , the information management id_type
              // (TRUE by specific component, FALSE or NULL by popup on openlayer overlay)
              featureObj['queryManagement'] = wgMapLayer['advanced_query'];

              lyrFtObj['features'].push(featureObj);

              featureClicked++;
            }

            coords = event.coordinate;
          }
          else
          {
            // manage click on single feature

            // retrieve feature (for clustered source, features are always cluster)
            let simpleFeature = featuresArray ? featuresArray[0] : feature;

            // retrieve the feature identifier value
            let featureId = simpleFeature.get(featureIdAttrName);

            // build object with info to display
            let featureObj:Object = {
              feature: simpleFeature,
              layerKey: layerKey,
              label: wgMapLayer.label,
              featureId: featureId,
              x: event.pixel[0] + this.mapDiv.nativeElement.offsetLeft,
              y: event.pixel[1] + this.mapDiv.nativeElement.offsetTop,
              coords: event.coordinate
            };

            // add fields (if exists)
            if (wgMapLayer.queryable)
            {
              featureObj['data'] = {fields:[]};

              for (let idx = 0; idx<wgMapLayer.objAttributes['query'].length; idx++)
              {
                let item = wgMapLayer.objAttributes['query'][idx];

                featureObj['data']['fields'][idx] =
                {
                  "key" : item['label'],
                  "val" : simpleFeature.get(item['key']),
                  "type": item['type'],
                  "attr": item['key']
                };
              }
            }

            // retrieve and set on feature data , the information management id_type
            // (TRUE by specific component, FALSE or NULL by popup on openlayer overlay)
            featureObj['queryManagement'] = wgMapLayer['advanced_query'];

            // put data retrieved on click into an object, grouped by layer
            if (lyrFtObj[wgMapLayer.label])
            {
              lyrFtObj[wgMapLayer.label].push(featureObj);
            }
            else
            {
              lyrFtObj[wgMapLayer.label] = [featureObj];
            }

            featureClicked++;
            coords = event.coordinate;
          }
        },
        {
          // Layer filter function
          // Only layers which are visible and for which this function returns true
          // will be tested for features
          layerFilter: (layer) =>
          {
            let layerId = layer.get('id');

            // if set, this layer override check and is the only that listen map click
            // if (this.activeQueryableLayerId)
            //   return (layerId == this.activeQueryableLayerId) ? true : false;
            if (this.activeQueryableLayerId)
            {
              if (layerId == this.activeQueryableLayerId)
                return true;
              else
                return false;
            }


            let wgMapLayer:WGMapLayer = this.wgSvc.getLayerObjById(layerId);

            // check wgMapLayer is not null
            return (wgMapLayer && wgMapLayer.queryable) ? true : false;
          },
          hitTolerance: 2
        }
      );

      // discriminate between summary and feature
      // based on how many feature we've clicked on
      if (featureClicked == 0)
      {
        // remove highlited features if click on any feature
        this.overlayLayer.getSource().clear(true);
      }
      else if (featureClicked == 1)
      {
        // retrieve feature data
        let key = Object.keys(lyrFtObj)[0]
        let featureObj = lyrFtObj[key][0];
        let featureIsValid = true;

        // show feature data into popup o return feature id
        if (this.mapClickBehaviour == QueryMode.POPUP)
          this.showFeatureInfo(featureObj);
        else
        {
          // check if there is a filter to apply on selected feature,
          if (this.ftrFilterQueryableLayer)
          {
            // cycle on filter condition (in AND between them)
            for (let idx=0; idx<this.ftrFilterQueryableLayer.length; idx++)
            {
              let filterCond = this.ftrFilterQueryableLayer[idx];

              // check if selected feature verify filters
              if (featureObj.feature.get([filterCond['attr']]) != filterCond['value'])
              {
                featureIsValid = false;
                break;
              }
            }
          }

          // invoke callback
          if (this.mapClickCallback != null)
          {
            // send as featureId null if feature not responds to the filter
            this.mapClickCallback({id: featureIsValid ? featureObj['featureId'] : null});
            this.mapClickCallback = null;
          }

          // restore previous map click behaviour
          this.mapClickBehaviour       = this.mapClickStatus['mapClickBehaviour'];
          this.defaultMapClickEnabled  = this.mapClickStatus['defaultMapClickEnabled'];
          this.activeQueryableLayerId  = this.mapClickStatus['activeQueryableLayerId'];
          this.ftrFilterQueryableLayer = this.mapClickStatus['ftrFilterQueryableLayer'];

          this.mapClickStatus = {};
        }

        // highlight clicked feature (only if is valid)
        this.overlayLayer.getSource().clear(true);

        if (featureIsValid)
          this.overlayLayer.getSource().addFeature(featureObj['feature']);
      }
      else if (featureClicked > 1)
      {
        if (clickOnCluster)
        {
          // show cluster popup
          this.showClusterPopup(coords, lyrFtObj);

          // highlight clicked cluster
          this.overlayLayer.getSource().clear(true);
          this.overlayLayer.getSource().addFeature(lyrFtObj['clusterFeature']);
        }
        else
        {
          // show summary popup
          this.showSummaryPopup(coords, lyrFtObj);

          // highlight clicked features
          this.overlayLayer.getSource().clear(true);

          // cycle on layer
          for (let key in lyrFtObj)
            // cycle on feature of given layer
            for (let idx=0; idx<lyrFtObj[key].length; idx++)
              this.overlayLayer.getSource().addFeature(lyrFtObj[key][idx]['feature']);
        }
      }

    });
  }

  /*
   * Modify map click behaviour
   * Normally is shown a popup with feature info;
   * in this mode is sent a message that return feature clicked id
   *
   * in params we have name of layer of interest
   */
  private getFeatureId(params:Object):void
  {
    if (params['layerKey'] && params['callback'])
    {
      let wgMapLayer:WGMapLayer = this.wgSvc.getLayerObjByKey(params['layerKey']);

      if (wgMapLayer.service == ServiceType.VECTOR ||
          wgMapLayer.service == ServiceType.GEOJSON)
      {
        // get current map click behaviour
        // this behaviour is driven from three attributes:
        // mapClickBehaviour, defaultMapClickEnabled and activeQueryableLayerId
        // status is saved to be restored after map click on feature belongs to given layer
        this.mapClickStatus = {
          mapClickBehaviour:       this.mapClickBehaviour,
          defaultMapClickEnabled:  this.defaultMapClickEnabled,
          activeQueryableLayerId:  this.activeQueryableLayerId,
          ftrFilterQueryableLayer: this.ftrFilterQueryableLayer
        };

        // light on layer
        this.wgSvc.setLayerVisibility(wgMapLayer.key, true);

        // configure map click behaviour
        this.defaultMapClickEnabled = true;
        this.activeQueryableLayerId = wgMapLayer['id'];
        this.mapClickBehaviour = QueryMode.ID;
        this.ftrFilterQueryableLayer = params['filterCond'];

        // save callback tied to map feature click
        this.mapClickCallback = params['callback'];
      }
      else
        console.error("Error: wrong layer type on getFeatureId: layer " + params['layerKey']);
    }
    else
      console.error("Error: invoked getFeatureId method without layer key or callback!");
  }

  /*
   *
   */
  private addTool()
  {
    let toolId = this.toolActive['id'];

    if (toolId)
    {
      // Create component dynamically inside the ng-template
      const componentFactory = this.componentFactoryResolver.resolveComponentFactory(getMapToolsClass(toolId));
      this.mapToolCmp = this.mapToolContainer.createComponent(componentFactory);
      this.mapToolCmp.instance.cfg = this.toolActive;
    }
  }

  /*
   *
   */
  private removeTool()
  {
    this.mapToolContainer.remove();
  }

  /*
   * Build overview map
   */
  private buildOverviewControl():void
  {
    if (this.overviewCfg)
    {
      // get overview layer configuration
      let ovwLyrCfg = this.overviewCfg['params']['layer'];

      // build overview layer object
      let ovwLayer = new WGMapLayer(this.wgSvc, ovwLyrCfg, false)

      // build overview map control
      this.overviewMap = new OverviewMap({
        target: 'mapOverview',
        className: 'ol-overviewmap custom-overviewmap',
        collapsed: false,
        collapsible: false,
        view: new View(
        {
          projection: 'EPSG:' + this.wgSvc.getMapSrCode(),
          minZoom: this.overviewCfg['params']['minZoom'] || 0
        }),
        layers: [ovwLayer.layerOL]
      });
    }
  }

  /**
   * Zoom in function
   */
  zoomIn(): void
  {
    this.view.animate({
      zoom: this.view.getZoom() + 1,
      duration: 500
    });
  }

  /**
   * Zoom out function
   */
  zoomOut(): void
  {
    this.view.animate({
      zoom: this.view.getZoom() - 1,
      duration: 500
    });
  }

  /**
   * Zoom all function
   */
  zoomAll(): void
  {
    this.view.fit(
      this.wgSvc.getMapBBox()
    );
  }

  /**
   * Zoom window function
   */
  zoomBox(): void
  {
    this.map.addInteraction(this.dragZoomInteraction);
  }

  /**
   * Show overview function (invoked by related gis tool button)
   */
  overview(): void
  {
    let currVisibility = this.mapOverviewDiv.nativeElement.style.visibility;

    if (currVisibility == 'visible')
    {
      this.mapOverviewDiv.nativeElement.style.visibility = 'hidden';
      this.isOvwOpen = false;
    }
    else
    {
      this.mapOverviewDiv.nativeElement.style.visibility = 'visible';
      this.isOvwOpen = true;

      // build overviewMap control and add it to the map
      if (!this.overviewMap)
      {
        this.buildOverviewControl();

        this.map.getControls().extend([
          this.overviewMap
        ]);
      }
    }
  }

  /*
   * Choose where to show single feature info based on queryManagement value:
   *
   * - false = inner management -> show info is demanded to map component
                                   (this is default behaviour)
   * - true  = outer management -> show info is demanded to component that listen an observable;
                                   this component then decide if manage info itself or
                                   send back to map component
   */
  showFeatureInfo(featureObj:Object)
  {
    switch(featureObj['queryManagement'])
    {
      case true:
        // send a message to display feature popup
        this.wgSvc.sendMessage('featureClick',featureObj);
        break;

      default:
        this.showFeaturePopup(featureObj);
    }

    return false;
  }

  /*
   * Show summary popup
   * this is shows when we clicked more than one feature on the map
   */
  showSummaryPopup(coords:Array<number>, lyrFtObj:Object)
  {
    this.summaryPopupSelectedLayer = null;

    this.summaryPopupTitle = "Selezione Multipla";
    this.summaryPopupContent = lyrFtObj;

    this.mapSummaryPopupOverlay.setPosition(coords);

    this.sumPopover["open"]();
  }

  /*
   * Close summary popup
   */
  closeSummaryPopup()
  {
    this.mapSummaryPopupOverlay.setPosition(undefined);
    this.summaryPopupSelectedLayer = null;

    return false;
  }

  /*
   * Invoked by clicking on number of features of a given layer into summary popup
   * shows the list of id of these features
   * If argument is null, summary popup return to show features numbers grouped by layers
   */
  showSummaryDetails(layerLbl:string)
  {
    this.summaryPopupSelectedLayer = layerLbl;
    return false;
  }

  /*
   * Show Single feature popup
   */
  showFeaturePopup(ftObj:Object)
  {
    this.featurePopupContent = ftObj;
    this.featurePopupTitle = "Dettaglio " + ftObj['label'];

    this.mapFeaturePopupOverlay.setPosition(ftObj['coords'])

    this.ftrPopover["open"]();

    return false;
  }

  /*
   * Close single feature popup
   */
  closeFeaturePopup()
  {
    this.mapFeaturePopupOverlay.setPosition(undefined);
    return false;
  }

  /*
   * Show cluster popup
   * this is shows when we clicked on cluster on the map
   */
  showClusterPopup(coords:Array<number>, lyrFtObj:Object)
  {
    this.clusterPopupTitle = "Dettaglio cluster " + lyrFtObj['label'];
    this.clusterPopupContent = lyrFtObj['features'];

    this.mapClusterPopupOverlay.setPosition(coords);

    this.clusterPopover["open"]();
  }

  /*
   * Close cluster popup
   */
  closeClusterPopup()
  {
    this.mapClusterPopupOverlay.setPosition(undefined);
    return false;
  }

  /*
   * Listen event received from webgis edit component
   */
  onEdit(config:object)
  {
    // when edit mode is on, we have to disable default map click and hover interactions
    this.defaultMapClickEnabled = !config['edit'];
    this.defaultMapHoverEnabled = !config['edit'];
  }

  /*
   * Force a recalculation of the map view size
   */
  updateSize()
  {
    setTimeout(() => {this.map.updateSize();}, 10);
  }

  /*
   * clear overlay layer (remove hilighted features from it)
   */
  resetOverlayLayer()
  {
    if (this.overlayLayer)
    {
      this.overlayLayer.getSource().clear(true);
    }
  }

  /*
   *
   */
  hilightFeature(params:object)
  {
    this.wgSvc.setLayerVisibility(params['layerKey'], true);

    let wgMapLayer = this.wgSvc.getLayerObjByKey(params['layerKey']);

    // if current extent is not received, we retrieve it from current view
    let currExtent = params['bbox'] ?
      params['bbox'] :
      this.map.getView().calculateExtent(this.map.getSize());

    // if hilightMode is not defined or is equal to SINGLE, we reset overlay Layer
    if (typeof params['hilightMode'] === "undefined" ||
        params['hilightMode'] == HilightMode.SINGLE)
    {
      this.resetOverlayLayer();
    }
    
    // if feature is in current extent (no change event fired)
    wgMapLayer.getSource().forEachFeatureInExtent(currExtent, (f) => {
      if (f.get(params['ftAttrName']) == params['ftAttrVal'])
      {
        // clone feature to set hilight style
        let fClone = f.clone();

        if (params['hilightStyle'])
          fClone.setStyle(this.wgSvc.buildStyle(params['hilightStyle']));

        this.overlayLayer.getSource().addFeature(fClone);
      }
    });

    // if change event fired
    let listenerKey = wgMapLayer.getSource().on('change', (e) => {
      
      wgMapLayer.getSource().forEachFeatureInExtent(currExtent, (f) => {
        if (f.get(params['ftAttrName']) == params['ftAttrVal'])
        {
          // clone feature to set hilight style
          let fClone = f.clone();

          if (params['hilightStyle'])
            fClone.setStyle(this.wgSvc.buildStyle(params['hilightStyle']));

          this.overlayLayer.getSource().addFeature(fClone);
        }
      });

      // unregister the "change" listener 
      unByKey(listenerKey);
    });
  }

  // Set value on defaultMapClickEnabled to enable/disable default map click on queryable layer
  setDefaultMapClickEnabled(value: boolean)
  {
    this.defaultMapClickEnabled = value;
  }

  // Get value of defaultMapClickEnabled
  getDefaultMapClickEnabled(): boolean
  {
    return this.defaultMapClickEnabled;
  }
}
