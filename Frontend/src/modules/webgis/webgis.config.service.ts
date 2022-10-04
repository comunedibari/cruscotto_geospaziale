import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { WGCfgLayer } from './entity/wgCfgLayer';
import { WGCfgCategory } from './entity/wgCfgCategory';
import { HttpReaderService } from '../core/http-reader.service';

@Injectable({
  providedIn: 'root'
})

export class WGConfigService
{
  baseLayers: WGCfgLayer[] = [];
  categories: WGCfgCategory[] = [];

  private loaded: boolean = false;

  /*
   * Methods
   */
  constructor(private httpReader:HttpReaderService) {}

  loadConfig():Observable<boolean>
  {
    if (this.loaded)
      return new Observable(observer => {observer.next(true);});

    return new Observable(observer =>
    {
      /* Load webgis permission */
      let filter = {filter:"app_name|EQ|webgis"};

      this.httpReader.post("/permission/master",filter).subscribe
      (
        res =>
        {
          let aRes = res ? res["result"] : null
          if (aRes)
          {
            /* Prepare request body */
            let body = {permLayers:[]};

            for (let j = 0;j < aRes.length;j++)
              body.permLayers.push(aRes[j].name);

            /* Load layers config */
            this.httpReader.post("/webgis/getConfig",body).subscribe
            (
              res =>
              {
                let layObj = res ? res["layers"] : null;
                if (layObj)
                {
                  let aBase = layObj["base"] || [],
                    aCat = layObj["categories"] || [];

                  /* Create base layers */
                  for (let j = 0;j < aBase.length;j++)
                    this.baseLayers.push(new WGCfgLayer(aBase[j]));

                  /* Create categories */
                  for (let j = 0;j < aCat.length;j++)
                    this.categories.push(new WGCfgCategory(aCat[j]));

                  /* OK */
                  this.loaded = true;
                  observer.next(true);
                }
              },
              err =>
              {
                console.error(err);
                observer.next(false);
              }
            );
          }
        },
        err =>
        {
          console.error(err);
          observer.next(false);
        }
      );
    });
  }

  getCategory(id:number):WGCfgCategory
  {
    for (let j = 0;j < this.categories.length;j++)
      if (this.categories[j].id == id)
        return this.categories[j];

    return null;
  }

  getLayer(id:number):WGCfgLayer
  {
    for (let j = 0;j < this.categories.length;j++)
    {
      let catLayers = this.categories[j].layers;

      for (let i = 0;i < catLayers.length;i++)
      {
        let layer = this.findLayer(catLayers[i],id);
        if (layer) return layer;
      }
    }

    return null;
  }

  /*
   * Private Methods
   */
  private findLayer(layer:WGCfgLayer,id:number):WGCfgLayer
  {
    if (layer.id == id)
      return layer;

    for (let j = 0;j < layer.children.length;j++)
    {
      let retLay = this.findLayer(layer.children[j],id);
      if (retLay) return retLay;
    }

    return null;
  }
}
