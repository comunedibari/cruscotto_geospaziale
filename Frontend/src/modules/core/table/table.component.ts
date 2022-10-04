import { Component, OnInit, Input, Output, EventEmitter, ViewChild} from '@angular/core';
import { ModelService } from '../model.service';
import { PaginationComponent } from '../pagination/pagination.component';
import { ToolbarComponent } from '../toolbar/toolbar.component';

@Component({
  selector: 'core-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.css']
})
export class TableComponent implements OnInit {
  @Input() config;
  @Output() selectedItem = new EventEmitter<any>();
  @Output() tableButton = new EventEmitter<any>();
  @ViewChild(PaginationComponent) pagComp: PaginationComponent;
  @ViewChild(ToolbarComponent) toolComp: ToolbarComponent;

  /*
   * Local variables
   */
  id: any;
  data: any = []; //data table
  configPag: Object = {};
  configToolbar = null;
  loading: boolean = true;
  dataPag: boolean = true;
  selItem: any;
  rowSel = null;                // Look what is the selected row
  selectionMode: string;
  editTable: boolean = false;   // Check if there is at least one editable column
  invalidDate: Object = {};
  resizeCol: boolean;
  scrollHeight: string;
  sortField: string;
  sortOrder: number = 1;
  newRow: any = null;
  initialEditRow: any = null;       // Initial object or entity to save before to edit row

  constructor(private modelSvc:ModelService) { }

  ngOnInit() {
    this.id = this.config['id'];
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
      let keys = Object.keys(this.config);
      keys.forEach(key => {
        this.configPag[key] = this.config[key];
      });
    }

    // Set default order
    if (this.config['order'])
    {
      let aOrder = this.config['order'].split("|");
      if (aOrder.length == 2)
      {
        this.sortField = aOrder[0];
        this.sortOrder = aOrder[1] == 'ASC' ? 1 : -1;
      }
    }

    // Look if there is at least one editable column
    for (let i = 0; i< this.config['columns'].length; i++)
    {
      if (this.config['columns'][i]['editable'])
      {
        this.editTable = true;
        break;
      }
    }

    // Set selectionMode
    if (!this.editTable)
      this.selectionMode = this.config['selection'] ? this.config['selection'] : 'single';
    else
      this.selectionMode = null;

    // Config toolbar
    if(this.config['toolbar'])
    {
      this.configToolbar = this.config['toolbar'];
      this.configToolbar['editTable'] = this.editTable;
      //the toolbar is associated on table component
      this.configToolbar['onComponent'] = 'table';
    }

    this.resizeCol = this.config['resizeColumns'] || false;
    //Set maxHeight if defined
    this.scrollHeight = this.config['maxHeight'] ? this.config['maxHeight']+"px" : "";
  }

  /*
   * Methods
   */
  //Public methods accessible from parent component
  reload(cfg?: Object)
  {
    this.newRow = null;

    // Reload config
    if(cfg)
    {
      let keys = Object.keys(cfg);
      keys.forEach(key => {
        this.config[key] = cfg[key];
      });

      // Pass new cfg to paginator
      this.pagComp.reloadCfg(this.config);
    }

    if(this.dataPag)
    {
      this.loading = true;
      this.pagComp.load();
    }
  }

  reset()
  {
    if(this.rowSel)
      delete this.rowSel;

    this.selItem = null;
  }

  disableToolbarButton(name, value)
  {
    this.toolComp.disableButton(name,value);
  }

  editableColumn(column)
  {
    let keys = Object.keys(column);
    keys.forEach(key => {
      this.setAttributeColumnByName(key, 'editable',column[key]);
    });
  }

  //Public methods
  tableSort(sort)
  {
    // ord == 1 ASC
    // ord == -1 DESC
    if (this.dataPag && this.pagComp)
    {
      if(sort && sort.order < 0)
        this.pagComp.setOrder(sort.field + "|DESC");
      else
        this.pagComp.setOrder(sort.field + "|ASC");
    }
    else
      this.sortDataArray(sort.field, sort.order);
  }

  colRend(data,col)
  {
    switch (col.type)
    {
      case 'object':
        let label = col.optionLabel || 'name';
        let value = col.optionValue || 'id';
        if (!Array.isArray(data))
        {
          for (let i = 0; i < col.source.length; i++)
          {
            if (col.source[i][value] == data)
              return col.source[i][label];
          }
        }
        else
        {
          let ret = "";
          for (let i = 0; i < col.source.length; i++)
          {
            let idx = data.indexOf(col.source[i][value]);
            if (idx >=0)
            {
              if (idx == data.length - 1)
                ret = ret + "" + col.source[i][label];
              else
                ret = ret + "" + col.source[i][label] + ",";
            }
          }
          return ret;
        }
        break;
      case 'bool':
        switch (data)
        {
          case true: return "Si";
          case false: return "No";
          default: return data;
        }
        break;
      case 'date':
        switch (typeof data)
        {
          case "object": return data ? data.dateString() : null;
          case "number": return new Date(data).dateString();
          default: return data;
        }
        break;
      case 'datetime':
        switch (typeof data)
        {
          case "object": return data ? data.datetimeString() : null;
          case "number": return new Date(data).datetimeString();
          default: return data;
        }
        break;
      case 'time':
        switch (typeof data)
        {
          case "object": return data ? data.timeString() : null;
          case "number": return new Date(data).timeString();
          default: return data;
        }
        break;
      case 'array':
        if (data)
          return col.charJoin ? data.join(col.charJoin) : data.join();
        break;
      default:
        return data;
        break;
    }
  }

  onBlur(value,idx?: any)
  {
    // Look if the value insert in the input mask is a Date otherwise
    // show error INVALID_DATE
    if (value && !new Date(value).isDate())
    {
      this.invalidDate[idx] = true;
      return true;
    }
    else
    {
      this.invalidDate[idx] = false;
      return false;
    }
  }

  displayButton(button)
  {
    if (!this.config['buttonsRow'])
      return true;
    else
    {
      if (this.config['buttonsRow'].indexOf(button) >= 0)
        return true;
      else
        return false;
    }
  }

  edit(row,index)
  {
    if (this.newRow)
      this.newRow = null;

    // Store row to edit
    if (this.config['entClass'])
    {
      let clone = Object.assign({}, row);
      this.initialEditRow = new this.config['entClass'](clone);
    }
    else
      this.initialEditRow = Object.assign({}, row);

    this.rowSel = index;

    this.tableButton.emit({id: this.id, op: 'E', obj:row});
  }

  close(row, index?: any)
  {
    if (index >= 0)
    {
      // close on edit
      this.rowSel = null;

      // Restore row
      if (this.config['entClass'])
      {
        let clone = Object.assign({}, this.initialEditRow);
        row = new this.config['entClass'](clone);
        this.data[index] = row;
      }
      else
      {
        row = Object.assign({}, this.initialEditRow);
        this.data[index] = row;
      }

      this.tableButton.emit({id: this.id, op: 'CE', obj:row});
    }
    else
    {
      // close on insert
      this.newRow = null;
      this.tableButton.emit({id: this.id, op: 'CI', obj:row});
    }
  }

  save(row,op)
  {
    // Emit tableButton event => send the obj
    for(let key in row)
    {
      let type = this.getAttributeColumnByName(key,'type')
      if (type == 'datetime' || type == 'date' || type == 'time')
      {
        if (!new Date(row[key]).isDate())
          return;
        else
          row[key] = new Date(row[key]).getTime();
      }
    }

    let obj = {id: this.id, op: op, obj:row};

    this.tableButton.emit(obj);
    this.rowSel = null;
    this.newRow = null;
  }

  remove(row, index)
  {
    // Emit tableButton event => send the obj
    for(let key in row)
    {
      let type = this.getAttributeColumnByName(key,'type')
      if (type == 'datetime' || type == 'date' || type == 'time')
        row[key] = new Date(row[key]).getTime();
    }
    let obj = {id: this.id, op: 'D', obj:row}
    this.tableButton.emit(obj);
    this.newRow = null;
  }

  onRowSelect(event)
  {
    // The selectedItem event don't emitted if the table is editable
    if(!this.editTable)
      this.selectedItem.emit({
        id: this.id,
        item:this.selItem && this.selItem.length==0 ? null :this.selItem
      });
  }

  onRowUnselect(event)
  {
    // The selectedItem event don't emitted if the table is editable
    if(!this.editTable)
      this.selectedItem.emit({
        id: this.id,
        item:this.selItem && this.selItem.length==0 ? null :this.selItem
      });
  }

  // Private methods
  private sortDataArray(col,ord)
  {
    switch (this.getAttributeColumnByName(col,'type'))
    {
      case "date":
      case "time":
      case "datetime":
      case "number":
        this.data.sort(function(a,b)
        {
          return ord == 1 ? a[col]-b[col] : b[col]-a[col];
        });
        break;
      case "object":
        let source = this.getAttributeColumnByName(col,'source');
        let label = this.getAttributeColumnByName(col,'optionLabel') || 'name';
        let value = this.getAttributeColumnByName(col,'optionValue') || 'id';
        this.data.sort(function(a,b)
        {
          let aVal = a[col], bVal = b[col],
            aStr = "", bStr = "";

          for (let i = 0; i < source.length;i++)
          {
            let obj = source[i];

            if (obj[value] == aVal) aStr = obj[label];
            if (obj[value] == bVal) bStr = obj[label];
          }

          return ord == 1 ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
        });
        break;
      default:
        this.data.sort(function(a,b)
        {
          var res = a[col] ? a[col].localeCompare(b[col]) : 1;

          return ord == 1 ? res : res*(-1);
        });
        break;
    }
  };

  // Retrieve an column attribute by passing name
  private getAttributeColumnByName(name,attr)
  {
    for (let z = 0; z < this.config['columns'].length; z++)
    {
      let col = this.config['columns'][z];
      if(col.key == name)
        return col[attr];
    }
  }

  private setAttributeColumnByName(name, attr, value)
  {
    for (let z = 0; z < this.config['columns'].length; z++)
    {
      if(this.config['columns'][z]['key'] == name)
      {
        this.config['columns'][z][attr] = value;
        break;
      }
    }
  }

  /*
   * Catch events
   */
  onPageLoaded(data)
  {
    this.rowSel = null;

    this.loading = false;
    if(data)
      this.data = data;
  }

  onButtonClick(click)
  {
    let keys = Object.keys(click)
    switch(keys[0])
    {
      case 'add':
        this.selItem = null;
        this.rowSel = null;

        // Look if there is already an object to edit
        if (!this.newRow)
        {
          // Add clicked
          if (this.config['entClass'])
            this.newRow = new this.config['entClass']({});
          else
            this.newRow = {};
        }

        let obj = {id: this.id, op: 'A', obj:this.newRow};
        this.tableButton.emit(obj);

        break;
      case 'del':
        this.tableButton.emit({id: this.id, op: 'D', obj:this.selItem});
        break;
      case 'upd':
        this.tableButton.emit({id: this.id, op: 'U', obj:this.selItem});
        break;
    }
  }

  onSearch(filter)
  {
    if(this.dataPag)
      this.pagComp.setFilter(filter);
  }
}
