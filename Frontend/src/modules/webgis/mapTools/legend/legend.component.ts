import {Component, OnInit, Input}    from '@angular/core';

import {Subscription}                from 'rxjs';

import {WebgisService}               from '../../webgis.service';

import {WGTool}                      from '../../entity/wgtool';
import {WGMapCategory}               from '../../entity/wgMapCategory';

@Component({
  selector: 'webgis-legend',
  templateUrl: './legend.component.html',
  styleUrls: ['./legend.component.css']
})

export class LegendComponent implements OnInit {

  cfg: WGTool;

  catList: Array<Object> = [];

  categoryArray:Array<WGMapCategory>;

  errorIcon = {};

  private subscription:Subscription;


  constructor(private wgSvc:WebgisService)
  {
    this.categoryArray = this.wgSvc.getCategories();
  }

  ngOnInit()
  {
    this.subscription = this.wgSvc.observer.subscribe((layerObj) =>
    {
      switch(layerObj['key'])
      {
        // Catch the change resolution event
        case 'changeResolution':
        case 'changeLayer':
          this.createLegendTree();
          break;
      }
    });

    this.createLegendTree();
  }

  ngOnDestroy()
  {
    this.subscription.unsubscribe();
  }

  /*
   * Methods
   */
  iconsRules(icons)
  {
    return Object.values(icons);
  }

  isObject(obj)
  {
    return (typeof obj === "object" && obj !== null);
  }

  changeSource(event, layer)
  {
    event.target.src = 'assets/common/no-image.png';
    this.errorIcon[layer.id] = true;
  }

  setCfg(cfg: WGTool)
  {
    this.cfg = cfg;
  }

  /*
   * Private method
   */
  private createLegendTree()
  {
    this.catList = [];
    let list = this.categoryArray.map(x => Object.assign({}, x));

    // create legend tree with only selected layer
    for (let idx = 0; idx < list.length; idx++)
    {
      let cat = Object.assign({},list[idx]);
      let catLayerList = cat['layers'].map(x => Object.assign({}, x));
      let catOpened = false;
      cat['layers'] = [];

      for (let jdx = 0; jdx < catLayerList.length; jdx++)
      {
        let lyr = Object.assign({}, catLayerList[jdx]);

        if (lyr['children'])
          this.manageChildrenLegend(lyr);

        // TODO: Add check if lyr['legend'] is true, otherwise lyr don't add to legend tree
        if (lyr['visibility'] && !lyr['disabled'])
        {
          catOpened = catOpened || true;
          lyr['expanded'] = true;
          cat['layers'].push(lyr);
        }
        else
          catOpened = catOpened || false;
      }

      cat['closed'] = !catOpened;

      this.catList.push(cat);
    }
  }

  private manageChildrenLegend(layer)
  {
    let layerList = layer['children'].map(x => Object.assign({}, x));
    layer['children'] = [];

    for (let kdx=0; kdx<layerList.length; kdx++)
    {
      let child = layerList[kdx];
      child['styleClass'] = "";

      if (child['visibility'] && !child['disabled'])
      {
        child['expanded'] = true;
        layer['children'].push(child);
      }

      if(child['children'] && child['children'].length > 0)
        this.manageChildrenLegend(child);
    }

    layer['styleClass'] = "";
  }
}
