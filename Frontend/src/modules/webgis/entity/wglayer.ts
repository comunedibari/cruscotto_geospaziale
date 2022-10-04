/*
 * WGLayer class
 */
import { WGStyle } from './wgStyle';

export class WGLayer
{
  id:number = null;
  id_server:number = null;
  _position:number = null;

  url:string = null;
  label:string = null;
  version:string = null;
  info_format:string = null;
  service:string = null;
  layer_name:string = null;
  key:string = null; // attribute to use as key in getLayerObjByKey method
  projection:string = null;
  permission:string = null;

  tiled:boolean = null;
  private:boolean = null;
  _default:boolean = null;
  transparent:boolean = null;
  print_not_reproject:boolean = null;

  /* Extra (not for base) */
  id_field:string = null;
  extent:number[] = null;

  depth:number = null;
  id_type:number = null;
  min_scale:number = null;
  max_scale:number = null;
  id_parent:number = null;
  id_category:number = null;

  visible:boolean = null;
  cluster:boolean = null;
  editable:boolean = null;
  dynamic_filter:boolean = null;
  advanced_query:boolean = null;

  filter:{property_name:string,property_val:string,operator:string} = null;
  attributes:any[] = null;
  image_param:{size:number[],extent:number[]} = null;
  geometry_field:{name:string,type:string} = null;

  style:WGStyle;
  cluster_style:WGStyle;

  /*
   * Static method
   */
  static baseServiceCtx()
  {
    return [
      {id:"WMS", name:"WMS"},
      {id:"OSM", name:"OSM"},
      {id:"XYZ", name:"XYZ"}
    ];
  }

  /*
   * Methods
   */
  constructor(cfg:any)
  {
    this.update(cfg);
  }

  update(cfg:any)
  {
    for (let key in cfg)
    {
      if (this[key] !== undefined)
        this[key] = cfg[key];
    }

    /* Look for style */
    if (cfg.style)
      this.style = new WGStyle(cfg.style);

    /* Look for cluster_style */
    if (cfg.cluster_style)
      this.cluster_style = new WGStyle(cfg.cluster_style);

    /* Local update */
    this.private = this.permission ? true : false;
    this.attributes = this.attributes || [];
  }
}
