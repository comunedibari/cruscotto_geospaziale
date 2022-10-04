/*
 * WGMapCategory class: extends WGCategory and
 * is used in map component
 */

import { WGCategory } from './wgcategory';
import { WGMapLayer } from './wgmapLayer';

export class WGMapCategory extends WGCategory
{
  closed: boolean;
  layers: Array<WGMapLayer>;

  /*
   * Methods
   */
  constructor(cfg:object)
  {
    super(cfg);

    this.layers = [];
    this.closed = true;

    this.update(cfg);
  }

  addLayer(ml:WGMapLayer)
  {
    this.layers.push(ml);
  }

  delLayer(ml:WGMapLayer)
  {
    let idx = this.layers.indexOf(ml);
    if (idx >= 0) this.layers.splice(idx,1);
  }
}
