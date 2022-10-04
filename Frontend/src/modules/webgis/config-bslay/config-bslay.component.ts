import { Component,OnInit,ViewChildren,QueryList } from '@angular/core';
import { Output,EventEmitter } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { WGCfgLayer } from '../entity/wgCfgLayer';
import { ModelService } from '../../core/model.service';
import { WebgisService } from '../webgis.service';
import { FormComponent } from '../../core/form/form.component';
import { ContextService } from '../../core/context.service';
import { WGConfigService } from '../webgis.config.service';

@Component({
  selector: 'webgis-config-bslay',
  templateUrl: './config-bslay.component.html',
  styleUrls: ['./config-bslay.component.css']
})

export class ConfigBslayComponent implements OnInit
{
  loading: boolean = false;
  layerDef: number = null;
  layerSel: WGCfgLayer = null;
  layerList: WGCfgLayer[] = [];
  draggedIdx: number = null;

  @Output() showMessage = new EventEmitter<any>();
  @ViewChildren(FormComponent) qlFormCmp:QueryList<FormComponent>;

  /*
   * Layer form
   */
  layerForm =
  {
    id:"layerForm", fg:
    [
      {
        id:0, rows:
        [
          [
            {
              key: "label",
              type: "text",
              label: "WORD.NAME",
              width: 12,
              required: true
            }
          ],
          [
            {
              key: "id_server",
              type: "select",
              label: "Server",
              width: 6,
              required: true,
              options: this.contextSvc.getContext("wgServer")
            },
            {
              key: "service",
              type: "select",
              label: "WORD.SERVICE",
              width: 6,
              required: true,
              options: WGCfgLayer.baseServiceCtx()
            }
          ],
          [
            {
              key: "url",
              type: "text",
              label: "URL",
              width: 11,
              required: true
            },
            {
              key: "btLoad",
              type: "button",
              label: "",
              width: 1,
              btnImage: "assets/common/download.png"
            }
          ],
          [
            {
              key: "layer_name",
              type: "select",
              label: "Layer",
              width: 6,
              required: true,
              options: []
            },
            {
              key: "tiled",
              type: "boolean",
              label: "Tiled",
              width: 3,
              required: true
            },
            {
              key: "transparent",
              type: "boolean",
              label: "WORD.TRANSPARENCY",
              width: 3,
              required: true
            }
          ]
        ]
      }
    ]
  };

  /*
   * Methods
   */
  constructor(
    private http:HttpClient,
    private modelSvc:ModelService,
    private webgisSvc:WebgisService,
    private contextSvc:ContextService,
    private wgConfigSvc:WGConfigService
  ) {}

  ngOnInit()
  {
    this.wgConfigSvc.loadConfig().subscribe(val =>
    {
      this.layerList = this.wgConfigSvc.baseLayers;

      /* Look for default */
      for (let j = 0;j < this.layerList.length;j++)
      {
        if (this.layerList[j]._default)
        {
          this.layerDef = this.layerList[j].id;
          break;
        }
      }
    });
  }

  newLayer()
  {
    this.layerSel = new WGCfgLayer({});
  }

  updateLayer(bl)
  {
    if (this.layerSel == bl)
      return;

    /* Update form config */
    this.getFormCmp("layerForm").disableFields(
      ["btLoad","layer_name","tiled"],bl.service !== "WMS");

    /* Load WMS capabilities */
    if (bl.service == "WMS")
      this.loadWMSCap(bl.url,bl.id_server);

    /* Show base layer */
    this.layerSel = bl;
  }

  deleteLayer(bl,idx)
  {
    if (bl._default)
    {
      this.showMessage.emit({
        msg: "WEBGIS.DEL_DEF_BASEMAP",
        bt0: "Ok",
        style: "warning"
      });
      return;
    }

    /* Ask for confirmation */
    this.showMessage.emit({
      msg: "MESSAGE.DELETE_ITEM_MSG",
      bt0: "No",
      bt1: "WORD.YES",
      style: "info",
      callback: ret =>
      {
        if (ret != 1)
          return;

        /* Delete */
        let url = "/wgBaseMap/delete/"+bl.id+"?simple=true";

        this.modelSvc.delete(url).subscribe(res =>
        {
          if (res)
            this.layerList.splice(idx,1);

          this.webgisSvc.manageLayer("D",{id:bl.id, isBaseLayer:true});

          this.showMessage.emit({
            msg: "MESSAGE.DELETE_" + (res ? "OK" : "ERR"),
            bt0: "Ok",
            style: res ? "info" : "danger"
          });
        });
      }
    });
  }

  save()
  {
    let layerForm = this.getFormCmp("layerForm");

    /* Check validity and changed */
    if (!layerForm.isValid() || !layerForm.isChanged())
      return;

    /* Save */
    let chObj = layerForm.getChangedObj();

    if (!this.layerSel.id)
    {
      /* Get layer id */
      this.modelSvc.detail("/webgis/serialId").subscribe(sid =>
      {
        if (!sid)
        {
          this.showMessage.emit({
            msg: "MESSAGE.INSERT_ERR",
            bt0: "Ok",
            style: "danger"
          });
          return;
        }

        /* Insert */
        chObj.id = sid;
        chObj.version = this.layerSel.version;
        chObj._default = false;
        chObj._position = this.layerList.length+1;
        chObj.projection = "EPSG:" + (chObj.service == "WMS" ?
          this.webgisSvc.getDefaultMapSrCode() : "3857");

        this.modelSvc.insert("/wgBaseMap/insert",chObj).subscribe(res =>
        {
          if (res)
          {
            this.layerSel.update(chObj);
            this.layerList.push(this.layerSel);
            this.webgisSvc.manageLayer("I",{cfg:chObj,isBaseLayer:true});

            this.showMessage.emit({
              msg: "MESSAGE.INSERT_OK",
              bt0: "Ok",
              style: "info",
              callback: ret => {
                this.layerSel = null;
              }
            });
          }
          else
          {
            this.showMessage.emit({
              msg: "MESSAGE.INSERT_ERR",
              bt0: "Ok",
              style: "danger"
            });
          }
        });
      });
    }
    else
    {
      /* Update */
      let url = "/wgBaseMap/update/"+this.layerSel.id;

      this.modelSvc.update(url,chObj).subscribe(res =>
      {
        if (res)
        {
          this.layerSel.update(chObj);
          this.webgisSvc.manageLayer("U",{id:this.layerSel.id,cfg:chObj,isBaseLayer:true});
          this.showMessage.emit({
            msg: "MESSAGE.UPDATE_OK",
            bt0: "Ok",
            style: "info",
            callback: ret => {
              this.layerSel = null;
            }
          });
        }
        else
        {
          this.showMessage.emit({
            msg: "MESSAGE.UPDATE_ERR",
            bt0: "Ok",
            style: "danger"
          });
        }
      });
    }
  }

  close()
  {
    this.layerSel = null;
  }

  changeDefault(bl)
  {
    var newDef = bl, oldDef = null;

    /* Prepare data */
    let aObj = [{id:newDef.id, _default:true}];

    for (let j = 0;j < this.layerList.length;j++)
    {
      let lay = this.layerList[j];
      if (lay._default)
      {
        aObj.push({id:lay.id, _default:false});
        oldDef = lay;
        break;
      }
    }

    /* Update default (use insert method to exec a POST) */
    this.modelSvc.insert("/wgBaseMap/bulkUpdate",aObj).subscribe(res =>
    {
      if (res)
      {
        newDef._default = true;
        oldDef._default = false;
        this.webgisSvc.changeDefaultBL(newDef.id, oldDef.id);
      }
      else
      {
        this.layerDef = oldDef.id;
        this.showMessage.emit({
          msg: "MESSAGE.UPDATE_ERR",
          bt0: "Ok",
          style: "danger"
        });
      }
    });
  }

  /*
   * Event handler
   */
  onLayerFormChanged(obj)
  {
    let layerForm = this.getFormCmp("layerForm");

    switch (obj.key)
    {
      case "id_server":
        let url = obj.val == 1 ? this.webgisSvc.getMsURL()+"/wms" : this.layerSel.url,
          svc = obj.val == 1 ? "WMS" : this.layerSel.service;

        layerForm.setValueForKey("url",url);
        layerForm.setValueForKey("service",svc);
        layerForm.disableFields(["service"],obj.val === 1);
        break;
      case "service":
        let disFields = ["btLoad","layer_name","tiled"],
          tiled = obj.val !== "WMS" ? true : this.layerSel.tiled;

        layerForm.disableFields(disFields,obj.val !== "WMS");
        layerForm.setValueForKey("tiled",tiled);
        break;
      case "btLoad":
        this.loadWMSCap(
          layerForm.getValueForKey("url"),
          layerForm.getValueForKey("id_server")
        );
        break;
    }
  }

  /*
   * Drag and Drop
   */
  onDragStart(ev,idx)
  {
    this.draggedIdx = idx;
  }

  onDragEnd(ev,idx)
  {
    // Nothing to do
  }

  onDrop(ev,idx)
  {
    if (this.draggedIdx != null && this.draggedIdx != idx)
    {
      let body = [];

      /* Update local position */
      this.layerList.splice(idx,0,this.layerList.splice(this.draggedIdx,1)[0]);

      this.layerList.forEach((lay,i) =>
      {
        lay._position = i + 1;
        body.push({id:lay.id, _position:lay._position})
      });

      /* Update on server */
      this.loading = true;

      this.modelSvc.insert("/wgBaseMap/bulkUpdate",body).subscribe(res =>
      {
        this.loading = false;
        this.draggedIdx = null;
      });
    }
  }

  /*
   * Private methods
   */
  private getFormCmp(id)
  {
    return this.qlFormCmp.find(cmp => cmp.id === id);
  }

  private loadWMSCap(url,srv)
  {
    if (!url)
      return;

    /* Build capabilities url */
    let capUrl = srv == 1 ? this.webgisSvc.getMsPrefix() : "/proxy/",
      qsChar = url.indexOf("?") > 0 ? "&" : "?";

    capUrl += url + qsChar + "request=GetCapabilities&service=WMS";

    /* Exec request */
    this.loading = true;

    this.http.get(capUrl,{responseType:"text"}).subscribe
    (
      res =>
      {
        this.loading = false;

        /* Process response */
        let wmsCap = this.webgisSvc.parseWMSCapabilities(res),
          capObj = wmsCap ? wmsCap["Capability"] : null;

        if (!capObj)
        {
          this.showMessage.emit({
            msg: "WEBGIS.GET_CAP_ERR",
            bt0: "Ok",
            style: "danger"
          });
          return;
        }

        /* Set version on new layer */
        if (!this.layerSel.id)
          this.layerSel.version = wmsCap["version"];

        /* Process Layer to update layer_name context */
        let aContetx = [];

        this.processWMSLay([capObj.Layer],aContetx);
        this.layerForm.fg[0].rows[3][0]["options"] = aContetx;
      },
      err =>
      {
        this.loading = false;
        this.showMessage.emit({
          msg: "WEBGIS.GET_CAP_ERR",
          bt0: "Ok",
          style: "danger"
        });
      }
    );
  }

  private processWMSLay(inp:any[],out:any[])
  {
    for (let j = 0;j < inp.length;j++)
    {
      let lay = inp[j];
      if (!lay) continue;

      if (lay.Layer)
        this.processWMSLay(lay.Layer,out);
      else
      {
        if (lay.Name)
          out.push({id:lay.Name, name:lay.Title});
        else
          console.warn(lay); //Debug
      }
    }
  }
}
