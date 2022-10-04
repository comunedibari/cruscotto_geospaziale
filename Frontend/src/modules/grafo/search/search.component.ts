import { Component,OnInit,Output } from '@angular/core';
import { ViewChild,EventEmitter } from '@angular/core';
import { Subject,Observable } from 'rxjs';
import { debounceTime,switchMap,tap } from 'rxjs/operators';

import { ModelService } from '../../core/model.service';
import { FormComponent } from '../../core/form/form.component';
import { WebgisService } from '../../webgis/webgis.service';
import { ContextService } from '../../core/context.service';

import { Via } from '../entity/via';
import { Arco } from '../entity/arco';
import { Nodo } from '../entity/nodo';
import { Civico } from '../entity/civico';
import { Edificio } from '../entity/edificio';

@Component({
  selector: 'grafo-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})

export class SearchComponent implements OnInit
{
  @Output() selResult = new EventEmitter<any>();

  /* Quick search */
  qsOpt = [];
  loadQsOpt = new Subject<object>();
  qsLoading = false;

  /* Advanced search */
  advSearch = null;
  advResults = null;
  panCollapsed = false;
  @ViewChild(FormComponent) asForm:FormComponent;

  viaFormCfg =
  {
    id: "viaForm",fg:
    [
      {
        id: "genVia",
        rows:
        [
          [
            {
              key: "cod_via",
              type: "number",
              label: "Codice",
              width: 12
            },
            {
              key: "denominazione",
              type: "text",
              label: "Descrizione",
              width: 12
            }
          ]
        ]
      }
    ]
  };

  arcFormCfg =
  {
    id: "arcForm",fg:
    [
      {
        id: "genArc",
        rows:
        [
          [
            {
              key: "cod_arco",
              type: "number",
              label: "Codice arco",
              width: 12
            }
          ],
          [
            {
              key: "cod_via",
              type: "number",
              label: "Codice via",
              width: 12
            }
          ]
        ]
      }
    ]
  };

  nodFormCfg =
  {
    id:"nodForm", fg:
    [
      {
        id:0, rows:
        [
          [
            {
              key: "id",
              type: "number",
              label: "Codice",
              width: 12,
              required: true
            }
          ]
        ]
      }
    ]
  };

  civFormCfg =
  {
    id: "civForm",fg:
    [
      {
        id:"genCiv", rows:
        [
          [
            {
              key: "id",
              type: "number",
              label: "Codice",
              width: 12,
              required: false
            }
          ],
          [
            {
              key: "nome_via",
              type: "text",
              label: "Nome via",
              width: 8,
              required: false
            },
            {
              key: "numero",
              type: "number",
              label: "Numero",
              width: 2,
              required: false
            },
            {
              key: "esponente",
              type: "text",
              label: "Esponente",
              width: 2,
              uppercase: true,
              required: false
            }
          ]
        ]
      }
    ]
  };

  ediFormCfg =
  {
    id: "ediForm",fg:
    [
      {
        id: "genEdi",
        rows:
        [
          [
            {
              key: "id",
              type: "number",
              label: "Codice",
              width: 12,
              required: false
            }
          ],
          [
            {
              key: "sezione",
              type: "text",
              label: "Sezione",
              width: 4,
              required: false
            },
            {
              key: "foglio",
              type: "text",
              label: "Foglio",
              width: 4,
              required: false
            },
            {
              key: "numero",
              type: "text",
              label: "Particella",
              width: 4,
              required: false
            }
          ]
        ]
      }
    ]
  };

  /*
   * Class methods
   */
  constructor(
    private modelSvc:ModelService,
    private webgisSvc:WebgisService,
    private contextSvc:ContextService
  ) {}

  ngOnInit()
  {
    this.loadQsOpt
      .pipe
      (
        debounceTime(500),
        tap(() => this.qsLoading = true),
        switchMap(term => this.reloadQsOpt(term))
      )
      .subscribe(res =>
      {
        this.qsOpt = res || [];
        this.qsLoading = false;
      });
  }

  qsChange(obj)
  {
    if (obj)
    {
      var entity = obj.numero ? new Civico(obj,2) : new Via(obj,2);
      var bbox = entity.getBBox();

      //if (bbox)
        //this.webgisSvc.zoomToBBox(bbox,32633);

      this.selResult.emit(entity);
    }
  }

  setAdvSearch(val,mode)
  {
    this.advSearch = null;
    this.advResults = null;

    setTimeout(() =>
    {
      switch (val)
      {
        case 1:
          this.advSearch = {
            title: "via",
            entity: Via,
            formCfg: this.viaFormCfg
          };
          break;
        case 2:
          this.advSearch = {
            title: "arco",
            entity: Arco,
            formCfg: this.arcFormCfg
          };
          break;
        case 3:
          this.advSearch = {
            title: "civico",
            entity: Civico,
            formCfg: this.civFormCfg
          };
          break;
        case 4:
          this.advSearch = {
            title: "edificio",
            entity: Edificio,
            formCfg: this.ediFormCfg
          };
          break;
        case 5:
          this.advSearch = {
            title: "nodo",
            entity: Nodo,
            formCfg: this.nodFormCfg
          };
          break;
      }

      /* Set entity mode */
      if (this.advSearch)
        this.advSearch.mode = mode;

      /* Show panel */
      this.panCollapsed = false;
    },10);
  }

  search()
  {
    if (!this.asForm.isValid())
      return;

    /* Get url and body */
    var entity = this.advSearch.entity;

    let url = "/"+entity.getName()+"/master",
      body = entity.getSearchOpt(this.asForm.getChangedObj());

    if (!body) return;

    /* Load master */
    this.modelSvc.master(url,body).subscribe(res =>
    {
      this.advResults = [];

      if (res)
      {
        for (let j = 0;j <res.length;j++)
          this.advResults.push(new entity(res[j],this.advSearch.mode));
      }
    });
  }

  onResult(entity)
  {
    this.selResult.emit(entity);
  }

  /*
   * Check if entity is ceased and return a label (null otherwise)
   */
  ceasedLabel(obj:any):string
  {
    if (obj.data_fine && obj.data_fine < new Date().getTime())
      return "(CESSATO)";

    return null;
  }

  /*
   * Method that return civico label in the format
   * <numero>/<esponente> <estensione>
   */
  civicoFormattedLabel(obj:Civico):string
  {
    let label = obj.nome_via + ", " + obj.numero;

    if (obj.esponente)
      label += "/" + obj.esponente;

    if (obj.estensione)
      label += " " + obj.estensione;

    return label;
  }

  /*
   * Methods to get località and municipio description
   */
  locMunDescr(entity)
  {
    switch (this.advSearch.entity.getName())
    {
      case "via":
        return this.viaLocMunDescr(entity);
      case "civico":
        return (entity.localita || "") + " - " + (entity.municipio || "");
      default:
        return null;
    }
  }

  viaLocMunDescr(obj)
  {
    let descr = "";

    if (obj.localita)
    {
      descr += obj.localita.map((val) =>
      {
        return this.contextSvc.getContextObj("localita",val).name;
      }).join();
    }

    if (obj.localita || obj.municipio)
      descr += " - ";

    if (obj.municipio)
    {
      descr += obj.municipio.map((val) =>
      {
        return this.contextSvc.getContextObj("municipio",val).name;
      }).join();
    }

    return descr || null;
  }

  /*
   * Private methods
   */
  private reloadQsOpt(term):Observable<object[]>
  {
    if (!term)
      return new Observable(observer => {observer.next(null);});

    /* Look for civic presence */
    let aTerm = term.split(",");
    let civic = aTerm.length >= 2 ? aTerm[1].trim() : null;

    /* Load from server */
    let url = "/via/master";
    let body = {
      ord: "denominazione|ASC",
      filter: "denominazione|ILIKE|%"+aTerm[0]+"%"
    };

    if (civic && !isNaN(civic))
    {
      url = "/civico/master";
      body.ord = "nome_via|ASC;numero|ASC;esponente|ASC";
      body.filter = "nome_via|ILIKE|%"+aTerm[0]+"%;numero|EQ|"+aTerm[1];
    }

    return this.modelSvc.master(url,body);
  }
}
