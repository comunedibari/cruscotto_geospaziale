import { Component,OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { AuthService } from '../../modules/core/auth.service';
import { ModelService } from '../../modules/core/model.service';
import { HttpReaderService } from '../../modules/core/http-reader.service';
import { NavbarService } from './navbar.service';

/* Component from dictionary module */
import { ArcComponent } from '../../modules/dictionary/arc/arc.component';
import { StreetComponent } from '../../modules/dictionary/street/street.component';
import { NumberComponent } from '../../modules/dictionary/number/number.component';
import { BuildingComponent } from '../../modules/dictionary/building/building.component';

/* Component from grafo module */
import { LogComponent } from '../../modules/grafo/log/log.component';
import { ViaListComponent } from '../../modules/grafo/via-list/via-list.component';

/* Component from userole module */
import { UserComponent } from '../../modules/userole/user/user.component';
import { RoleComponent } from '../../modules/userole/role/role.component';
import { LoggedUserComponent } from '../../modules/userole/logged-user/logged-user.component';

/* Component from webgis module */
import { ConfigComponent } from '../../modules/webgis/config/config.component';

/*
 * Navbar component
 */
@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})

export class NavbarComponent implements OnInit
{
  isCollapsed:boolean = true;
  userInfo:object;
  menu:object[] = [];

  private modalCfg:object = {
    listStreet: ViaListComponent,
    dictArc: ArcComponent,
    dictStreet: StreetComponent,
    dictNumber: NumberComponent,
    dictBuilding: BuildingComponent,
    manageUsers: UserComponent,
    manageRoles: RoleComponent,
    manageLayers: ConfigComponent,
    grafoLog: LogComponent
  };

  constructor(
    private modalSvc:NgbModal,
    private authSvc:AuthService,
    private modelSvc:ModelService,
    private navbarSvc: NavbarService,
    private httpReader:HttpReaderService
  ) {}

  ngOnInit()
  {
    /* Get user info */
    this.userInfo = this.authSvc.userInfo;

    /* Load menu */
    let permId = this.authSvc.allPermId().join();

    this.modelSvc.master("/menu/master",{permId:permId}).subscribe(res =>
    {
      if (res)
        this.menu = res;
    });
  }

  onMenuItem(action)
  {
    if (this.modalCfg[action])
    {
      const modal = this.modalSvc.open(
        this.modalCfg[action],
        {backdrop:"static", keyboard:false, size:"lg"}
      );
    }
    else
      this.navbarSvc.notifyMenuAction(action);
  }

  onUserInfo()
  {
    const uiModal = this.modalSvc.open(
      LoggedUserComponent,
      {backdrop:"static", keyboard:false, size:"lg"}
    );

    uiModal.result.then(
      (res) => {}, //On close (result)
      (reas) => {} // On dismiss (reason)
    );

    uiModal.componentInstance.data = this.userInfo;
  }

  onLogout()
  {
    this.httpReader.get("/loginWSO2/doLogout").subscribe(
      res =>
      {
        if (res["message"])
        {
          var msg = res["message"];

          switch(msg)
          {
            case "NO_COOKIES":
              window.location.reload(true);
              break;

            case "COOKIES":
              if (res["url"])
                window.location.replace(res["url"]);
              else
                window.location.reload(true);
              break;

            default:
            console.info(res["message"]);
          }
        }
        else
        {
          ;
        }
      },
      err => {}
    );

    // window.location.reload(true);
  }
}
