/*
 * Category entity used in config component
 */

import { WGCategory } from './wgcategory';
import { WGCfgLayer } from './wgCfgLayer';

export class WGCfgCategory extends WGCategory
{
  layers: Array<WGCfgLayer>;
  private: boolean;
  collapsed: boolean;

  /*
   * Methods
   */
  constructor(cfg:object)
  {
    super(cfg);

    this.layers = [];
    this.collapsed = true;

    this.update(cfg);

    /* Look for layers */
    let aLayer = cfg ? cfg["layers"] : null;
    if (aLayer)
    {
      for (let j = 0;j < aLayer.length;j++)
        this.addLayer(new WGCfgLayer(aLayer[j]));
    }
  }

  update(cfg:object)
  {
    super.update(cfg);

    this.private = this.permission ? true : false;
  }

  addLayer(cfgLay:WGCfgLayer)
  {
    this.layers.push(cfgLay);
  }

  delLayer(cfgLay:WGCfgLayer)
  {
    for (let j = 0;j < this.layers.length;j++)
    {
      if (this.layers[j].id == cfgLay.id)
      {
        this.layers.splice(j,1);
        break;
      }
    }
  }

  newLayerPosition():number
  {
    let pos = 0;

    for (let j = 0;j < this.layers.length;j++)
      if (this.layers[j]._position > pos)
        pos = this.layers[j]._position;

    return pos+1;
  }
}
