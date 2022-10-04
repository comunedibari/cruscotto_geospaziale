import {Component,
        OnInit,
        Input}            from '@angular/core';

import {NgbModal,
        NgbActiveModal,
        NgbModalOptions}  from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'core-modal-message',
  templateUrl: './modal-message.component.html',
  styleUrls: ['./modal-message.component.css']
})

export class ModalMessageComponent implements OnInit {

  // options to configure modal
  @Input() modalCfg:{title:string,msg:string,style:string,buttons:any[]};

  constructor(private modal:NgbActiveModal)
  {
  }

  ngOnInit()
  {
  }

  /*
   * Manage popup buttons click
   */
  onClick(button):void
  {
    // close modal
    this.modal.close();

    // if button has a related callback, we invoke it
    if (button.callback)
    {
      button.callback();
    }
  }
}
