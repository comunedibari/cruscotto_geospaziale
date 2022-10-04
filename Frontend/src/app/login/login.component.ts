import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Router } from '@angular/router';
import { Md5 } from 'ts-md5/dist/md5';

import { AuthService } from '../../modules/core/auth.service';
import { HttpReaderService } from '../../modules/core/http-reader.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})

export class LoginComponent implements OnInit {
  title: string = "Cruscotto Geospaziale";
  loading: boolean = false;
  username: string;
  password: string;
  errorMsg: string;
  recoveryPwd: any = {};

  constructor(
    private router:Router,
    private modalSvc:NgbModal,
    private authSvc: AuthService,
    private httpReader:HttpReaderService
  ) {}

  ngOnInit()
  {
  }

  doLogin()
  {
    this.errorMsg = null;

    /* Check */
    if (!this.username)
    {
      this.errorMsg = "Inserire username !";
      return;
    }

    /* Do login */
    var body = {signature: Md5.hashStr(
      this.username.toLowerCase() + this.password)};

    this.httpReader.post("/login/doLoginNew",body).subscribe(
      res =>
      {
        if (res["result"])
        {
          this.authSvc.setToken(res["result"]);
          this.router.navigate(["/main"],{skipLocationChange: true});
        }
        else
        {
          this.errorMsg = "Credenziali non corrette !";
        }
      },
      err => {}
    );
  }

  doRecoveryPwd()
  {
    if (!this.recoveryPwd.username || !this.recoveryPwd.email)
    {
      this.recoveryPwd.message = "Compilare tutti i campi !";
      return;
    }

    this.loading = true;
    this.recoveryPwd.message = null;

    this.httpReader.post("/auth/newPassword",this.recoveryPwd).subscribe
    (
      res =>
      {
        this.loading = false;

        if (res["result"])
        {
          this.recoveryPwd.message =
            "La nuova password è stata inviata al tuo indirizzo email";
        }
        else
        {
          switch (res["error"])
          {
            case 1:
              this.recoveryPwd.message =
                "I dati inseriti non sono corretti !";
              break;
            default:
              this.recoveryPwd.message =
                "Errore durante la procedura di recupero password !";
              break;
          }
        }
      },
      err =>
      {
        this.loading = false;
        this.recoveryPwd.message = "Errore di comunicazione con il server !";
      }
    );
  }

  openRPModal(content)
  {
    this.recoveryPwd.email = null;
    this.recoveryPwd.message = null;
    this.recoveryPwd.username = null;

    this.modalSvc.open(content,{
      backdrop: "static",
      keyboard: false,
      //centered: true,
      size:"sm"
    });
  }
}
