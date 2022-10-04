import { Component,Input,OnInit,ViewChild } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Md5 } from 'ts-md5/dist/md5';

import { FormComponent } from '../../core/form/form.component';
import { ModelService } from '../../core/model.service';

@Component({
  selector: 'ur-logged-user',
  templateUrl: './logged-user.component.html',
  styleUrls: ['./logged-user.component.css']
})

export class LoggedUserComponent implements OnInit
{
  @Input() data;
  @ViewChild(FormComponent) formCmp:FormComponent;

  alert = {};

  /* Form config */
  formCfg =
  {
    id:"luForm", fg:
    [
      {
        id:0, rows:
        [
          [
            {
              key: "username",
              type: "text",
              label: "Nome utente",
              width: 6,
              disabled: true
            },
            {
              key: "roleStr",
              type: "text",
              label: "Ruolo",
              width: 6,
              disabled: true
            }
          ],
          [
            {
              key: "name",
              type: "text",
              label: "Nome",
              width: 6,
              required: true
            },
            {
              key: "surname",
              type: "text",
              label: "Cognome",
              width: 6,
              required: true
            }
          ],
          [
            {
              key: "email",
              type: "text",
              label: "Email",
              width: 6,
              subType: "email",
              required: true
            },
            {
              key: "phone",
              type: "text",
              label: "Telefono",
              width: 6,
              subType: "tel"
            }
          ]
        ]
      },
      {
        id:1, label:"Cambio password", rows:
        [
          [
            {
              key: "pwd1",
              type: "text",
              label: "Nuova password",
              width: 6,
              subType: "password"
            },
            {
              key: "pwd2",
              type: "text",
              label: "Reinserisci password",
              width: 6,
              subType: "password"
            }
          ]
        ]
      }
    ]
  };

  /*
   * Methods
   */
  constructor(public modalInst:NgbActiveModal, private modelSvc:ModelService){}

  ngOnInit()
  {
    let aRoleName = [];

    for (var j = 0;j < this.data.role.length;j++)
      aRoleName.push(this.data.role[j].name);

    this.data.roleStr = aRoleName.join(", ");
  }

  close()
  {
    this.modalInst.close();
  }

  save()
  {
    if (this.formCmp.isValid())
    {
      let chObj = this.formCmp.getChangedObj();
      if (chObj)
      {
        /* Check for password update */
        if (chObj.pwd1 || chObj.pwd2)
        {
          if (chObj.pwd1 == chObj.pwd2)
          {
            chObj.signature = Md5.hashStr(this.data.username+chObj.pwd1);
          }
          else
          {
            this.alert = {
              style: "danger",
              msg: "MESSAGE.PASSWORD_MISMATCH",
              bt0: "Ok"
            };

            return;
          }
        }

        delete chObj.pwd1;
        delete chObj.pwd2;

        /* Save */
        let url = "/user/update/"+this.data.id;

        this.modelSvc.update(url,chObj).subscribe(res =>
        {
          if (res)
          {
            for (let key in chObj)
              this.data[key] = chObj[key];
          }

          /* Notify to user */
          this.alert = {
            style: res ? "info" : "danger",
            msg: res ? "MESSAGE.UPDATE_OK" : "MESSAGE.UPDATE_ERR",
            bt0: "Ok"
          };
        });
      }
    }
  }

  onAlertDone(ret)
  {
    this.alert = {};
  }
}
