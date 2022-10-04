import { Component,OnInit,ElementRef } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { ModelService } from '../../core/model.service';
import { WebgisService } from '../../webgis/webgis.service';

import { ModalMessageComponent } from
  '../../core/modal-message/modal-message.component';

@Component({
  selector: 'grafo-detail',
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.css']
})

export class DetailComponent implements OnInit
{
  visible = false;
  collapsed = false;
  bodyStyle = {"overflow-y":"auto"};
  curEntity:object = null;

  /*
   * Class method
   */
  constructor(
    private elRef:ElementRef,
    private modalSvc: NgbModal,
    private modelSvc:ModelService,
    private webgisSvc:WebgisService
  ) {}

  ngOnInit()
  {
    //TODO
    setInterval(() =>
    {
      if (this.visible)
      {
        let maxHeight = this.elRef.nativeElement.parentElement.offsetHeight -
          this.elRef.nativeElement.offsetTop - 60;

        if (maxHeight != this.bodyStyle["max-height.px"])
          this.bodyStyle["max-height.px"] = maxHeight;
      }
    },250);
  }

  shownEntity(entity)
  {
    /* Look for new entity */
    if (entity.isNew())
    {
      this.curEntity = entity;
      this.visible = true;
      return;
    }

    /* Load detail */
    this.modelSvc.detail(entity.detailUrl()).subscribe(res =>
    {
      if (res)
      {
        entity.update(res);

        this.curEntity = entity;
        this.visible = true;
      }
    });
  }

  close()
  {
    this.visible = false

    /* Notify to webgis */
    this.webgisSvc.sendMessage("endEdit",{
      entity: this.curEntity,
      status: "C"
    });
  }

  titleStyle(entity:any):{color:string}
  {
    let color = "#000000";

    if (entity.data_fine && entity.data_fine < new Date().getTime())
      color = "#e20a16";

    return {color: color};
  }

  onShowMsg(cfg:any)
  {
    /* Open message modal */
    const modal = this.modalSvc.open(ModalMessageComponent,{
      backdrop: "static",
      keyboard: false,
      size: cfg.size
    });

    /* Set config */
    cfg.style = cfg.style || "info";

    modal.componentInstance.modalCfg = cfg;
  }
}
