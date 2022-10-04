import { Component,OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'webgis-config',
  templateUrl: './config.component.html',
  styleUrls: ['./config.component.css']
})

export class ConfigComponent implements OnInit
{
  alert = {};

  /*
   * Methods
   */
  constructor(private modalInst:NgbActiveModal) {}

  ngOnInit() {}

  close()
  {
    this.modalInst.close();
  }

  /*
   * Event handler
   */
  onShowMessage(obj)
  {
    this.alert = obj;
  }

  onAlertDone(ret)
  {
    if (this.alert["callback"])
      this.alert["callback"](ret);

    this.alert = {};
  }
}
