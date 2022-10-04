import { Component,OnInit,ViewChild,ViewChildren,QueryList } from '@angular/core';
import { Output,EventEmitter } from '@angular/core';
import { HttpClient,HttpHeaders } from '@angular/common/http';
import { Tree,UITreeNode } from 'primeng/tree';

import { WGCfgLayer } from '../entity/wgCfgLayer';
import { WGCfgCategory } from '../entity/wgCfgCategory';
import { FormComponent } from '../../core/form/form.component';
import { ConfigStyleComponent } from '../config-style/config-style.component'

import { AuthService } from '../../core/auth.service';
import { ModelService } from '../../core/model.service';
import { ConfigService } from '../../core/config.service'
import { WebgisService } from '../webgis.service';
import { ContextService } from '../../core/context.service';
import { WGConfigService } from '../webgis.config.service';
import { HttpWriterService } from '../../core/http-writer.service';

import { parseString } from 'xml2js';

@Component({
  selector: 'webgis-config-layer',
  templateUrl: './config-layer.component.html',
  styleUrls: ['./config-layer.component.css']
})

export class ConfigLayerComponent implements OnInit
{
  laySel:WGCfgLayer = null;
  catSel:WGCfgCategory = null;
  catList:WGCfgCategory[] = [];

  loading:boolean = false;
  layNameOptions:{id:string,name:string,epsg:string,bbox:number[]}[]= [];

  @Output() showMessage = new EventEmitter<any>();
  @ViewChild(ConfigStyleComponent) styleCmp:ConfigStyleComponent;
  @ViewChildren(FormComponent) qlFormCmp:QueryList<FormComponent>;

  /*
   * Category form config
   */
  catForm =
  {
    id:"catForm", fg:
    [
      {
        id:0, rows:
        [
          [
            {
              key: "label",
              type: "text",
              label: "WORD.NAME",
              width: 10,
              required: true
            },
            {
              key: "private",
              type: "boolean",
              label: "WORD.PRIVATE",
              width: 2
            }
          ]
        ]
      }
    ]
  };

  /*
   * Layer forms config
   */
  layMainForm:any = null;

  private layMainForm1 =
  {
    id:"layMainForm1", fg:
    [
      {
        id:0, rows:
        [
          [
            {
              key: "label",
              type: "text",
              label: "WORD.NAME",
              width: 6,
              required: true
            },
            {
              key: "id_type",
              type: "select",
              label: "WORD.TYPE",
              width: 4,
              options: this.contextSvc.getContext("wgLayerType"),
              required: true
            },
            {
              key: "private",
              type: "boolean",
              label: "WORD.PRIVATE",
              width: 2
            }
          ]
        ]
      },
      {
        id:1, hidden:true, rows:
        [
          [
            {
              key: "id_server",
              type: "select",
              label: "Server",
              width: 6,
              options: this.contextSvc.getContext("wgServer"),
              required: true
            },
            {
              key: "service",
              type: "select",
              label: "WORD.SERVICE",
              width: 6,
              options: [],
              required: true,
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
              options: [],
              required: true,
            },
            {
              key: "projection",
              type: "text",
              label: "WORD.PROJECTION",
              width: 6,
              required: true
            }
          ]
        ]
      },
      {
        id:2, hidden:true, rows:
        [
          [
            {
              key: "visible",
              type: "boolean",
              label: "WEBGIS.INI_VIS",
              width: 4,
              required: true
            },
            {
              key: "max_scale",
              type: "number",
              label: "WEBGIS.MAX_SCALE",
              width: 4
            },
            {
              key: "min_scale",
              type: "number",
              label: "WEBGIS.MIN_SCALE",
              width: 4
            }
          ]
        ]
      },
      {
        id:3, hidden:true, rows:
        [
          [
            {
              key: "tiled",
              type: "boolean",
              label: "Tiled",
              width: 6,
              required: true
            },
            {
              key: "transparent",
              type: "boolean",
              label: "WORD.TRANSPARENT",
              width: 6
            }
          ]
        ]
      },
      {
        id:4, hidden:true, rows:
        [
          [
            {
              key: "cluster",
              type: "boolean",
              label: "Cluster",
              width: 6
            },
            {
              key: "editable",
              type: "boolean",
              label: "WORD.EDITABLE",
              width: 6
            }
          ]
        ]
      }
    ]
  };

  private layMainForm2 =
  {
    id:"layMainForm2", fg:
    [
      {
        id:0, rows:
        [
          [
            {
              key: "label",
              type: "text",
              label: "WORD.NAME",
              width: 10,
              required: true
            },
            {
              key: "private",
              type: "boolean",
              label: "WORD.PRIVATE",
              width: 2
            }
          ],
          [
            {
              key: "layer_name",
              type: "select",
              label: "Layer",
              width: 12,
              required: true,
              options: []
            }
          ]
        ]
      },
      {
        id:1, rows:
        [
          [
            {
              key: "visible",
              type: "boolean",
              label: "WEBGIS.INI_VIS",
              width: 4,
              required: true
            },
            {
              key: "max_scale",
              type: "number",
              label: "WEBGIS.MAX_SCALE",
              width: 4
            },
            {
              key: "min_scale",
              type: "number",
              label: "WEBGIS.MIN_SCALE",
              width: 4
            }
          ]
        ]
      }
    ]
  };

  private layMainForm3 =
  {
    id:"layMainForm3", fg:
    [
      {
        id:0, rows:
        [
          [
            {
              key: "label",
              type: "text",
              label: "WORD.NAME",
              width: 10,
              required: true
            },
            {
              key: "private",
              type: "boolean",
              label: "WORD.PRIVATE",
              width: 2
            }
          ]
        ]
      },
      {
        id:1, rows:
        [
          [
            {
              key: "property_name",
              type: "select",
              label: "WORD.ATTRIBUTE",
              width: 4,
              options: [],
              required: true
            },
            {
              key: "operator",
              type: "select",
              label: "WORD.OPERATOR",
              width: 4,
              options: this.contextSvc.getContext("operator"),
              required: true
            },
            {
              key: "property_val",
              type: "text",
              label: "WORD.VALUE",
              width: 4,
              required: true
            }
          ]
        ]
      },
      {
        id:2, rows:
        [
          [
            {
              key: "visible",
              type: "boolean",
              label: "WEBGIS.INI_VIS",
              width: 4,
              required: true
            },
            {
              key: "max_scale",
              type: "number",
              label: "WEBGIS.MAX_SCALE",
              width: 4
            },
            {
              key: "min_scale",
              type: "number",
              label: "WEBGIS.MIN_SCALE",
              width: 4
            }
          ]
        ]
      }
    ]
  };

  /*
   * Layer data form and table
   */
  layDataForm:any =
  {
    id:"layDataForm", fg:
    [
      {
        id:0, rows:
        [
          [
            {
              key: "id_field",
              type: "select",
              label: "WORD.KEY",
              width: 6,
              options: [],
              optionLabel: "id"
            },
            {
              key: "queryable",
              type: "boolean",
              label: "WORD.QUERYABLE",
              width: 6,
              hidden: true
            }
          ]
        ]
      }
    ]
  };

  layDataType:{id:string,name:string}[] =
  [
    {id:"NULL", name:""},
    {id:"TEXT", name:"Testo"},
    {id:"LINK", name:"Link"},
    {id:"IMAGE",name:"Immagine"}
  ];

  layDataCols:any[] = [];

  layDataRows:any[] = [];

  private layDataColsWMS:any[] =
  [
    {id:"key",   type:1,width:"35%",label:"WORD.ATTRIBUTE"},
    {id:"label", type:2,width:"35%",label:"Alias"},
    {id:"type",  type:4,width:"20%",label:"WORD.TYPE"},
    {id:"query", type:3,width:"10%",label:"Click"}
  ];

  private layDataColsWFS:any[] =
  [
    {id:"key",   type:1,width:"26%",label:"WORD.ATTRIBUTE"},
    {id:"label", type:2,width:"24%",label:"Alias"},
    {id:"type",  type:4,width:"18%",label:"WORD.TYPE"},
    {id:"query", type:3,width:"10%",label:"Click"},
    {id:"hover", type:3,width:"10%",label:"Hover"},
    {id:"search",type:3,width:"12%",label:"WORD.SEARCH"}
  ];

  /*
   * Methods
   */
  constructor(
    private httpCln:HttpClient,
    private authSvc: AuthService,
    private modelSvc:ModelService,
    private configSvc:ConfigService,
    private webgisSvc:WebgisService,
    private contextSvc:ContextService,
    private wgConfigSvc:WGConfigService,
    private httpWriter:HttpWriterService
  )
  {
    UITreeNode.prototype.onDropNodeDragOver = function(ev){return;};

    Tree.prototype.allowDrop = function(dragNode:any,dropNode:any,dragNodeScope:any):boolean
    {
      if (dragNode && dropNode)
      {
        if (dragNode.id_category != dropNode.id_category)
          return false;

        if (dragNode.id_parent != dropNode.id_parent)
          return false;

        return true;
      }

      return false;
    }
  }

  ngOnInit()
  {
    this.wgConfigSvc.loadConfig().subscribe(val =>
    {
      this.catList = this.wgConfigSvc.categories;
    });
  }

  reset()
  {
    this.catSel = null;
    this.laySel = null;
    this.layMainForm = null;
    this.layDataCols = [];
    this.layDataRows = [];
  }

  save()
  {
    let saveMet = this.catSel ? "saveCat" :
      (this.laySel.id ? "updateLay" : "insertLay");
    let saveEnt = this.catSel || this.laySel;

    this[saveMet](saveEnt);
  }

  /*
   * Category
   */
  addCat()
  {
    this.reset();
    this.catSel = new WGCfgCategory({});
  }

  updCat(cat)
  {
    if (this.catSel == cat)
      return;

    this.reset();
    this.catSel = cat;
  }

  delCat(cat,idx)
  {
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
        let url = "/wgCategory/delete/"+cat.id+"?simple=true";

        this.modelSvc.delete(url).subscribe(res =>
        {
          if (res)
          {
            this.catList.splice(idx,1);
            this.webgisSvc.manageCategory("D",{id:cat.id});
          }

          this.showMessage.emit({
            msg: "MESSAGE.DELETE_" + (res ? "OK" : "ERR"),
            bt0: "Ok",
            style: res ? "info" : "danger"
          });
        });
      }
    });
  }

  /*
   * Layer
   */
  addLayer(cat,par)
  {
    this.reset();
    this.laySel = new WGCfgLayer({
      id_category: cat.id,
      id_parent: par ? par.id : null,
      _position: par ? par.newChildPosition() : cat.newLayerPosition(),
      depth: par ? par.depth+1 : 1
    });

    /*
     * Choose right main form
     */
    if (!par || par.id_type != 3)
    {
      // Enable id_type
      this.layMainForm1.fg[0].rows[0][1]["disabled"] = false;

      this.layMainForm1.fg[1].hidden = true;
      this.layMainForm1.fg[2].hidden = true;
      this.layMainForm1.fg[3].hidden = true;
      this.layMainForm1.fg[4].hidden = true;
      this.layMainForm1.fg[1]["disabled"] = false;

      // Update layer_name field
      this.layMainForm1.fg[1].rows[2][0]["type"] = "select";
      this.layMainForm1.fg[1].rows[2][0]["hidden"] = false;

      this.layMainForm = this.layMainForm1;
    }
    else
    {
      switch (par.service)
      {
        case "WMS":
          /*
           * Load parent capabilities to get layer_name list
           */
          this.loadCapabilities({url:par.url,svc:"WMS",srv:par.id_server},
          data =>
          {
            /* Enable layer_name and set options */
            this.layMainForm2.fg[0].rows[1][0]["disabled"] = false;

            this.layMainForm2.fg[0].rows[1][0]["type"] = "select";
            this.layMainForm2.fg[0].rows[1][0]["options"] =
              data.layers || [];

            /* Set main form */
            this.layMainForm = this.layMainForm2;
          });
          break;
        case "WFS":
          /*
           * Load parent info to get attributes list
           */
          this.loadLayerInfo(par,data =>
          {
            this.layMainForm3.fg[1]["disabled"] = false;

            /* Update property_name type and options */
            this.layMainForm3.fg[1].rows[0][0]["type"] = "select";
            this.layMainForm3.fg[1].rows[0][0]["options"] = data;

            /* Set main form */
            this.layMainForm = this.layMainForm3;
          });
          break;
      }
    }
  }

  updLayer(lay)
  {
    this.reset();
    this.laySel = lay;

    /*
     * Choose right main form
     */
    switch (lay.id_type)
    {
      case 1:
      case 3:
      case 4:
        // Disable id_type
        this.layMainForm1.fg[0].rows[0][1]["disabled"] = true;

        // Update service options
        this.layMainForm1.fg[1].rows[0][1]["options"] = [
          {id:"WMS",name:"WMS"},
          {id:"WFS",name:"WFS"}
        ];

        // Manage fields group visibility
        this.layMainForm1.fg[1].hidden = false;
        this.layMainForm1.fg[2].hidden = lay.id_type == 3;
        this.layMainForm1.fg[3].hidden = lay.service != "WMS";
        this.layMainForm1.fg[4].hidden = lay.service != "WFS";

        this.layMainForm1.fg[1]["disabled"] = true;

        // Update layer_name field
        this.layMainForm1.fg[1].rows[2][0]["type"] = "text";
        this.layMainForm1.fg[1].rows[2][0]["hidden"] =
          (lay.id_type == 3 && lay.service == "WMS");

        this.layMainForm = this.layMainForm1;
        break;
      case 2:
        // Disable id_type
        this.layMainForm1.fg[0].rows[0][1]["disabled"] = true;

        // Manage fields group visibility
        this.layMainForm1.fg[1].hidden = true;
        this.layMainForm1.fg[2].hidden = true;
        this.layMainForm1.fg[3].hidden = true;
        this.layMainForm1.fg[4].hidden = true;
        this.layMainForm1.fg[1]["disabled"] = true;

        this.layMainForm = this.layMainForm1;
        break;
      case null:
        var par= this.wgConfigSvc.getLayer(lay.id_parent);
        if (!par) break;

        switch (par.service)
        {
          case "WMS":
            // Disable layer_name and change type
            this.layMainForm2.fg[0].rows[1][0]["disabled"] = true;
            this.layMainForm2.fg[0].rows[1][0]["type"] = "text";

            this.layMainForm = this.layMainForm2;
            break;
          case "WFS":
            // Disable property_name and change type
            this.layMainForm3.fg[1]["disabled"] = true;
            this.layMainForm3.fg[1].rows[0][0]["type"] = "text";

            this.layMainForm = this.layMainForm3;
            break;
        }
        break;
    }

    /*
     * Load layer attributes for data/style tab
     */
    if (this.showLayTab(1,lay) || this.showLayTab(2,lay))
    {
      this.loadLayerInfo(lay,data =>
      {
        let layAtt = lay.attributes, layAttKey = {}, keyFieldOpt = [];

        for (let j = 0;j < layAtt.length;j++)
          layAttKey[layAtt[j].key] = 1;

        /* Process data */
        for (let i = 0;i < data.length;i++)
        {
          let att = data[i];

          if (!layAttKey[att.id] && !att.type.startsWith("gml:"))
            layAtt.push({
              key:att.id, type: "NULL",label: "",
              query:false, hover:false, search:false
            });

          keyFieldOpt.push({id: att.id});
        }

        /* Update data tab */
        if (this.showLayTab(1,lay))
        {
          /* Configure data table */
          this.layDataRows = layAtt.map(att => Object.assign({},att));
          this.layDataCols = lay.service == "WFS" ?
            this.layDataColsWFS : this.layDataColsWMS;

          /* Configure data form */
          this.layDataForm.fg[0].rows[0][0]["options"] = keyFieldOpt;
          this.layDataForm.fg[0].rows[0][1]["hidden"] = data.length > 0;
        }

        /* Update attributes context in style component */
        if (this.showLayTab(2,lay) && this.styleCmp)
          this.styleCmp.updateAttributesCtx(keyFieldOpt);
      });
    }
  }

  delLayer(lay)
  {
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
        let url = "/wgLayer/delete/"+lay.id+"?simple=true";

        this.modelSvc.delete(url).subscribe(res =>
        {
          if (res)
          {
            let par = lay.id_parent ?
              this.wgConfigSvc.getLayer(lay.id_parent) :
              this.wgConfigSvc.getCategory(lay.id_category);

            if (par) par.delLayer(lay);
            this.webgisSvc.manageLayer("D",{id:lay.id, isBaseLayer:false});
          }

          this.showMessage.emit({
            msg: "MESSAGE.DELETE_" + (res ? "OK" : "ERR"),
            bt0: "Ok",
            style: res ? "info" : "danger"
          });
        });
      }
    });
  }

  showLayTab(tab,lay):boolean
  {
    let par = this.wgConfigSvc.getLayer(lay.id_parent),
      parSvc = par ? par.service : null;

    switch (tab)
    {
      case 1: /* Data */
        return (
          lay.id_type == 1 ||
          (lay.id_type == 3 && lay.service == "WFS") ||
          (lay.id_type == null && parSvc == "WMS")
          /* || lay.id_type == 4*/
        );
      case 2: /* Style */
        return (lay.id_type != 3 && (lay.service == "WFS" || parSvc == "WFS"));
    }

    return false;
  }

  /*
   * Event handler
   */
  onLayMainFormChange(obj)
  {
    let form = this.getFormCmp(obj.id);

    switch (obj.key)
    {
      case "id_type":
        form.reset([1]);
        form.disableFields(["btLoad","layer_name"],false);

        /* Set fields group visibility */
        if (obj.val == 4) //raster
        {
          form.hiddenFieldsGroup([1,2,3],false);
          form.hiddenFieldsGroup([4],true);
        }
        else
        {
          form.hiddenFieldsGroup([1],obj.val == 2);
          form.hiddenFieldsGroup([2],obj.val == 2 || obj.val == 3);
          form.hiddenFieldsGroup([3,4],true);
        }

        /* Enable fields group */
        form.disableFieldsGroup([1],obj.val == 2);

        /* Reset service options */
        this.layMainForm.fg[1].rows[0][1]["options"] = [];

        break;
      case "id_server":
        /* Update service options */
        let serviceOpt = [{id:"WMS",name:"WMS"},{id:"WFS",name:"WFS"}];

        if (obj.val == 1 && form.getValueForKey("id_type") == 1)
          serviceOpt.push({id:"IMAGE",name:"Immagine"});
        else if (form.getValueForKey("id_type") == 4)
          serviceOpt.splice(1,1);

        this.layMainForm.fg[1].rows[0][1]["options"] = serviceOpt;

        /* Reset url */
        form.setValueForKey("url",null);

        break;
      case "service":
        /* Set fields group visibility */
        form.hiddenFieldsGroup([3],obj.val != "WMS");
        form.hiddenFieldsGroup([4],obj.val != "WFS");

        /* Manage btLoad and layer_name visibility */
        if (obj.val === "WMS" && form.getValueForKey("id_type") == 3)
        {
          // WMS composed
          form.disableFields(["btLoad","layer_name","projection"],true);
          form.setValueForKey(
            "projection",
            "EPSG:"+this.webgisSvc.getDefaultMapSrCode()
          );
        }
        else
        {
          form.disableFields(["btLoad","layer_name"],obj.val === "IMAGE");
          form.disableFields(["projection"],obj.val !== "IMAGE");
        }

        /* Set internal url */
        if (form.getValueForKey("id_server") == 1)
        {
          let url = obj.val == "IMAGE" ? null :
            this.webgisSvc.getMsURL() + "/" + obj.val.toLowerCase();

          form.setValueForKey("url",url);
        }

        break;
      case "btLoad":
        this.loadCapabilities(
        {
          url: form.getValueForKey("url"),
          svc: form.getValueForKey("service"),
          srv: form.getValueForKey("id_server")
        },data =>
        {
          this.laySel.version = data.version || null;
          this.laySel.info_format = data.info_format || null;
          this.layMainForm.fg[1].rows[2][0]["options"] = data.layers || [];
        });
        break;
      case "layer_name":
        let idType = form.getValueForKey("id_type");

        /* Update projection and extent (only for layer,composed,raster) */
        if (idType && idType != 2)
        {
          for (let j = 0;j < this.layNameOptions.length;j++)
          {
            if (this.layNameOptions[j].id == obj.val)
            {
              form.setValueForKey("projection",this.layNameOptions[j].epsg);
              this.laySel.extent = this.layNameOptions[j].bbox;
            }
          }
        }

        break;
    }
  }

  onStyleMessage(obj)
  {
    this.showMessage.emit(obj);
  }

  onNodeDrop(ev)
  {
    let aLayer = ev.dropNode.id_parent ?
      this.wgConfigSvc.getLayer(ev.dropNode.id_parent).children :
      this.wgConfigSvc.getCategory(ev.dropNode.id_category).layers;

    if (aLayer && aLayer.length)
    {
      let body = [];

      aLayer.forEach((lay,idx) =>
      {
        lay._position = idx+1;
        body.push({id:lay.id, _position:lay._position});
      });

      /* Update on server */
      this.loading = true;

      this.httpWriter.post("/wgLayer/bulkUpdate",body).subscribe(
        res => {this.loading = false;},
        err => {this.loading = false;}
      );
    }
  }

  /*
   * Private methods
   */
  private getFormCmp(id)
  {
    return this.qlFormCmp.find(cmp => cmp.id === id);
  }

  private loadCapabilities(opt,callback:(data:any) => void)
  {
    if (!opt.url || !opt.svc || !opt.srv)
      return;

    /* Build capabilities url */
    let qsChar = opt.url.indexOf("?") > 0 ? "&" : "?";
    let capUrl = opt.url + qsChar + "request=GetCapabilities&service=" + opt.svc;

    capUrl = (opt.srv == 1) ?
      this.webgisSvc.getMsPrefix() + capUrl :
      this.configSvc.urlPrefix.er + "/utility/proxy?url=" +
        encodeURIComponent(capUrl);

    /* Exec request */
    this.loading = true;

    this.httpCln.get(
      capUrl,
      {
        headers: {"it_app_auth":this.authSvc.getToken()},
        responseType:"text"
      }).subscribe
    (
      res =>
      {
        this["process"+opt.svc+"Cap"](res,data =>
        {
          this.loading = false;
          this.layNameOptions = data ? data.layers : [];

          if (!data)
          {
            this.showMessage.emit({
              msg: "WEBGIS.GET_CAP_ERR",
              bt0: "Ok",
              style: "danger"
            });
          }

          callback(data || {});
        });
      },
      err =>
      {
        this.loading = false;
        this.showMessage.emit({
          msg: "WEBGIS.GET_CAP_ERR",
          bt0: "Ok",
          style: "danger"
        });

        callback({});
      }
    );
  }

  private processWMSCap(xml:string,callback:(data:any) => void)
  {
    let obj = this.webgisSvc.parseWMSCapabilities(xml),
      capObj = obj["Capability"],
      retObj = null;

    if (capObj)
    {
      let infoFormat = this.processFeatureInfoFormat(capObj.Request.GetFeatureInfo);

      retObj = {version:obj["version"], info_format:infoFormat, layers:[]};

      /* Process layers */
      this.processWMSLay([capObj.Layer],retObj.layers);
    }

    callback(retObj);
  }

  private processWMSLay(inp:any[],out:any[])
  {
    for (let j = 0;j < inp.length;j++)
    {
      let lay = inp[j];

      if (lay.Layer)
      {
        this.processWMSLay(lay.Layer,out);
      }
      else
      {
        /* Get projection and bbox */
        let proj = null, bbox = null,
          aBbox = lay.BoundingBox;

        for (let i = 0;i < aBbox.length;i++)
        {
          if (aBbox[i].crs.startsWith("EPSG"))
          {
            proj = aBbox[i].crs;
            bbox = aBbox[i].extent;

            if (proj.endsWith("4326"))
              bbox = [bbox[1],bbox[0],bbox[3],bbox[2]];

            break;
          }
        }

        /* Save data */
        if (lay.Name)
          out.push({id:lay.Name, name:lay.Title, epsg:proj, bbox:bbox});
        else
          console.warn(lay); //Debug
      }
    }
  }

  private processFeatureInfoFormat(featureInfo:Object)
  {
    if (!featureInfo)
      return null;

    if (featureInfo && featureInfo['Format'])
    {
      let aFormat = featureInfo['Format'];

      if (aFormat.indexOf("application/json") >= 0)
        return "application/json";
      else if (aFormat.indexOf("text/xml") >= 0)
        return "text/xml";
      else if (aFormat.indexOf("text/plain") >= 0)
        return "text/plain";
      else
        return null;
    }
  }

  private processWFSCap(xml:string,callback:(data:any) => void)
  {
    parseString(xml,{explicitArray:false},(err,res) =>
    {
      let retObj = null;

      if (!err && res)
      {
        let capObj = res["wfs:WFS_Capabilities"] || res["WFS_Capabilities"];
        if (capObj)
        {
          retObj = {
            version:capObj["$"] ? capObj["$"]["version"] : null,
            layers:[]
          };

          /* Look for layers */
          let layers = capObj["FeatureTypeList"] ?
            capObj["FeatureTypeList"]["FeatureType"] : null;

          if (layers)
          {
            for (let j = 0;j < layers.length;j++)
            {
              let curLay = layers[j];

              /* Get projection and bbox */
              let proj = null, bbox = null;

              if (curLay.DefaultCRS)
                proj = "EPSG:"+curLay.DefaultCRS.split("::")[1];
              else if (curLay.CRS)
                proj = curLay.CRS;
              else if (curLay.SRS)
                proj = curLay.SRS;

              if (proj)
              {
                if (curLay["ows:WGS84BoundingBox"])
                {
                  bbox = (
                    curLay["ows:WGS84BoundingBox"]["ows:LowerCorner"] + " " +
                    curLay["ows:WGS84BoundingBox"]["ows:UpperCorner"]
                  ).split(" ").map(val => {return parseFloat(val);});

                  bbox = this.webgisSvc.transformExtent(bbox,"EPSG:4326",proj);
                }

                if (curLay["LatLongBoundingBox"])
                {
                  bbox = [
                    curLay["LatLongBoundingBox"]["$"]["minx"]*1,
                    curLay["LatLongBoundingBox"]["$"]["miny"]*1,
                    curLay["LatLongBoundingBox"]["$"]["maxx"]*1,
                    curLay["LatLongBoundingBox"]["$"]["maxy"]*1
                  ];
                }
              }

              let layerName = curLay.Name.indexOf(':') >= 0 ?
                curLay.Name.substring(curLay.Name.indexOf(':')+1, curLay.Name.length) :
                curLay.Name;

              /* Save data */
              retObj.layers.push({
                id: layerName,
                name: curLay.Title,
                epsg: proj,
                bbox: bbox
              });
            }
          }
        }
      }

      callback(retObj);
    });
  }

  private loadLayerInfo(lay,callback:(data:any[]) => void)
  {
    let id_server = lay.id_server, url = lay.url;

    /* For child get info from parent */
    if (lay.id_type == null)
    {
      let par = this.wgConfigSvc.getLayer(lay.id_parent);
      if (par)
      {
        id_server = par.id_server;
        url = par.url;
      }
    }

    /* Prepare request */
    let reqUrl = [
      url,
      url.indexOf("?") > 0 ? "&" : "?",
      "service=WFS",
      "&typeName=",lay.layer_name,
      "&version=",lay.version || "1.3.0",
      "&request=DescribeFeatureType"
    ].join("");

    let reqOpt:any = {
      headers: {"it_app_auth": this.authSvc.getToken()},
      responseType: "text"
    };

    // Add map server prefix or use er proxy (for external server)
    reqUrl = id_server == 1 ?
      this.webgisSvc.getMsPrefix() + reqUrl :
      this.configSvc.urlPrefix.er + "/utility/proxy?url=" +
        encodeURIComponent(reqUrl);

    /* Exec request */
    this.loading = true;

    this.httpCln.get(reqUrl,reqOpt).subscribe
    (
      xml =>
      {
        /* Parse xml response */
        parseString(xml,{explicitArray:false},(err,res) =>
        {
          let aToRet = [];

          if (!err && res)
          {
            let aKey = ["schema","complexType","complexContent",
              "extension","sequence","element"];

            /* Look for keys namespace */
            let ns = res["xsd:schema"] ? "xsd:" : "";

            /* Get properties array */
            for (let j = 0;j < aKey.length;j++)
            {
              res = res[ns+aKey[j]];
              if (!res) break;
            }

            /* Process properties array */
            if (res)
            {
              for (let j = 0;j < res.length;j++)
              {
                let prop = res[j]["$"];
                if (prop)
                  aToRet.push({id:prop.name, name:prop.name, type:prop.type});
              }
            }
          }

          this.loading = false;
          callback(aToRet);
        });
      },
      err =>
      {
        this.loading = false;
        this.showMessage.emit({
          msg: "WEBGIS.GET_CAP_ERR",
          bt0: "Ok",
          style: "danger"
        });

        callback([]);
      }
    );
  }

  private saveCat(cat)
  {
    let form = this.getFormCmp("catForm");

    if (!form.isValid() || !form.isChanged())
      return;

    /* Get change */
    var chObj = form.getChangedObj();

    /*
     * Insert
     */
    if (!cat.id)
    {
      /* Get category id */
      this.modelSvc.detail("/webgis/serialId").subscribe(sid =>
      {
        if (!sid)
        {
          this.showMessage.emit({
            msg: "MESSAGE.INSERT_ERR",
            bt0: "Ok",
            style: "danger"
          });
        }
        else
        {
          /* Update change object */
          chObj.id = sid;
          chObj._position = this.catList.length+1;

          if (chObj.private)
          {
            chObj.permission = "VIEW_CAT_"+sid;
            chObj.permission_obj = {
              op: "I",
              name: chObj.permission,
              description: "Visualizza categoria "+chObj.label
            };

            delete chObj.private;
          }

          /* Insert */
          this.modelSvc.insert("/wgCategory/insert",chObj).subscribe(res =>
          {
            if (res)
            {
              cat.update(chObj);
              this.catList.push(cat);
              this.webgisSvc.manageCategory("I",{cfg:chObj});

              this.showMessage.emit({
                msg: "MESSAGE.INSERT_OK",
                bt0: "Ok",
                style: "info",
                callback: ret => {
                  this.catSel = null;
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
        }
      });
    }
    /*
     * Update
     */
    else
    {
      /* Look for private attribute */
      if (chObj.private !== undefined)
      {
        if (chObj.private)
        {
          /* Add permission */
          chObj.permission = "VIEW_CAT_"+cat.id;
          chObj.permission_obj = {
            op: "I",
            name: chObj.permission,
            description: "Visualizza categoria "+cat.label
          };
        }
        else
        {
          if (cat.permission)
          {
            /* Del permission */
            chObj.permission = null;
            chObj.permission_obj = {
              op: "D",
              name: cat.permission
            };
          }
        }

        delete chObj.private;

        /* Check for empty change object */
        if (!Object.keys(chObj).length) return;
      }

      /* Update */
      this.modelSvc.update("/wgCategory/update/"+cat.id,chObj).subscribe(res =>
      {
        if (res)
        {
          cat.update(chObj);

          this.webgisSvc.manageCategory("U",{id:cat.id, cfg:chObj});
          this.showMessage.emit({
            msg: "MESSAGE.UPDATE_OK",
            bt0: "Ok",
            style: "info",
            callback: ret => {
              this.catSel = null;
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

  private insertLay(lay)
  {
    let form = this.getFormCmp(this.layMainForm.id);

    /* Check validity and changed */
    if (!form.isValid() || !form.isChanged())
      return;

    /* Get change */
    let chObj = form.getChangedObj();

    /* Get id */
    this.modelSvc.detail("/webgis/serialId").subscribe(sid =>
    {
      if (!sid)
      {
        this.showMessage.emit({
          msg: "MESSAGE.INSERT_ERR",
          bt0: "Ok",
          style: "danger"
        });
      }
      else
      {
        /* Update change object */
        chObj.id = sid;
        chObj.depth = lay.depth;
        chObj.extent = lay.extent;
        chObj.version = lay.version;
        chObj.info_format = lay.info_format;
        chObj._position = lay._position;
        chObj.id_parent = lay.id_parent;
        chObj.id_category = lay.id_category;

        if (chObj.private)
        {
          chObj.permission = "VIEW_LAY_"+sid;
          chObj.permission_obj = {
            op: "I",
            name: chObj.permission,
            description: "Visualizza layer "+chObj.label
          };

          delete chObj.private;
        }

        /* Add filter to WFS composed child */
        if (chObj.property_name)
        {
          chObj.filter = {
            property_name: chObj.property_name,
            property_val: chObj.property_val,
            operator: chObj.operator
          };

          delete chObj.property_name;
          delete chObj.property_val;
          delete chObj.operator;
        }

        /* Add geometry field */
        this.addGeomField(chObj,() =>
        {
          /* Exec request */
          this.modelSvc.insert("/wgLayer/insert",chObj).subscribe(res =>
          {
            if (res)
            {
              lay.update(chObj);

              /* Add layer to parent/category and layer tree */
              let layToAdd = lay.id_parent ?
                this.wgConfigSvc.getLayer(lay.id_parent) :
                this.wgConfigSvc.getCategory(lay.id_category);

              layToAdd.addLayer(lay);
              this.webgisSvc.manageLayer("I",{cfg:chObj,isBaseLayer:false});

              /* Notify to user */
              this.showMessage.emit({
                msg: "MESSAGE.INSERT_OK",
                bt0: "Ok",
                style: "info",
                callback: ret => {this.reset();}
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
    });
  }

  private updateLay(lay)
  {
    let style = this.styleCmp ? this.styleCmp.newStyleObj() : null,
      chAtt = this.getChangedAttibutes(this.layDataRows,lay.attributes),
      mf = this.getFormCmp(this.layMainForm.id),
      df = this.getFormCmp("layDataForm");

    /* Look for not valid */
    if ((style && style.NV) || !mf.isValid() || (df && !df.isValid()))
      return;

    /* Look for no change */
    if (!style && !chAtt && !mf.isChanged() && (!df || (df && !df.isChanged())))
      return;

    /*
     * Get change
     */
    let chObj = Object.assign({},mf.getChangedObj());

    if (df) chObj = Object.assign(chObj,df.getChangedObj());
    if (chAtt) chObj.attributes = JSON.stringify(chAtt);
    if (style) chObj.style = style;

    /* Look for private */
    if (chObj.private !== undefined)
    {
      if (chObj.private)
      {
        /* Add permission */
        chObj.permission = "VIEW_LAY_"+lay.id;
        chObj.permission_obj = {
          op: "I",
          name: chObj.permission,
          description: "Visualizza layer "+lay.label
        };
      }
      else if (lay.permission)
      {
        /* Del permission */
        chObj.permission = null;
        chObj.permission_obj = {op:"D", name:lay.permission};
      }

      delete chObj.private;
    }

    /* Look for queryable */
    if (chObj.queryable != undefined)
    {
      chObj.attributes = chObj.queryable ?
        JSON.stringify([{query:true}]) : null;

      delete chObj.queryable;
    }

    /* Check for empty change object */
    if (!Object.keys(chObj).length)
      return;

    /*
     * Update
     */
    this.modelSvc.update("/wgLayer/update/"+lay.id,chObj).subscribe(res =>
    {
      if (res)
      {
        if (chObj.attributes)
          chObj.attributes = JSON.parse(chObj.attributes);

        lay.update(chObj);
        this.webgisSvc.manageLayer("U",{id:lay.id, cfg:chObj, isBaseLayer:false});

        this.showMessage.emit({
          msg:"MESSAGE.UPDATE_OK", bt0:"Ok", style:"info",
          callback: ret => {this.reset();}
        });
      }
      else
      {
        this.showMessage.emit(
          {msg:"MESSAGE.UPDATE_ERR", bt0:"Ok", style:"danger"}
        );
      }
    });
  }

  private addGeomField(lay:any,callback:() => void)
  {
    /* Add geometry field only for WFS layer/composed */
    if (lay.service != "WFS" || lay.id_type == 2 || lay.id_type == 4)
    {
      callback();
      return;
    }

    /* Load layer info */
    this.loadLayerInfo(lay,data =>
    {
      for (let j = 0;j < data.length;j++)
      {
        let type = data[j].type;
        if (type && type.startsWith("gml"))
        {
          lay.geometry_field = {
            name: data[j].name,
            type: this.contextSvc.getContextObj("wgGeometry",type).name
          };

          //DEBUG
          if (!lay.geometry_field.type)
            console.info("*** UNKNOW geometry type "+type+" ***");
          //

          callback();
          break;
        }
      }
    });
  }

  private getChangedAttibutes(aNew:any[],aOld:any[]):any
  {
    if (aNew.length != aOld.length)
      return aNew;

    /* Look for array difference */
    let retArr = [], chgArr = [];

    for (let j = 0;j < aNew.length;j++)
    {
      let nObj = aNew[j], oObj = aOld[j];

      /* Look for change */
      for (let key in nObj)
      {
        if (nObj[key] != oObj[key])
        {
          chgArr.push(nObj);
          break;
        }
      }

      /* Add valid attributes to array to return */
      if (nObj.query || nObj.hover || nObj.search)
        retArr.push(nObj);
    }

    /* Return right result */
    return chgArr.length ? retArr : null;
  }
}
