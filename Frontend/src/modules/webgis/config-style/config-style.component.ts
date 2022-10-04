import { Component,OnInit,OnChanges,SimpleChanges } from '@angular/core';
import { Input,Output,ViewChildren,EventEmitter,QueryList } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { WGLayer } from '../entity/wglayer';
import { WGStyle } from '../entity/wgStyle';
import { WGStyleRuleCond } from '../entity/wgStyleRole';

import { parseString } from 'xml2js';
import { FormComponent } from '../../core/form/form.component';

import { ModelService } from '../../core/model.service';
import { ConfigService } from '../../core/config.service';
import { WebgisService } from '../webgis.service';
import { ContextService } from '../../core/context.service';

import { getInvertColor}  from '../../core/genUtils'

import { StyleFillPattern } from '../webgis.util';

@Component({
  selector: 'webgis-config-style',
  templateUrl: './config-style.component.html',
  styleUrls: ['./config-style.component.css']
})

export class ConfigStyleComponent implements OnInit,OnChanges
{
  @Input() layer:WGLayer;
  @Input() style:WGStyle;
  @Output() showMessage = new EventEmitter<any>();
  @ViewChildren(FormComponent) qlFormCmp:QueryList<FormComponent>;

  // Set getInvertColor function
  tableGetInvertColor = getInvertColor;

  loading:boolean = false;
  selRule:any = null;
  styleType:number = null;

  /* Type form */
  typeForm =
  {
    id:"typeForm", fg:
    [
      {
        id:0, rows:
        [
          [
            {
              key: "type",
              type: "select",
              label: "WORD.TYPE",
              width: 4,
              options: WGStyle.typeCtx(),
              required: true
            },
            {
              key: "symbolType",
              type: "select",
              label: "",
              width: 4,
              hidden: true,
              options: [
                {id:"shape", name:"Forma"},
                {id:"image", name:"Immagine"}
              ]
            },
            {
              key: "newRule",
              type: "button",
              label: "",
              width: 4,
              hidden: true,
              btnLabel: "WORD.NEW"
            }
          ]
        ]
      }
    ]
  };

  /* Style forms */
  styleForm = null;
  styleFormObj:any = null;

  private imgStyForm =
  {
    id:"imgStyForm", fg:
    [
      {
        id:0, rows:
        [
          [
            {
              key: "src",
              type: "file",
              label: "WORD.IMAGE",
              width: 4,
              subType: "image",
              required: true
            },
            {
              key: "offsetX",
              type: "number",
              label: "WEBGIS.OFF_X",
              width: 4
            },
            {
              key: "offsetY",
              type: "number",
              label: "WEBGIS.OFF_Y",
              width: 4
            }
          ]
        ]
      }
    ]
  };

  private symStyForm =
  {
    id:"symStyForm", fg:
    [
      {
        id:0, rows:
        [
          [
            {
              key: "id",
              type: "select",
              label: "WORD.SYMBOL",
              width: 4,
              options: [],
              required: true
            },
            {
              key: "color",
              type: "color",
              label: "WORD.COLOR",
              width: 4,
              required: true
            },
            {
              key: "size",
              type: "number",
              label: "WORD.SIZE",
              width: 4,
              required: true
            }
          ]
        ]
      },
      {
        id:1, rows:
        [
          [
            {
              key: "strokeColor",
              type: "color",
              label: "WEBGIS.STROKE_COLOR",
              width: 4
            },
            {
              key: "strokeWidth",
              type: "number",
              label: "WEBGIS.STROKE_WIDTH",
              width: 4
            }
          ]
        ]
      }
    ]
  };

  private catImgForm =
  {
    id:"catImgForm", fg:
    [
      {
        id:0, rows:
        [
          [
            {
              key: "attribute",
              type: "select",
              label: "WORD.ATTRIBUTE",
              width: 12,
              options: [],
              required: true,
              optionLabel: "id"
            }
          ],
          [
            {
              key: "offsetX",
              type: "number",
              label: "WEBGIS.OFF_X",
              width: 12
            }
          ],
          [
            {
              key: "offsetY",
              type: "number",
              label: "WEBGIS.OFF_Y",
              width: 12
            }
          ],
          [
            {
              key: "categorize",
              type: "button",
              btnLabel: "WORD.CATEGORIZE",
              width: 8
            }
          ]
        ]
      }
    ]
  };

  private catSymForm =
  {
    id:"catSymForm", fg:
    [
      {
        id:0, rows:
        [
          [
            {
              key: "attribute",
              type: "select",
              label: "WORD.ATTRIBUTE",
              width: 12,
              options: [],
              required: true,
              optionLabel: "id"
            }
          ],
          [
            {
              key: "id",
              type: "select",
              label: "WORD.SYMBOL",
              width: 12,
              options: [],
              required: true
            }
          ],
          [
            {
              key: "size",
              type: "number",
              label: "WORD.SIZE",
              width: 12,
              required: true
            }
          ]
        ]
      },
      {
        id:1, rows:
        [
          [
            {
              key: "strokeColor",
              type: "color",
              label: "WEBGIS.STROKE_COLOR",
              width: 6
            },
            {
              key: "strokeWidth",
              type: "number",
              label: "WORD.THICKNESS",
              width: 6
            }
          ]
        ]
      },
      {
        id:2, rows:
        [
          [
            {
              key: "categorize",
              type: "button",
              btnLabel: "WORD.CATEGORIZE",
              width: 8
            }
          ]
        ]
      }
    ]
  };

  /* Label form */
  labelForm =
  {
    id:"labelForm", fg:
    [
      {
        id:0, rows:
        [
          [
            {
              key: "text",
              type: "text-list",
              label: "WORD.TEXT",
              width: 12,
              source: [],
              required: true
            }
          ],
          [
            {
              key: "fontSize",
              type: "number",
              label: "WEBGIS.FONT_SIZE",
              width: 3,
              required: true
            },
            {
              key: "textColor",
              type: "color",
              label: "WORD.COLOR",
              width: 3,
              required: true
            },
            {
              key: "textBackColor",
              type: "color",
              label: "WEBGIS.TEXT_BACK_COLOR",
              width: 3
            }
          ],
          [
            {
              key: "offsetX",
              type: "number",
              label: "WEBGIS.OFF_X",
              width: 3
            },
            {
              key: "offsetY",
              type: "number",
              label: "WEBGIS.OFF_Y",
              width: 3
            },
            {
              key: "textFrom",
              type: "number",
              label: "WEBGIS.MAX_SCALE",
              width: 3
            },
            {
              key: "textTo",
              type: "number",
              label: "WEBGIS.MIN_SCALE",
              width: 3
            }
          ]
        ]
      }
    ]
  };

  /* Condition table */
  condTable =
  {
    data: [],
    toolbar: {buttons: {add: {}}},
    entClass: WGStyleRuleCond,
    columns:
    [
      {
        key: "name",
        type: "object",
        label: "WORD.ATTRIBUTE",
        source: [],
        editable: true,
        optionLabel: "id"
      },
      {
        key: "op",
        type: "object",
        label: "WORD.OPERATOR",
        source: this.contextSvc.getContext("operator"),
        editable: true
      },
      {
        key: "value",
        label: "WORD.VALUE",
        editable: true
      }
    ]
  };

  /*
   * Methods
   */
  constructor(
    private httpCln:HttpClient,
    private modelSvc:ModelService,
    private configSvc:ConfigService,
    private webgisSvc:WebgisService,
    private contextSvc:ContextService
  ) {}

  ngOnInit() {}

  ngOnChanges(changes:SimpleChanges)
  {
    if (!this.style)
    {
      this.style = new WGStyle({});
      this.style.symbolType = this.defSymbolType(this.layer);
    }

    /* Reset */
    this.styleForm = null;
    this.styleFormObj = null;

    /* Configure (use timeout to force ngOnChanges call on form) */
    setTimeout(() =>
    {
      this.configure(this.style.type,this.style.symbolType);
    },10);
  }

  updateAttributesCtx(ctx:any[])
  {
    /* Update form context and source */
    this.catImgForm.fg[0].rows[0][0]["options"] =
    this.catSymForm.fg[0].rows[0][0]["options"] = ctx;

    this.labelForm.fg[0].rows[0][0]["source"] =
      ctx.map((item) => {return item.id});

    /* Update table source */
    this.condTable.columns[0].source = ctx;
  }

  newStyleObj():any
  {
    let retObj = null;

    switch (this.styleType)
    {
      case 1: retObj = this.newStyle1Obj(); break
      case 2: retObj = this.newStyle2Obj(); break;
      case 3: retObj = this.newStyle3Obj(); break;
      default: return retObj;
    }

    /* Look for Not Valid */
    if (retObj && retObj.NV)
      return retObj;

    /* Look for label changed */
    if (this.style.hasLabel)
    {
      let lblFC = this.getFormCmp("labelForm");

      if (!lblFC.isValid())
        return {NV: true};

      if (lblFC.isChanged() || retObj)
      {
        if (!retObj)
          retObj = this.style.getConfig();

        retObj.label = lblFC.getObject();
        retObj.label.type = "text";
      }
    }
    else
    {
      let oldStyleObj = this.style.getConfig();

      if (oldStyleObj.label)
      {
        if (!retObj)
          retObj = oldStyleObj;

        retObj.label = null;
      }
    }

    /* Ok */
    return retObj;
  }

  /*
   * Ruled style methods
   */
  addRule()
  {
    this.selRule = this.style.addNewRule();
    this.condTable.data = this.selRule.conditions;
  }

  delRule(rule,idx)
  {
    if (this.selRule == rule)
      this.selRule = null;

    this.style.rules.splice(idx,1);
  }

  updRule(rule)
  {
    if (this.selRule == rule)
    {
      this.selRule = null;
      return;
    }

    /* Update selected rule */
    this.selRule = rule;
    this.condTable.data = rule.conditions || [];
  }

  /*
   * Event handler
   */
  onFormChange(obj)
  {
    let form = this.getFormCmp(obj.id);

    switch (obj.key)
    {
      case "id":
        if (obj.val == StyleFillPattern.STROKE)
        {
          if (this.styleType == 1 || this.styleType == 3) // Semplice o a regole
          {
            // in this case polygon has only stroke style defined (no fill)
            form.hiddenFields(["color"],true);
            form.setValueForKey("color",null);

            form.requireFields(["strokeColor","strokeWidth"], true);
          }
          else
          {
            form.hiddenFields(["strokeColor"],true);
            form.setValueForKey("strokeColor",null);
          }
        }
        else
        {
          form.setValueForKey("strokeColor",null);
          form.setValueForKey("strokeWidth",null);
          if (this.styleType == 1 || this.styleType == 3) // Semplice o a regole
          {
            form.hiddenFields(["color"],false);
            form.requireFields(["strokeColor","strokeWidth"], false);
          }
          else
            form.hiddenFields(["strokeColor"],false);
        }
        break;

      case "type":
        this.configure(obj.val,this.style.symbolType);

        if (this.style.type != 2 && this.styleFormObj && this.styleFormObj.rules)
          this.styleFormObj.rules.splice(0);

        break;
      case "symbolType":
        this.configure(form.getValueForKey("type"),obj.val);
        break;
      case "newRule":
        this.addRule();
        break;
      case "src":
        if (obj.val)
        {
          this.onFileSel([obj.val],null,form);
        }
        else
        {
          this.deleteAttach(form.getValueForKey("src"));
          form.setValueForKey("src",null);
        }

        break;
      case "attribute":
        this.styleFormObj.rules.splice(0);
        this.loadFeatureVal(obj.val);
        break;
      case "categorize":
        if (form.isValid())
          this.loadFeatureVal(form.getValueForKey("attribute"));
        break;
    }
  }

  onRuledFormChange(obj)
  {
    let form = this.getFormCmp(obj.id);
    if (obj.key == "src")
    {
      if (obj.val)
      {
        this.onFileSel([obj.val],this.selRule.symbol,form);
      }
      else
      {
        this.deleteAttach(form.getValueForKey("src"));

        this.selRule.symbol.src = null;
        form.setValueForKey("src",null);
      }
    }
    else
    {
      if (obj.key == 'id')
      {
        if (obj.val == StyleFillPattern.STROKE)
        {
          if (this.styleType == 1 || this.styleType == 3) // Semplice o a regole
          {
            // in this case polygon has only stroke style defined (no fill)
            form.hiddenFields(["color"],true);
            form.setValueForKey("color",null);

            form.requireFields(["strokeColor","strokeWidth"], true);
          }
          else
          {
            form.hiddenFields(["strokeColor"],true);
            form.setValueForKey("strokeColor",null);
          }
        }
        else
        {
          form.setValueForKey("strokeColor",null);
          form.setValueForKey("strokeWidth",null);
          if (this.styleType == 1 || this.styleType == 3) // Semplice o a regole
          {
            form.hiddenFields(["color"],false);
            form.requireFields(["strokeColor","strokeWidth"], false);
          }
          else
            form.hiddenFields(["strokeColor"],false);
        }
      }
      /* Manual binding */
      this.selRule.symbol[obj.key] = obj.val;
    }
  }

  onCondTableBtn(opt)
  {
    switch (opt.op)
    {
      case "I":
        this.selRule.conditions.push(opt.obj);
        break;
      case "D":
        this.selRule.conditions.splice(
          this.selRule.conditions.indexOf(opt.obj),1);
        break;
    }
  }

  onFileSel(files,obj,form)
  {
    let url = "/wgLayer/"+this.layer.id+"/upload";

    this.modelSvc.upload(url,files[0],{}).subscribe(res =>
    {
      if (!res)
        return;

      /* Build src */
      let src = [
        this.configSvc.urlPrefix.er,
        "/wgLayer/",this.layer.id,
        "/getFile/",files[0].name
      ].join("");

      /* Update obj and form */
      if (obj) obj.src = src;
      if (form) form.setValueForKey("src",src);
    });
  }

  /*
   * Private methods
   */
  private configure(type:number,symType:string)
  {
    var geom = this.getGeomType(this.layer);
    let symCtx = this.getSymbolCtx(geom);

    /*
     * Process style type:
     * 1 - simple (only 1 rule with only 1 symbol)
     * 2 - categorized (only 1 condition for each rule; name (attribute) is
     *     the same for all conditions)
     * 3 - with rules
     */
    switch (type)
    {
      case 1:
        this.typeForm.fg[0].rows[0][1]["hidden"] = !geom.includes("Point");
        this.typeForm.fg[0].rows[0][2]["hidden"] = true;

        this.symStyForm.fg[1]["hidden"] = geom.includes("Line");
        this.symStyForm.fg[0].rows[0][2]["hidden"] = geom.includes("Polygon");
        this.symStyForm.fg[0].rows[0][0]["options"] = symCtx;

        this.styleFormObj = this.style.objForStyle1();
        this.styleForm = (symType == "image") ?
          this.imgStyForm : this.symStyForm;

        if (this.styleFormObj.id == StyleFillPattern.STROKE)
        {
          this.symStyForm.fg[0].rows[0][1]["hidden"] = true;

          this.symStyForm.fg[1].rows[0][0]["required"] = true;
          this.symStyForm.fg[1].rows[0][1]["required"] = true;
        }
        else
        {
          this.symStyForm.fg[0].rows[0][1]["hidden"] = false;

          this.symStyForm.fg[1].rows[0][0]["required"] = false;
          this.symStyForm.fg[1].rows[0][1]["required"] = false;

          if (!this.styleFormObj.strokeColor)
            this.styleFormObj.strokeWidth = null;
        }

        break;
      case 2:
        this.typeForm.fg[0].rows[0][1]["hidden"] = !geom.includes("Point");
        this.typeForm.fg[0].rows[0][2]["hidden"] = true;

        this.catSymForm.fg[1]["hidden"] = geom.includes("Line");
        this.catSymForm.fg[0].rows[2][0]["hidden"] = geom.includes("Polygon");
        this.catSymForm.fg[0].rows[1][0]["options"] = symCtx;

        // Form entity
        this.styleFormObj = this.style.objForStyle2();
        this.styleForm = (symType == "image") ?
          this.catImgForm : this.catSymForm;

        // Invert color with strokeColor if StyleFillPattern == STROKE
        if (this.styleFormObj.id == StyleFillPattern.STROKE)
        {
          this.catSymForm.fg[1].rows[0][0]["hidden"] = true;
          for (let j = 0;j < this.styleFormObj.rules.length;j++)
          {
            let r = this.styleFormObj.rules[j];

            r['color'] = r['strokeColor'];
            r['strokeColor'] = null;
          }
          this.styleFormObj.strokeColor = null;
        }
        else
        {
          this.catSymForm.fg[1].rows[0][0]["hidden"] = false;

          if (!this.styleFormObj.strokeColor)
            this.styleFormObj.strokeWidth = null;
        }

        /* TODO: Update symbolType on entity to show right style column */
        this.style.symbolType = symType;

        break;
      case 3:
        this.typeForm.fg[0].rows[0][1]["hidden"] = !geom.includes("Point");
        this.typeForm.fg[0].rows[0][2]["hidden"] = false;

        this.symStyForm.fg[1]["hidden"] = geom.includes("Line");
        this.symStyForm.fg[0].rows[0][2]["hidden"] = geom.includes("Polygon");
        this.symStyForm.fg[0].rows[0][0]["options"] = symCtx;

        this.styleFormObj = null;
        this.styleForm = (symType == "image") ?
          this.imgStyForm : this.symStyForm;

        /* Update symbolType on entity (manual binding) */
        this.style.symbolType = symType;

        break;
      default:
        this.styleFormObj = null;
        this.styleForm = null;
        this.typeForm.fg[0].rows[0][2]["hidden"] = true;
        break;
    }

    this.styleType = type;
  }

  private getFormCmp(id)
  {
    return this.qlFormCmp.find(cmp => cmp.id === id);
  }

  private getGeomType(layer:WGLayer):string
  {
    if (!layer)
      return null;

    if (layer.geometry_field)
      return layer.geometry_field.type;

    if (layer.id_type == null && layer.id_parent)
    {
      let parent = this.webgisSvc.getLayerObjById(layer.id_parent);

      if (parent && parent.service == "WFS" && parent.geometry_field)
        return parent.geometry_field.type;
    }

    return null;
  }

  private defSymbolType(layer:WGLayer):string
  {
    switch (this.getGeomType(layer))
    {
      case "Point":
      case "MultiPoint":
        return "shape";
      case "LineString":
      case "MultiLineString":
        return "line";
      case "Polygon":
      case "MultiPolygon":
        return "polygon";
    }
  }

  private getSymbolCtx(geom:string):any[]
  {
    let ctxName = null;

    switch (geom)
    {
      case "Point":
      case "MultiPoint":
        ctxName = "wgStyleShape";
        break;
      case "LineString":
      case "MultiLineString":
        ctxName = "wgStyleStroke";
        break;
      case "Polygon":
      case "MultiPolygon":
        ctxName = "wgStyleFill";
        break;
    }

    return this.contextSvc.getContext(ctxName) || [];
  }

  private loadFeatureVal(property:string)
  {
    let name = this.layer.layer_name,
      url = this.layer.url,
      srv = this.layer.id_server;

    /* For child layer get info from parent */
    if (!url)
    {
      let parent = this.webgisSvc.getLayerObjById(this.layer.id_parent);
      if (parent)
      {
        url = parent.url;
        srv = parent.id_server;
        name = parent.layer_name;
      }
    }

    if (!url)
      return;

    /* Build url */
    let aUrl = [
      srv == 1 ? this.webgisSvc.getMsPrefix() : "/proxy/",
      url,
      url.indexOf("?") > 0 ? "&" : "?",
      "service=wfs",
      "&request=GetFeature",
      "&typeName=",name,
      "&propertyName=",property
    ];

    /*
     * Exec request
     */
    this.loading = true;

    this.httpCln.get(aUrl.join(""),{responseType:"text"}).subscribe
    (
      xml =>
      {
        /* Parse xml response */
        parseString(xml,{explicitArray:false},(err,res) =>
        {
          if (err)
          {
            console.info(err);
          }
          else
          {
            /*
             * Process feature array
             */
            let aFeature = res["wfs:FeatureCollection"] ?
              res["wfs:FeatureCollection"]["wfs:member"] : null;

            if (aFeature)
            {
              let values = {};

              /* Read all feature values */
              for (let j = 0;j < aFeature.length;j++)
              {
                let obj = Object.values(aFeature[j])[0];
                if (obj)
                {
                  for (let key in obj)
                  {
                    if (key.includes(property))
                      values[obj[key]] = 1;
                  }
                }
              }

              /* Remove values that are already in styleFormObj rules */
              let rules = this.styleFormObj.rules || [];

              for (let j = 0;j < rules.length;j++)
                delete values[rules[j].val];

              /* Add new values in styleFormObj rules */
              for (let val in values)
                rules.push({val:val, lbl:null, src:null, color:null});
            }
          }

          this.loading = false;
        });
      },
      err =>
      {
        console.info(err);
        this.loading = false;
      }
    );
  }

  private deleteAttach(src)
  {
    let name = src ? src.split("/").pop() : null;
    if (name)
    {
      let url = "/wgLayer/delAttachByName/"+this.layer.id+
        "?name="+name;

      this.modelSvc.delete(url).subscribe(res => {});
    }
  }

  private newStyle1Obj():any
  {
    let tpFC = this.getFormCmp("typeForm"),
      stFC = this.getFormCmp(this.styleForm.id);

    /*
     * Check validity/changed
     */
    if (!tpFC.isValid() || !stFC.isValid())
      return {NV: true};

    if (!tpFC.isChanged() && !stFC.isChanged())
      return null;

    /*
     * Prepare new object
     */
    let retObj = this.style.getConfig(),
      tpObj = tpFC.getChangedObj() || {},
      stObj = stFC.getObject();

    if (!retObj.rules) retObj.rules = [];
    if (!retObj.rules[0]) retObj.rules[0] = {};
    if (!retObj.rules[0].symbol) retObj.rules[0].symbol = {};

    retObj.rules.splice(1);
    retObj.rules[0].conditions = null;

    /* Update style */
    if (stObj)
      retObj.rules[0].symbol = stObj;

    retObj.rules[0].symbol.type = this.style.symbolType;

    /* Process type changed */
    if (tpObj.type)
      retObj.type = tpObj.type;

    if (tpObj.symbolType)
      retObj.rules[0].symbol.type = tpObj.symbolType;

    /*
     * Return new object
     */
    return retObj;
  }

  private newStyle2Obj():any
  {
    let stFC = this.getFormCmp(this.styleForm.id),
      oldObj = this.style.objForStyle2(),
      newObj = this.styleFormObj;

    /* Get style key */
    let stKey = this.style.symbolType == "image" ? "src" : "color";

    /*
     * Check validity
     */
    if (!stFC.isValid())
      return {NV: true};

    /* Rules */
    let isValid = false;

    for (let j = 0; j < newObj.rules.length;j++)
    {
      if (newObj.rules[j][stKey])
      {
        isValid = true;
        break;
      }
    }

    if (!isValid)
      return {NV: true};

    /*
     * Check change
     */
    let isChanged = stFC.isChanged();

    /* Rules */
    if (!isChanged)
    {
      if (newObj.rules.length != oldObj.rules.length)
      {
        isChanged = true;
      }
      else
      {
        for (let j = 0;j < newObj.rules.length;j++)
        {
          let nr = newObj.rules[j],
            or = oldObj.rules.find(it => {return it.val == nr.val;});

          if (!or || (nr.lbl != or.lbl) || (nr[stKey] != or[stKey]))
          {
            isChanged = true;
            break;
          }
        }
      }
    }

    if (!isChanged)
      return null;

    /*
     * Return new object
     */
    let retObj = {type:2, rules:[]},
      stObj = stFC.getObject(),
      attr = stObj.attribute;

    /* Update style object */
    stObj.type = this.style.symbolType;
    delete stObj.attribute;

    let chKey = null;
    // Invert color with strokeColor if StyleFillPattern == STROKE
    if (stObj.id == StyleFillPattern.STROKE)
      chKey = 'strokeColor';
    else
      chKey = stKey;

    /* Add rules */
    for (let j = 0;j < newObj.rules.length;j++)
    {
      let r = newObj.rules[j];

      retObj.rules.push({
        op: null,
        name: r.lbl,
        symbol: Object.assign({},stObj,{[chKey]:r[stKey]}),
        conditions: [{op:"EQ", name:attr, value:r.val}]
      });
    }

    return retObj;
  }

  private newStyle3Obj():any
  {
    if (!this.style.isValid())
    {
      this.showMessage.emit({
        msg: "WEBGIS.INVALID_STYLE",
        bt0: "Ok",
        style: "warning"
      });

      return {NV: true};
    }

    if (!this.style.isChanged())
      return null;

    /* Get style object and force type to 3 */
    let retObj = this.style.serialize();
    retObj.type = 3;

    return retObj;
  }
}