import { Component, OnInit } from '@angular/core';
import { ActivatedRoute }    from '@angular/router';


@Component({
  selector: 'app-login-err',
  templateUrl: './login-err.component.html',
  styleUrls: ['./login-err.component.css']
})
export class LoginErrComponent implements OnInit
{
  title: string = "Cruscotto Geospaziale";
  err: string;
  err_message: string;

  constructor(private route: ActivatedRoute) {}

  ngOnInit()
  {
    this.err = this.route.snapshot.queryParamMap.get('err');
    
    switch(this.err)
    {
      case "ERROR":
        this.err_message = "Si è verificato un errore durante il recupero delle informazioni di accesso al sistema";
        break;

      case "LOGIN_ERROR":
        this.err_message = "Si è verificato un errore durante il recupero delle informazioni di accesso al sistema";
        break;

      case "WSO2_USER_NOT_DEFINED":
        this.err_message = "L'utente non è abilitato all'utilizzo del sistema. Contattare l'amministratore";
        break;

      default:
        this.err_message = "Si è verificato un errore durante il recupero delle informazioni di accesso al sistema";
    }
  }

}
