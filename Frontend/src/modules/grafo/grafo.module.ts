import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import { CoreModule } from '../core/core.module';

import { SearchComponent } from './search/search.component';
import { DetailComponent } from './detail/detail.component';

import { LogComponent } from './log/log.component';
import { ViaComponent } from './via/via.component';
import { ArcoComponent } from './arco/arco.component';
import { NodoComponent } from './nodo/nodo.component';
import { CivicoComponent } from './civico/civico.component';
import { EdificioComponent } from './edificio/edificio.component';
import { ViaListComponent } from './via-list/via-list.component';

import { EditComponent } from './edit/edit.component';
import { ModalMessageComponent } from '../core/modal-message/modal-message.component';
import { DeleteCivicoComponent } from './delete-civico/delete-civico.component';
import { RenumberCivicoComponent } from './renumber-civico/renumber-civico.component';
import { DeleteArcoComponent } from './delete-arco/delete-arco.component';
import { InsertArcoComponent } from './insert-arco/insert-arco.component';
import { BreakArcoComponent } from './break-arco/break-arco.component';
import { MergeArcoComponent } from './merge-arco/merge-arco.component';
import { DeleteEdificioComponent } from './delete-edificio/delete-edificio.component';
import { MoveNodoComponent } from './move-nodo/move-nodo.component';
import { RenameArcoComponent } from './rename-arco/rename-arco.component';

@NgModule({
  imports: [FormsModule,CommonModule,NgbModule,NgSelectModule,CoreModule],
  exports: [
    SearchComponent,DetailComponent,LogComponent,ViaListComponent,
    EditComponent,InsertArcoComponent,RenumberCivicoComponent,
    BreakArcoComponent,MergeArcoComponent,RenameArcoComponent],
  declarations: [
    SearchComponent,DetailComponent,LogComponent,InsertArcoComponent,
    ViaComponent,ArcoComponent,NodoComponent,CivicoComponent,EdificioComponent,
    ViaListComponent,EditComponent,DeleteCivicoComponent,RenumberCivicoComponent,
    DeleteArcoComponent, BreakArcoComponent, MergeArcoComponent,
    DeleteEdificioComponent, MoveNodoComponent, RenameArcoComponent
  ],
  entryComponents:[
    ModalMessageComponent,
    DeleteCivicoComponent,
    DeleteArcoComponent,
    DeleteEdificioComponent,
    MoveNodoComponent,
    BreakArcoComponent,
    MergeArcoComponent,
    LogComponent,
    ViaListComponent
  ]
})

export class GrafoModule {}
