import { Component,OnInit,ViewChild } from '@angular/core';
import { NavbarService } from '../navbar/navbar.service';

import { SearchComponent }     from '../../modules/grafo/search/search.component';
import { DetailComponent }     from '../../modules/grafo/detail/detail.component';

import { InsertArcoComponent } from '../../modules/grafo/insert-arco/insert-arco.component';
import { BreakArcoComponent }  from '../../modules/grafo/break-arco/break-arco.component';
import { MergeArcoComponent }  from '../../modules/grafo/merge-arco/merge-arco.component';
import { RenameArcoComponent } from '../../modules/grafo/rename-arco/rename-arco.component';

import { RenumberCivicoComponent } from '../../modules/grafo/renumber-civico/renumber-civico.component';

import { Via } from '../../modules/grafo/entity/via';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})

export class SidebarComponent implements OnInit
{
  @ViewChild(SearchComponent) srcCmp:SearchComponent;
  @ViewChild(DetailComponent) detCmp:DetailComponent;
  @ViewChild(InsertArcoComponent) insArcoCmp:InsertArcoComponent;
  @ViewChild(BreakArcoComponent) breakArcoCmp:BreakArcoComponent;
  @ViewChild(MergeArcoComponent) mergeArcoCmp:MergeArcoComponent;
  @ViewChild(RenameArcoComponent) renameArcoCmp:RenameArcoComponent;
  @ViewChild(RenumberCivicoComponent) renCivicoCmp:RenumberCivicoComponent;

  /*
   * Class method
   */
  constructor(private navbarSvc:NavbarService)
  {
    navbarSvc.menuAction.subscribe(action =>
    {
      switch (action)
      {
        case "insertStreet":
          this.detCmp.shownEntity(new Via({},1));
          break;
        case "updateStreet":
          this.srcCmp.setAdvSearch(1,2);
          break;
        case "renameStreet":
          this.srcCmp.setAdvSearch(1,4);
          break;
        case "cessationStreet":
          this.srcCmp.setAdvSearch(1,3);
          break;
      }
    });
  }

  ngOnInit() {}

  showDetail(entity)
  {
    this.detCmp.shownEntity(entity);
  }

  showInsertArcoChecks(data)
  {
    this.insArcoCmp.showInsertArcoChecks(data);
  }

  /*
   * Search event
   */
  onSearchResult(entity)
  {
    this.srcCmp.panCollapsed = true;
    this.detCmp.shownEntity(entity);
  }

  /*
   * Show insert new arco panel
   */
  onInsertArco(entity)
  {
    this.srcCmp.panCollapsed = true;
    
    this.detCmp.shownEntity(entity);

    this.insArcoCmp.close();
  }

  /*
   * Show break arco component
   */
  showBreakArco(data)
  {
    this.srcCmp.panCollapsed = true;
    this.detCmp.collapsed = true;

    this.breakArcoCmp.showData(data);
  }

  /*
   * Show merge arco component
   */
  showMergeArco(data)
  {
    this.srcCmp.panCollapsed = true;
    this.detCmp.collapsed = true;

    this.mergeArcoCmp.showData(data);
  }

  /*
   * Show rename arco panel
   */
  showRenameArco(entity)
  {
    this.srcCmp.panCollapsed = true;

    this.renameArcoCmp.showRenameArcoForm(entity);
  }

  /*
   * Show renumber civico panel
   */
  showRenumberCivico(entity)
  {
    this.srcCmp.panCollapsed = true;

    this.renCivicoCmp.showRenumberCivicoForm(entity);
  }

  /*
   * Show merge arco component
   */
  onMergeArco(entity)
  {
    ;
  }
}
