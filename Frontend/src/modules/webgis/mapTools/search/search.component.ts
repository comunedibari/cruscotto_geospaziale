import { Component, OnInit }           from '@angular/core';

import {Subscription}                  from 'rxjs';

import {WebgisService}                 from '../../webgis.service';

import {HttpReaderService}             from '../../../core/http-reader.service';

@Component({
  selector: 'webgis-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent implements OnInit
{
  searchArray:Array<object> = [];
  selLayer = null;
  searchLayer = {};

  // search layer form configuration
  searchLayerFormCfg =
  {
    id: "searchLayerForm",
    fg:
    [
      {
        rows:
        [
          [
            {
              key: "layer_id",
              type: "select",
              label: "WEBGIS.LAYERS",
              width: 8,
              options:  [],
              optionLabel: "label"
            },
            {
              key: "new_search",
              type: "button",
              label: "",
              width: 4,
              btnLabel: "WORD.NEW"
            }
          ]
        ]
      }
    ]
  };

  private subscription:Subscription;

  // Dictionary to store all attributes to layer
  private dictAttributesLayer = {};

  constructor(private webgisSvc:WebgisService, private httpReader:HttpReaderService) { }

  ngOnInit()
  {
    // subscribe component to manage webgis service messages
    this.subscription = this.webgisSvc.observer.subscribe((obj) =>
    {
      if (obj && obj.key)
      {
        switch (obj.key)
        {
          case 'changeSearchableLayer':
            this.searchLayerFormCfg.fg[0].rows[0][0].options = [...obj.val];
            break;
        }
      }
    });

    this.searchLayerFormCfg.fg[0].rows[0][0].options = [...this.webgisSvc.getArray("searchable")];
  }

  deleteSearch(index)
  {
    this.searchArray.splice(index,1);
  }

  /* event handler*/
  onSearchLayerFormChanged(event)
  {
    switch(event.key)
    {
      case 'new_search':
        this.searchArray.push({
          collapsed: false,
          layer: this.selLayer,
          config: this.dictAttributesLayer
        });

        break;

      case 'layer_id':
        this.dictAttributesLayer = {};
        this.selLayer = this.webgisSvc.getLayerObjById(event.val);

        let keyAttSearchable = this.selLayer.objAttributes['search'].map(item => {return item.key;});

        let url = "/context/tableInfo?table=" + this.selLayer.layer_name;

        this.httpReader.get(url).subscribe
        (
          res1 =>
          {
            for (let i = 0; i < res1['result'].length; i++)
            {
              let item = res1['result'][i];
              if (keyAttSearchable.indexOf(item.column) >= 0)
                this.dictAttributesLayer[item.column] = item;
            }
          },
          err1 =>
          {
            console.log(err1);
          }
        );
        break;
    }
  }

}
