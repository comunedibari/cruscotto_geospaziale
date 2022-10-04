/*
 * Layer entity used in config component
 */

import { WGLayer } from './wglayer';

export class WGCfgLayer extends WGLayer
{
  children: WGCfgLayer[];
  queryable: boolean;
  styleClass: string;

  /* Composed child WMS filter */
  property_name: string;
  property_val: string;
  operator: string;

  /*
   * Methods
   */
  constructor(cfg:object)
  {
    super(cfg);

    this.children = [];
    this.styleClass = "cfg-lay-tree-node";

    /* Look for children */
    let layers = cfg ? cfg["layers"] : null;
    if (layers)
    {
      for (let j = 0;j < layers.length;j++)
        this.addLayer(new WGCfgLayer(layers[j]));
    }
  }

  update(cfg:object)
  {
    super.update(cfg);

    /* Process filter attributes */
    let filter = this.filter || {};

    this.property_name = filter["property_name"];
    this.property_val = filter["property_val"];
    this.operator = filter["operator"];

    /* Update queryable attribute */
    this.queryable = (
      this.attributes.length == 1 &&
      this.attributes[0].key == null &&
      this.attributes[0].query == true) ? true : null;
  }

  addLayer(cfgLay:WGCfgLayer)
  {
    this.children.push(cfgLay);
  }

  delLayer(cfgLay:WGCfgLayer)
  {
    for (let j = 0;j < this.children.length;j++)
    {
      if (this.children[j].id == cfgLay.id)
      {
        this.children.splice(j,1);
        break;
      }
    }
  }

  canAddChild():boolean
  {
    return (this.id_type == 2 || this.id_type == 3);
  }

  newChildPosition():number
  {
    let pos = 0;

    for (let j = 0;j < this.children.length;j++)
      if (this.children[j]._position > pos)
        pos = this.children[j]._position;

    return pos+1;
  }
}
