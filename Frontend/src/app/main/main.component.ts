import { Component,OnInit,ViewChild,ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { AuthService } from '../../modules/core/auth.service';
import { ContextService } from '../../modules/core/context.service';

import { SidebarComponent } from '../sidebar/sidebar.component';
import { MapComponent } from '../../modules/webgis/map/map.component';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css'],
  host: {'(window:resize)': 'onWindowResize($event)'}
})

export class MainComponent implements OnInit
{
  hideSdb:boolean = false;

  @ViewChild("mainRow")   mr:ElementRef;
  @ViewChild("footerRow") fr:ElementRef;
  @ViewChild(MapComponent) mapCmp:MapComponent;
  @ViewChild(SidebarComponent) sdbCmp:SidebarComponent;

  /*
   * Methods
   */
  constructor(
    private route:ActivatedRoute,
    private authSvc:AuthService,
    private contextSvc:ContextService
  )
  {
    this.route.data.subscribe(res =>
    {
      this.authSvc.userInfo = res.all.userInfo.result;
      this.authSvc.permission = res.all.permission;

      this.contextSvc.update(res.all.context);
    });
  }

  ngOnInit()
  {
  }

  ngAfterViewInit()
  {
    setTimeout(() => {this.setMainRowHeight();},10);
  }

  onWindowResize(event)
  {
    this.setMainRowHeight();
  }

  /*
   * GrafoEdit component event handler
   */
  onShowEntity(entity)
  {
    if (this.hideSdb)
    {
      this.hideSdb = false;
      this.mapCmp.updateSize();
    }

    this.sdbCmp.showDetail(entity);
  }

  onInsertArco(data)
  {
    if (this.hideSdb)
    {
      this.hideSdb = false;
      this.mapCmp.updateSize();
    }

    this.sdbCmp.showInsertArcoChecks(data);
  }

  onBreakArco(data)
  {
    if (this.hideSdb)
    {
      this.hideSdb = false;
      this.mapCmp.updateSize();
    }

    this.sdbCmp.showBreakArco(data);
  }

  onMergeArco(data)
  {
    if (this.hideSdb)
    {
      this.hideSdb = false;
      this.mapCmp.updateSize();
    }

    this.sdbCmp.showMergeArco(data);
  }

  onRenumberCivico(entity)
  {
    if (this.hideSdb)
    {
      this.hideSdb = false;
      this.mapCmp.updateSize();
    }

    this.sdbCmp.showRenumberCivico(entity);
  }

  onRenameArco(entity)
  {
    if (this.hideSdb)
    {
      this.hideSdb = false;
      this.mapCmp.updateSize();
    }

    this.sdbCmp.showRenameArco(entity);
  }

  onToggleSidebar(opt)
  {
    this.hideSdb = !this.hideSdb;
    this.mapCmp.updateSize();
  }

  /*
   * Private method
   */
  private setMainRowHeight()
  {
    this.mr.nativeElement.style.height =
      window.innerHeight -
      this.mr.nativeElement.offsetTop -
      this.fr.nativeElement.offsetHeight + "px";
  }
}
