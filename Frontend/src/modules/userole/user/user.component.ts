import { Component, Input, OnInit, ViewChild} from '@angular/core';
import { CollectionComponent } from '../../core/collection/collection.component';
import { FormComponent } from '../../core/form/form.component';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { User } from './user';
import { ModelService } from '../../core/model.service';
import { HttpWriterService } from '../../core/http-writer.service';
import { HttpReaderService } from '../../core/http-reader.service';

@Component({
  selector: 'ur-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css']
})
export class UserComponent implements OnInit
{
  @Input() config;
  @ViewChild(CollectionComponent) collComp: CollectionComponent;
  @ViewChild(FormComponent) formComp: FormComponent;

  /*
   * Local variables
   */
  selUser: User = null;
  alert: Object = {};

  // config collection
  collCfg = {
    entity: this.config && this.config['entity'] ? this.config['entity']  : "user",
    entClass: this.config && this.config['entClass'] ? this.config['entClass']  : User,
    firstRow: {key: "fullname", searchable: false},
    secondRow:{key: "username", searchable: true},
    pagination: this.config && this.config['pagination'] ? this.config['pagination'] :
      {rpp:5, rppArray:[5,10,15]},
    order: this.config && this.config['order'] ?  this.config['order'] : "name|ASC",
    filter: this.config && this.config['filter'] ?  this.config['filter'] :  null,
    toolbar:{
      buttons:{add:{disabled:false},del:{disabled:true}},
      search: {type: 1, key:['name', 'surname']}
    }
  };

  //config form
  formCfg: any = {
    id: "userForm",
    fg:
    [
      {
        id: "genData",
        rows:
        [
          [
            {
              key:"username",
              label:"WORD.USERNAME",
              type:"text",
              width:6,
              disabled: true,
              required: true
            },
            {
              key:"creation_date",
              label:"WORD.CREATION_DATE",
              type:"timestamp",
              width:6,
              disabled: true,
              required: true,
              subType: "date"
            }
          ],
          [
            {
              key:"name",
              label:"WORD.NAME",
              required:true,
              type:"text",
              width:6
            },
            {
              key:"surname",
              label:"WORD.SURNAME",
              required:true,
              type:"text",
              width:6
            }
          ],
          [
            {
              key:"phone",
              label:"WORD.PHONE",
              type:"text",
              subType: "tel",
              width:6
            },
            {
              key:"email",
              label:"WORD.EMAIL",
              type:"text",
              subType: "email",
              width:6,
              validEmail:true,
              required: true
            }
          ],
          [
            {
              key:"wso2_username",
              label:"Username WSO2",
              type:"text",
              width:6
            },
            {
              key:"role",
              label:"WORD.ROLE",
              type:"select",
              width:6,
              options:[],
              multiple:true,
              required: true
            }
          ]
        ]
      }
    ]
  };

  constructor(
    public modalInst:NgbActiveModal,
    private modelSvc:ModelService,
    private httpWriter:HttpWriterService,
    private httpReader:HttpReaderService) {}

  ngOnInit() {
    //Retrieve roles
    this.modelSvc.master('/role/master',{}).subscribe(res =>
    {
      if(res)
      {
        var roles = [];
        for (let i = 0;i < res.length;i++)
          roles.push(res[i]);

        this.formCfg['fg'][0]['rows'][3][1].options = roles;
      }
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
    if(this.selUser)
    {
      this.selUser = null;
      this.collComp.reset();
      this.collComp.disableToolbarButton('del',true);
      this.formComp.reset();
    }
  }

  save()
  {
    if (this.formComp.isValid())
    {
      //Retrieve changed keys
      let chObj = this.formComp.getChangedObj();
      if(chObj)
      {
        if(chObj.role)
          chObj.role = this.selUser.getChangedRole(chObj.role);
        
        // in this case wso2_username is removed from user -> set it to null
        // to avoid to write empty string on sysuser table
        if (chObj.wso2_username == '')
          chObj.wso2_username = null;

        // check for uniqueness of wso2 username
        let url = '/loginWSO2/checkUniqueWSO2?wso2_username=' + chObj.wso2_username;

        this.httpReader.get(url).subscribe(
          res => {

            if (res['count'] && parseInt(res['count']) > 0)
            {
              // wso2_username already exist on sysuser table -> error
              this.alert['msg'] = "MESSAGE.ERR_DUPLICATE_WSO2_USERNAME";
              this.alert['style'] = "danger";
              this.alert['bt0'] = "Ok";
              this.formComp.reset();
            }
            else
            {
              // wso2_username doesn't exist on sysuser table -> go on with insert/update

              //update
              if(this.selUser.id)
              {
                let url = '/'+this.selUser.getName()+'/update/' + this.selUser.id;
                this.modelSvc.update(url,chObj).subscribe(res =>
                {
                  if(res)
                    this.selUser.update(chObj); //update existing entity

                  this.alert['msg'] = res ? "MESSAGE.UPDATE_OK" :  "MESSAGE.UPDATE_ERR";
                  this.alert['style'] = res ? "info": "danger";
                  this.alert['bt0'] = "Ok";
                  this.formComp.reset();
                  this.collComp.reload();
                });
              }
              else //insert
              {
                let url = '/'+this.selUser.getName()+'/insert';
                this.httpWriter.post(url,chObj).subscribe(
                  res =>
                  {
                    if(res && res['result'])
                    {
                      this.selUser.id = res['result']['id'];
                      this.selUser.update(chObj); //update new entity
                    }

                    this.alert['msg'] = res['result'] ?  "MESSAGE.INSERT_OK" : res['error'] ?
                      "MESSAGE.EXISTING_USER_ERR" : "MESSAGE.INSERT_ERR";
                    this.alert['style'] = res['result'] ? "info": "danger";
                    this.alert['bt0'] = "Ok";
                    this.formComp.reset();
                    this.collComp.reload();
                  },
                  err =>
                  {
                    this.alert['msg'] = "MESSAGE.INSERT_ERR";
                    this.alert['style'] = "danger";
                    this.alert['bt0'] = "Ok";
                    this.formComp.reset();
                    this.collComp.reload();
                  }
                );
              }
            }
          },
          err => {
            this.alert['msg'] = "MESSAGE.INSERT_ERR";
            this.alert['style'] = "danger";
            this.alert['bt0'] = "Ok";
            this.formComp.reset();
            this.collComp.reload();
          }
        );

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

  addUser()
  {
    this.selUser = new User({});
    //enable field
    this.collComp.reset();
    this.formComp.disableFields(['username','creation_date'],false);
    this.collComp.disableToolbarButton('del',true);
  }

  delUser()
  {
    this.alert['msg'] = "MESSAGE.DELETE_ITEM_MSG";
    this.alert['style'] = "info";
    this.alert['bt1'] = "Si";
    this.alert['bt0'] = "No";
  }

  /* Catch event */
  onCollSelItem(selectedUser)
  {
    if(!selectedUser || selectedUser == this.selUser)
    {
      this.collComp.reset();
      this.collComp.disableToolbarButton('del',true);
      this.selUser = null;
      return;
    }
    else
    {
      let url = '/'+selectedUser.getName()+'/detail/'+selectedUser.id;
      this.modelSvc.detail(url).subscribe(res =>
      {
        if(res)
        {
          this.selUser = selectedUser;
          this.selUser.update(res);
        }
        else
        {
          this.alert['msg'] = "MESSAGE.DETAIL_ERR";
          this.alert['style'] = "danger";
          this.alert['bt0'] = "Ok";
        }

        //disabled field
        this.formComp.disableFields(['username','creation_date'],true);
        this.collComp.disableToolbarButton('del',false);
      });
    }
  }

  onCollButtonClick(btn)
  {
    if ('add' in btn)
      this.addUser();
    else
      this.delUser();
  }

  onFieldChanged(change)
  {
//     console.log(change);
  }

  onAlertDone(ret)
  {
    if(ret == 1) //Delete user
    {
      let url = '/'+this.selUser.getName()+'/delete/' + this.selUser.id;
      this.modelSvc.delete(url).subscribe(res =>
      {

        this.alert['msg'] =  res ? "MESSAGE.DELETE_OK" :  "MESSAGE.DELETE_ERR";
        this.alert['style'] = res ? "info" : "danger";
        this.alert['bt0'] = "Ok";

        this.collComp.reload();
        this.collComp.reset();
        this.collComp.disableToolbarButton('del',true);
        this.selUser = null;
      });
    }
    // Close alert
    this.alert = {};
  }
}
