import { Component, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import { ModelService } from '../model.service';
import { PaginationComponent } from '../pagination/pagination.component';
import { ToolbarComponent } from '../toolbar/toolbar.component';

@Component({
  selector: 'core-collection',
  templateUrl: './collection.component.html',
  styleUrls: ['./collection.component.css']
})
export class CollectionComponent implements OnInit {
  @Input() config;
  @Output() selectedItem = new EventEmitter<any>();
  @Output() tlbButton = new EventEmitter<any>();
  @ViewChild(PaginationComponent) pagComp: PaginationComponent;
  @ViewChild(ToolbarComponent) toolComp: ToolbarComponent;

  /*
   * Local variables
   */
  data: any = []; //data collection
  fr: string = null;
  sr: string = null;
  configPag: Object = {};
  configToolbar = null;
  itemCss: Object = {};
  loading: boolean = true;
  dataPag: boolean = true;

  constructor(private modelSvc:ModelService) { }

  ngOnInit() {
    /* set config  parameters */
    if(this.config['firstRow'])
      this.fr = this.config['firstRow']['key'];

    if(this.config['secondRow'])
      this.sr = this.config['secondRow']['key'];

    if(this.config['data'])
    {
      this.data = this.config['data'];
      this.loading = false;
      this.dataPag = false;
    }
    else
    {
      if(this.config['pagination'])
      {
        // Config pagination
        this.configPag['rpp'] = this.config['pagination']['rpp'] ;
        this.configPag['rppArray'] = this.config['pagination']['rppArray'];
      }

      // Config pagination
      this.configPag['countUrl'] = this.config['countUrl'] ? this.config['countUrl'] :
        "/" + this.config['entity'] +"/count";
      this.configPag['masterUrl'] = this.config['masterUrl'] ? this.config['masterUrl'] :
        "/" + this.config['entity'] +"/master";

      this.configPag['filter'] = this.config['filter'] || null;
      this.configPag['order'] = this.config['order'] || null;
      this.configPag['entity'] = this.config['entity'] || null;
      this.configPag['entClass'] = this.config['entClass'] || null;
    }

    // Config toolbar
    if(this.config['toolbar'])
    {
      this.configToolbar = this.config['toolbar'];
      //the toolbar is associated on collection component
      this.configToolbar['onComponent'] = 'search';
      if(this.fr)
        this.configToolbar['fr'] = this.config['firstRow'];

      if(this.sr)
        this.configToolbar['sr'] = this.config['secondRow'];
    }
  }

  /*
   * Methods
   */

  //Public methods accessible from parent component
  reload(cfg?: Object)
  {
    if(cfg)
    {
      let keys = Object.keys(cfg);
      keys.forEach(key => {
        this.configPag[key] = cfg[key];
      });
      this.pagComp.reloadCfg(this.configPag);
    }
    if(this.dataPag)
    {
      this.loading = true;
      this.pagComp.load();
    }
  }

  reset()
  {
    this.itemCss = {};
  }

  disableToolbarButton(name, value)
  {
    this.toolComp.disableButton(name,value);
  }

  //Public methods component
  itemSelected(ent)
  {
    this.itemCss = {};
    this.itemCss[ent.id] = "coll-item-sel";
    this.selectedItem.emit(ent);
  }

  //Catch events
  onPageLoaded(data)
  {
    this.loading = false;
    if(data)
      this.data = data;
  }

  onButtonClick(event)
  {
    this.tlbButton.emit(event);
  }

  onSearch(filter)
  {
    if(this.dataPag)
      this.pagComp.setFilter(filter);
  }
}
