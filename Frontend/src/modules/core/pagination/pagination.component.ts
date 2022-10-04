import { Component, OnInit, Input, Output, EventEmitter} from '@angular/core';
import { ModelService } from '../model.service';

@Component({
  selector: 'core-pagination',
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.css']
})
export class PaginationComponent implements OnInit {
  @Input() config;
  @Output() pageLoaded = new EventEmitter<any>();

  count: number = 0;
  curPage: number = 1;
  rpp: number;
  rppArray: any = [];
  firstIndex: number = 0;
  lastIndex: number = 0;

  constructor(private modelSvc:ModelService) { }

  ngOnInit() {
    this.reloadCfg(this.config);
  }


  /*
   * Methods
   */
  //Public methods accessible from parent component
  load()
  {
    if (!this.config['countUrl'])
    {
      console.warn("count url is NULL");
      return;
    }

    // Load count
    let  body = this.config['filter'] ? {filter: this.config['filter']} : {};

    this.modelSvc.count(this.config['countUrl'], body).subscribe(res =>
    {
      this.count = res ? res : 0;

      if (res)
        this.loadMaster();
    });
  }

  reloadCfg(cfg)
  {
    let keys = Object.keys(cfg);

    keys.forEach(key => {
      this.config[key] = cfg[key];
    });

    // Set url
    if (!cfg.countUrl && cfg.entity)
      this.config['countUrl'] = "/" + this.config['entity'] +"/count" ;

    if (!cfg.masterUrl && cfg.entity)
      this.config['masterUrl'] = "/" + this.config['entity'] +"/master" ;

    // Update pagination
    this.rpp = this.config['rpp'] || 10
    this.rppArray = this.config['rppArray'] || [10,15,20];
  }

  setFilter(f)
  {
    this.config['filter'] = f;
    this.load();
    //this.loadMaster();
  }

  setOrder(o)
  {
    if (o != this.config['order'])
    {
      this.config['order'] = o;
      this.load();
      //this.loadMaster();
    }
  }

  //Public methods
  onPageChange(page)
  {
    this.curPage = page;
    this.loadMaster();
  }
    //Private methods
  loadMaster()
  {
    if (!this.config['masterUrl'])
    {
      console.warn("master url is NULL");
      return;
    }

    // Load master
    let body = {
      filter: this.config['filter'],
      ord: this.config['order'],
      rpp: this.rpp,
      cp: this.curPage
    };

    this.modelSvc.master(this.config['masterUrl'],body).subscribe(res =>
    {
      if(res)
      {
        // Update pagination info
        this.firstIndex = (this.curPage-1) * this.rpp + 1;
        this.lastIndex = this.firstIndex + this.rpp*1 - 1;

        if (this.lastIndex > this.count)
          this.lastIndex = this.count;

        var data = [];
        for (let i = 0;i < res.length;i++)
          if (this.config['entClass'])
            data.push(new this.config['entClass'](res[i]));
          else
            data.push(res[i]);

        this.pageLoaded.emit(data);
      }
      else
        this.pageLoaded.emit(null);
    });
  }
}
