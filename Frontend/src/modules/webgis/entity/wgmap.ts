/*
 * WGMap class
 */

import {WGSr}   from './wgsr';
import {WGTool} from './wgtool';


/**
 * Map configuration entity
 */
export class WGMap
{
  id: number;
  name: string;
  bbox: Array<number>;
  scales: Array<number>;
  watermark: string;
  currentScale: number;
  point_zoom_level: number;

  // reference systems
  sr: Array<WGSr>;
  private srObj: Object;

  // map tools
  private toolsObj: Object;
  private toolsArray: Array<WGTool>;
  private toolbarToolsArray: Array<WGTool>;

  constructor(options:any)
  {
    // set mapCfg attributes
    this.id = options['id'];
    this.name = options['map_name'];
    this.watermark = options['watermark'];
    this.bbox = options['default_bbox'];
    this.scales = options['scales'];
    this.point_zoom_level = options['point_zoom_level'];

    // reference system
    this.sr    = [];
    this.srObj = {};

    for (let idx=0; idx<options['sr'].length; idx++)
    {
      let item = new WGSr(options['sr'][idx]);
      this.sr.push(item);

      this.srObj[item.id] = item;
    }

    // map tools
    this.toolsObj = {};
    this.toolsArray = [];
    this.toolbarToolsArray = [];

    for (let idx=0; idx<options['tools'].length; idx++)
    {
      let item = new WGTool(options['tools'][idx]);

      this.toolsObj[item.id] = item;

      this.toolsArray.push(item);

      if (item.id != 'overview')
        this.toolbarToolsArray.push(item);
    }

  }

  /*
   * Utility methods
   */
  public getMapToolsCfg():Array<WGTool>
  {
    return this.toolsArray;
  }

  public getToolbarToolsArray():Array<WGTool>
  {
    return this.toolbarToolsArray;
  }

  public getMapSr():Object
  {
    return this.srObj;
  }

  public getSrByCode(epsgCode:number):WGSr
  {
    for (let idx=0; idx<this.sr.length; idx++)
    {
      if (this.sr[idx].code == epsgCode)
        return this.sr[idx];
    }

    // this line of code should never be reached
    return null;
  }

  public getSrById(id:number):WGSr
  {
    return this.srObj[id];
  }

  public getToolsById(id:string):WGTool
  {
    return this.toolsObj[id];
  }

  public getDefaultSr():WGSr
  {
    for (let idx=0; idx<this.sr.length; idx++)
    {
      if (this.sr[idx].default)
        return this.sr[idx];
    }
  }

  getScales (): Array<number>
  {
    return this.scales;
  }

  setCurrentScale(scale: number)
  {
    this.currentScale = scale;
  }

  getCurrentScale():number
  {
    return this.currentScale;
  }
}



