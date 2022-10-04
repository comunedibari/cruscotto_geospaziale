import { Component, OnInit, Input,
        EventEmitter, Output, ViewChild } from '@angular/core';

import { SearchComponent } from '../search/search.component';

@Component({
  selector: 'core-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.css']
})
export class ToolbarComponent implements OnInit {
  @Input() config;
  @Output() buttonClick = new EventEmitter<any>();
  @Output() search = new EventEmitter<any>();

  @ViewChild(SearchComponent) searchComp: SearchComponent;

  configSearch = null;

  constructor() { }

  ngOnInit(){
    if(this.config['search'])
    {
      this.configSearch = {};
      switch(this.config['search']['type'])
      {
        case 1: // simple
          // set config for simple search
          this.configSearch['simple'] = {key: []};

          if(this.config['fr'] && this.config['fr']['searchable'])
            this.configSearch['simple']['key'].push(this.config['fr']['key']);

          if(this.config['sr'] && this.config['sr']['searchable'])
            this.configSearch['simple']['key'].push(this.config['sr']['key']);

          if(this.config['search']['key'])
            for(let i = 0; i < this.config['search']['key'].length; i++)
            {
              let newKey = this.config['search']['key'][i];
              this.configSearch['simple']['key'].push(newKey);
            }
          break;

        case 2: // advaced
          // set config for advanced search
          this.configSearch['advanced'] = {};

          if (this.config['search']['placement'])
            this.configSearch['advanced']['placement'] = this.config['search']['placement'];
          if (this.config['search']['source'])
            this.configSearch['advanced']['source'] = this.config['search']['source'];
          break;

        case 3: // simple and advanced
          // set config for simple search
          this.configSearch['simple'] = {key: []};

          if(this.config['fr'] && this.config['fr']['searchable'])
            this.configSearch['simple']['key'].push(this.config['fr']);

          if(this.config['sr'] && this.config['sr']['searchable'])
            this.configSearch['simple']['key'].push(this.config['fr']);

          if(this.config['search']['key'])
            for(let i = 0; i < this.config['search']['key'].length; i++)
            {
              let newKey = this.config['search']['key'][i];
              this.configSearch['simple']['key'].push(newKey);
            }

          // set config for advanced search
          this.configSearch['advanced'] = {};
          if (this.config['search']['placement'])
            this.configSearch['advanced']['placement'] = this.config['search']['placement'];
          if (this.config['search']['source'])
            this.configSearch['advanced']['source'] = this.config['search']['source'];
          break;
      }
    }
  }

  /*
   * Methods
   */

  //Public methods accessible from parent component
  disableButton(name,value)
  {
    this.config['buttons'][name]['disabled'] = value;
  }

  //public methods
  buttonTable()
  {
    if (this.config['onComponent'] == 'table')
      return this.config['editTable'] ? true : false;
    else
      return true;
  }

  btnClick(btn,key)
  {
    let obj = {};
    obj[key] = btn;
    this.buttonClick.emit(obj);
  }

  onKeydownSimpleSearch(ev)
  {
    this.search.emit(ev);
  }

  onClearSimpleSearch()
  {
    this.search.emit(null);
  }

  onFilterAdvancedSearch(event)
  {
    this.search.emit(event);
  }
}
