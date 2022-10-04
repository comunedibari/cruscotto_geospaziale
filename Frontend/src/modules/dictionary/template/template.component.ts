import { Component,OnInit,Input,ViewChild } from '@angular/core';
import { ModelService } from '../../core/model.service';
import { TableComponent } from '../../core/table/table.component';

@Component({
  selector: 'dict-template',
  templateUrl: './template.component.html',
  styleUrls: ['./template.component.css']
})

export class TemplateComponent implements OnInit
{
  @Input() dicts;
  @Input() tableCfg;
  @ViewChild(TableComponent) tableCmp: TableComponent;

  /* Class attributes */
  alert = {};
  selDict = null;

  /*
   * Methods
   */
  constructor(private modelSvc:ModelService) {}

  ngOnInit() {}

  onDict(dict)
  {
    if (this.selDict == dict)
      return;

    this.selDict = dict;

    /* Reload table */
    if (dict.dict)
    {
      this.tableCmp.reload({
        countUrl: "/"+dict.id+"/count?dict="+dict.dict,
        masterUrl: "/"+dict.id+"/master?dict="+dict.dict
      });
    }
    else
      this.tableCmp.reload({entity: dict.id});
  }

  isDictSel(dict)
  {
    return this.selDict == dict;
  }

  /*
   * Table event handler
   */
  onTableButton(opt)
  {
    if (!opt || !opt.op || !opt.obj)
      return;

    /* Look for request type */
    let method = "", args = ["/"+this.selDict.id], body = opt.obj.changedObj(),
      qstring = this.selDict.dict ? "?dict="+this.selDict.dict : "";

    var reload = false, message = "MESSAGE.";

    switch (opt.op)
    {
      case "A":
        this.tableCmp.editableColumn({id:true});
      case "I":
        if (!body) return;

        method = "insert";
        args[0] += "/insert"+qstring;
        args[1] = body;

        reload = true;
        message += "INSERT_";
        break;
      case "U":
        if (!body) return;

        method = "update";
        args[0] += "/update/"+opt.obj.id+qstring;
        args[1] = body;

        reload = false;
        message += "UPDATE_";
        break;
      case "D":
        this.alert = {
          style: "info",
          msg: "MESSAGE.DELETE_ITEM_MSG",
          obj: opt.obj,
          bt0: "No",
          bt1: "Si",
          tag: 1
        };
        return;
      case "_D":
        method = "delete";
        args[0] += "/delete/"+opt.obj.id+qstring;

        reload = true;
        message += "DELETE_";
        break;
      case "E":
      case "CE":
      case "CI":
        this.tableCmp.editableColumn({id:false});
        return;
    }

    /* Exec request */
    ModelService.prototype[method].apply(this.modelSvc,args).subscribe(res =>
    {
      if (res && reload)
        this.tableCmp.reload({});
      else if (res && !reload)
        opt.obj.update();
      else if (!res && !reload)
        opt.obj.restore();

      this.alert = {
        style: res ? "info" : "danger",
        msg: message + (res ? "OK" : "ERR"),
        bt0: "Ok"
      };

      this.tableCmp.editableColumn({id:false});
    });
  }

  /*
   * Alert event handler
   */
  onAlertDone(ret)
  {
    if (ret == 1 && this.alert["tag"] == 1)
    {
      this.onTableButton({op:"_D", obj:this.alert["obj"]});
    }

    this.alert = {};
  }
}
