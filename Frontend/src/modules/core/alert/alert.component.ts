import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'core-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.css']
})
export class AlertComponent implements OnInit {

  @Input() config;
  @Output() alertDone = new EventEmitter<any>();

  constructor() { }

  ngOnInit() { }

  /*
   * Methods
   */
  btnClicked(ret)
  {
    this.alertDone.emit(ret);
  }
}
