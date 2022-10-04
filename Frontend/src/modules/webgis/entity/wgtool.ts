/**
 * WGTool class
 * Map tools configuration entity
 */
export class WGTool
{
  id: string;
  tip: string;
  params: object;
  permission: string;
  class: string;
  position: number;

  constructor(options:any)
  {
    this.id = options['id'];
    this.tip = options['tip'];
    this.params = options['params'];
    this.permission = options['permission'];
    this.class = options['class'];
    this.position = options['_position'];
  }
}