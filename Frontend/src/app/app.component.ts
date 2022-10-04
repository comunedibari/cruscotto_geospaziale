import { Component,OnInit }  from '@angular/core';
import { TranslateService }  from '@ngx-translate/core';
import { Router }            from '@angular/router';

import { AuthService }       from '../modules/core/auth.service';
import { HttpReaderService } from '../modules/core/http-reader.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements OnInit
{
  constructor(
    private transSvc:TranslateService,
    private router:Router,
    private httpReader:HttpReaderService,
    private authSvc: AuthService)
  {
    transSvc.setDefaultLang("it");
    transSvc.use("it");
  }

  ngOnInit()
  {
    // invoke check of wso2 login
    this.httpReader.get("/loginWSO2/check").subscribe(
      res =>{
        if (res["result"])
        {
          // in this case wso2_username has a corresponding username on system;
          // proceed without custom login (already done on /loginWSO2/check method)
          // and access directly to application
          this.authSvc.setToken(res["result"]);
          this.router.navigate(["/main"],{skipLocationChange: true});
        }
        else if (res["message"])
        {
          let msg = res["message"];

          switch(msg)
          {
            case "NO_WSO2_HEADERS":
              // no wso2 headers into request
              // (this is the case of accessing the application from a url not protected by wso2)
              this.router.navigate(["/login"],{skipLocationChange:true});
              break;

            case "WSO2_USER_NOT_DEFINED":
              // wso2 username into request header is not mapped with an application username
              this.router.navigate(["/login-err"],{queryParams: {err:"WSO2_USER_NOT_DEFINED"}, skipLocationChange:true});
              break;
          }
        }
      },
      err => {
        if (err["message"])
        {
          switch(err["message"])
          {
            case "ERROR":
            case "LOGIN_ERROR":
              // generic error during login procedure or during retrieve user related to given wso2Username
              this.router.navigate(["/login-err"],{queryParams: {err:err["message"]}, skipLocationChange:true});
              break;
          }
        }
      }
    );

  }
}
