/**
 * WGSr class
 * System reference configuration entity
 */

import {Projection} from 'ol/proj/Projection.js';

export class WGSr
{
  id: number;
  code: number;
  name: string;
  prefix: string;
  units: string;
  x_label: string;
  y_label: string;
  x_prefix: string;
  y_prefix: string;
  default: boolean;
  definition: string;
  proj: Projection;
  mapExtent:Array<number>;

  constructor(options:any)
  {
    this.id = options['id'];
    this.code = options['code'];
    this.name = options['name'];
    this.prefix = options['prefix'];
    this.units = options['units'];
    this.x_label = options['x_label'];
    this.x_prefix = options['x_prefix'];
    this.y_label = options['y_label'];
    this.y_prefix = options['y_prefix'];
    this.default = options['_default'];
    this.definition = options['definition'];
  }
}
