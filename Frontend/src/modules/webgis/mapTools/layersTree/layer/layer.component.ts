import { Component, OnInit, Input,
          Output, EventEmitter}     from '@angular/core';

import {NgbModal}                   from '@ng-bootstrap/ng-bootstrap';
import {ConfigUserStyleComponent}   from '../../../config-user-style/config-user-style.component';
import { WGStyle }                  from '../../../entity/wgStyle';
import {WebgisService}              from '../../../webgis.service';
import {ServiceType,LayerTypology}  from '../../../webgis.util';

@Component({
  selector: 'webgis-layer',
  templateUrl: './layer.component.html',
  styleUrls: ['./layer.component.css']
})

export class LayerComponent implements OnInit
{
  @Input() item;

  @Output() zoom = new EventEmitter<number>();

  name: string = 'layer';
  opacitySliderValue:number;

  isCollapsed:boolean;

  constructor(private modalSvc: NgbModal, private wgSvc:WebgisService)
  {
    this.isCollapsed = true;
  }

  ngOnInit()
  {
//     console.info(this.item);
  }

  getName():string
  {
    return name;
  }

  onUserChangeOpacity(change): void
  {
    if(this.item.selected || this.item.visibility)
    {
      let op = 1 - change.value/100;

      this.item.opacityPerc = change.value;
      this.item.setOpacity(op);
    }
  }

  onZoomIn()
  {
    this.zoom.emit(this.item)
  }

  onUserStyle()
  {
    let modalUserStyle = this.modalSvc.open(
      ConfigUserStyleComponent,
      {backdrop:"static", keyboard:false, size:"lg"}
    );

    let style = null;
    if (this.wgSvc.getUserStyle(this.item.id))
      style = new WGStyle(this.wgSvc.getUserStyle(this.item.id));

    modalUserStyle.componentInstance.layer = this.item;
    modalUserStyle.componentInstance.style = style;
  }

  /*
   * Return true/false if layer is WFS
   */
  showUserStyle(layer)
  {
    if (!layer)
      return false;

    // Layer composed
    if (layer.id_type == LayerTypology.COMPOSED && layer.service == ServiceType.VECTOR)
      return false;

    // child of composed WFS
    let parent = layer.id_parent ? this.wgSvc.getLayerObjById(layer.id_parent) : null;

    if (layer.id_type == null && parent && parent.service == ServiceType.VECTOR)
      return true;

    if (layer.service == ServiceType.VECTOR)
      return true;

  }

  /*
   * Return true/false if layer has any visibility limitations on scales
   */
  layerHasScaleLimit(layer)
  {
    let retVal = false;

    if (layer.min_scale || layer.max_scale)
      retVal = true;

    return retVal;
  }

  /*
   * Return type of scale limit on layer:
   *
   * - until to 1:min_scale
   * - from 1:min_scale to 1:max_scale
   * - from 1:max_scale
   */
  scaleLimitType(layer)
  {
    let type = null;

    if (layer.min_scale || layer.max_scale)
    {
      if (layer.max_scale && layer.min_scale == undefined)
        type = "_FROM_SCALE_";
      else if (layer.min_scale && layer.max_scale == null)
        type = "_UNTIL_TO_SCALE_";
      else if (layer.min_scale && layer.max_scale)
        type = "_FROM_TO_SCALE_";
    }

    return type;
  }
}
