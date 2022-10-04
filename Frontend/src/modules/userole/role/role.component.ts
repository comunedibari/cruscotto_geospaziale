import { Component, Input, OnInit, ViewChild} from '@angular/core';
import { CollectionComponent } from '../../core/collection/collection.component';
import { FormComponent } from '../../core/form/form.component';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import {Role}    from './role';
import { ModelService } from '../../core/model.service';
import { HttpWriterService } from '../../core/http-writer.service';


@Component({
  selector: 'ur-role',
  templateUrl: './role.component.html',
  styleUrls: ['./role.component.css']
})

export class RoleComponent implements OnInit
{
  @Input() config;
  @ViewChild(CollectionComponent) collComp: CollectionComponent;
  @ViewChild(FormComponent) formComp: FormComponent;

  /*
   * Local variables
   */
  selRole: Role;
  alert: Object = {};
  permissions: Array<any> = [];

  collCfg = {
    entity: this.config && this.config['entity'] ? this.config['entity']  : "role",
    entClass: this.config && this.config['entClass'] ? this.config['entClass']  : Role,
    firstRow: {key: "name", searchable: true},
    secondRow: {key: "descr", searchable: true},
    pagination: this.config && this.config['pagination'] ? this.config['pagination'] :
      {rpp:5, rppArray:[5,10,15]},
    order: this.config && this.config['order'] ?  this.config['order'] : "name|ASC",
    filter: this.config && this.config['filter'] ?  this.config['filter'] :  null,
    toolbar:{
      buttons:{add:{disabled:false},del:{disabled:true}},
      search: {type: 3}
    }
  };

  // Config form
  formCfg: any = {
    id: "roleForm",
    fg:
    [
      {
        id: "genData",
        rows:
        [
          [
            {
              key:"name",
              label:"WORD.NAME",
              type:"text",
              width:6,
              required: true
            },
            {
              key:"descr",
              label:"WORD.DESCRIPTION",
              type:"text",
              width:6,
              required: true
            }
          ]
        ]
      }
    ]
  };

  constructor(public modalInst:NgbActiveModal, private modelSvc:ModelService,
    private httpWriter:HttpWriterService) {}

  ngOnInit()
  {
    /*
     * Load permission master
     */
    let body = {ord: "app_desc|ASC;description|ASC"};

    this.modelSvc.master("/permission/master",body).subscribe(res=>
    {
      if(res)
        this.permissions = res || [];
    });
  }

  ngAfterViewInit(){
    this.collComp.reload();
  }

  /*
   * Methods
   */
  close()
  {
    if(this.selRole)
    {
      this.selRole = null;
      this.collComp.reset();
      this.collComp.disableToolbarButton('del',true);
    }
  }

  save()
  {
    if (this.formComp.isValid())
    {
      //Retrieve changed Object
      let chObj = this.formComp.getChangedObj();

      // Look for permissions changed
      chObj = this.selRole.getChangedPermission(chObj);

      if(chObj)
      {
        //update
        if(this.selRole.id)
        {
          let url = '/'+this.selRole.getName()+'/update/' + this.selRole.id;
          this.modelSvc.update(url,chObj).subscribe(res =>
          {
            if(res)
              this.selRole.update(chObj); //update existing entity

            this.alert['msg'] = res ? "MESSAGE.UPDATE_OK" :  "MESSAGE.UPDATE_ERR";
            this.alert['style'] = res ? "info": "danger";
            this.alert['bt0'] = "Ok";
            this.formComp.reset();
            this.collComp.reload();
          });
        }
        else //insert
        {
          let url = '/'+this.selRole.getName()+'/insert';
          this.modelSvc.insert(url,chObj).subscribe(res =>
          {
            if(res)
            {
              this.selRole.id = res['id'];
              this.selRole.update(chObj); //update new entity
            }

            this.alert['msg'] = res ? "MESSAGE.INSERT_OK" :  "MESSAGE.INSERT_ERR";
            this.alert['style'] = res ? "info": "danger";
            this.alert['bt0'] = "Ok";
            this.formComp.reset();
            this.collComp.reload();
          });
        }
      }
      else
      {
        this.alert['msg'] = "MESSAGE.NO_CHANGES";
        this.alert['style'] = "info";
        this.alert['bt0'] = "Ok";
        this.formComp.reset();
      }
    }

  }

  addRole()
  {
    this.selRole = new Role({});
    this.collComp.reset();
  }

  delRole()
  {
    this.alert['msg'] = "MESSAGE.DELETE_ITEM_MSG";
    this.alert['style'] = "info";
    this.alert['bt1'] = "Si";
    this.alert['bt0'] = "No";
  }

  /* Catch event */
  onCollSelItem(selectedRole)
  {
    if(!selectedRole || selectedRole == this.selRole)
    {
      this.collComp.reset();
      this.collComp.disableToolbarButton('del',true);
      this.selRole = null;
      return;
    }
    else
    {
      let url = '/'+selectedRole.getName()+'/detail/'+selectedRole.id;
      this.modelSvc.detail(url).subscribe(res =>
      {
        if(res)
        {
          this.selRole = selectedRole;
          this.selRole.update(res);
        }
        else
        {
          this.alert['msg'] = "MESSAGE.DETAIL_ERR";
          this.alert['style'] = "danger";
          this.alert['bt0'] = "Ok";
        }

        //enable remove button
         this.collComp.disableToolbarButton('del',false);

      });
    }
  }

  onCollButtonClick(btn)
  {
    if ('add' in btn)
      this.addRole();
    else
      this.delRole();
  }

  onTableButtonClick(btn)
  {
    console.log("onTableButtonClick");
  }

  onFieldChanged(change)
  {
//     console.log(change);
  }

  onTableSelItem(item)
  {
    console.log("onTableSelItem");
    console.log(item);
  }

  onTableRowChanged(row)
  {
    console.log("onTableRowChanged");
    console.log(row);
  }

  onAlertDone(ret)
  {
    if(ret == 1) //Delete role
    {
      let url = '/'+this.selRole.getName()+'/delete/' + this.selRole.id;

      this.httpWriter.delete(url).subscribe(
        res =>
        {
          this.alert['msg'] =  res['result'] ? "MESSAGE.DELETE_OK" : res['error'] == 1 ?
            "MESSAGE.DELETE_ERR_ROLE" : "MESSAGE.DELETE_ERR";
          this.alert['style'] = res['result'] ? "info" : "danger";
          this.alert['bt0'] = "Ok";
          this.collComp.reload();
          this.collComp.reset();
          this.collComp.disableToolbarButton('del',true);
          this.selRole = null;
        },
        err =>
        {
          this.alert['msg'] = "MESSAGE.DELETE_ERR";
          this.alert['style'] = "danger";
          this.alert['bt0'] = "Ok";
          this.collComp.reload();
          this.collComp.reset();
          this.collComp.disableToolbarButton('del',true);
          this.selRole = null;
        }
      );
    }
    // Close alert
    this.alert = {};
  }
}
