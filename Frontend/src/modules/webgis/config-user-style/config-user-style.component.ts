import { Component,OnInit,ViewChild,
         ViewChildren,QueryList,
         Input,Output,EventEmitter } from '@angular/core';

import { HttpClient,HttpHeaders } from '@angular/common/http';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { WebgisService } from '../webgis.service';

import { WGMapLayer } from '../entity/wgmapLayer';
import { ConfigStyleComponent } from '../config-style/config-style.component';
import { WGStyle } from '../entity/wgStyle';

import { parseString } from 'xml2js';

import { AuthService } from '../../core/auth.service';
import { ConfigService } from '../../core/config.service'

@Component({
  selector: 'webgis-config-user-style',
  templateUrl: './config-user-style.component.html',
  styleUrls: ['./config-user-style.component.css']
})

export class ConfigUserStyleComponent implements OnInit
{
  alert: Object = {};

  @Input() layer:WGMapLayer;
  @Input() style:WGStyle;
  @ViewChild(ConfigStyleComponent) styleCmp:ConfigStyleComponent;
  op: string= "";
  loader:boolean = false;

  /*
   * Methods
   */
  constructor(
    private modalInst:NgbActiveModal,
    private webgisSvc:WebgisService,
    private httpCln:HttpClient,
    private authSvc: AuthService,
    private configSvc:ConfigService) {}

  ngOnInit() {
    if (!this.webgisSvc.getUserStyle(this.layer.id))
      this.op = 'I';
    else
      this.op = 'U';

    this.loadLayerInfo(this.layer,
      data =>
      {
        if (data.length)
        {
          let layAtt = this.layer.attributes, layAttKey = {}, keyFieldOpt = [];

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

          /* Update attributes context in style component */
          if (this.styleCmp)
            this.styleCmp.updateAttributesCtx(keyFieldOpt);
        }
        else // error
        {
          this.alert['msg'] =  "WEBGIS.GET_CAP_ERR";
          this.alert['style'] = "danger";
          this.alert['bt0'] = "Ok";
          return;
        }
      }
    );
  }

  close()
  {
    this.modalInst.close();
  }

  onAlertDone(ret)
  {
    if (this.alert["callback"])
      this.alert["callback"](ret);

    // Reset alert
    this.alert = {};
  }

  save()
  {
    let style = null;

    if(this.styleCmp && this.styleCmp.newStyleObj())
      style = Object.assign({},this.styleCmp.newStyleObj());

    /* Look for changed style*/
    if (!style)
    {
      this.alert['msg'] =  "MESSAGE.NO_CHANGES";
      this.alert['style'] = "info";
      this.alert['bt0'] = "Ok";
      return;
    }
    else if((style && style.NV))   /* Look for not valid */
    {
      this.alert['msg'] =  "WEBGIS.INVALID_STYLE";
      this.alert['style'] = "warning";
      this.alert['bt0'] = "Ok";
      return;
    }
    else
    {
      this.webgisSvc.manageLayerUserStyle(this.layer, this.op, style,
        res =>
        {
          if(!res)
            this.op = 'U';
          else
          {
            this.alert['msg'] = res;
            this.alert['style'] = "danger";
            this.alert['bt0'] = "Ok";
            return;
          }
        }
      );
    }
  }

  reset()
  {
    this.alert['msg'] = "WEBGIS.RESET_STYLE_MSG";
    this.alert['style'] = "info";
    this.alert['bt1'] = "Si";
    this.alert['bt0'] = "No";
    this.alert['callback'] = ret =>
    {
      if (ret != 1)
        return;

      this.webgisSvc.manageLayerUserStyle(this.layer, 'D', null,
        res =>
        {
          if(!res)
            this.op = 'I';
          else
          {
            this.alert['msg'] = res;
            this.alert['style'] = "danger";
            this.alert['bt0'] = "Ok";
            return;
          }
          // reset form config user style
          this.style = Object.assign({});
          this.style = null;
        }
      );
    }
  }


  /* Private function */
  // NOTE: Workaround solution.
  // This function must be moved into webgis.service
  private loadLayerInfo(lay,callback:(data:any[]) => void)
  {
    let id_server = lay.id_server, url = lay.url;

    /* For child get info from parent */
    if (lay.id_type == null)
    {
      let par = this.webgisSvc.getLayerObjById(lay.id_parent);
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
    this.loader = true;

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

          this.loader = false;
          callback(aToRet);
        });
      },
      err =>
      {
        this.loader = false;
        callback([]);
      }
    );
  }
}
