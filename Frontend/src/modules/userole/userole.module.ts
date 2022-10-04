import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserComponent } from './user/user.component';
import { RoleComponent } from './role/role.component';
import { LoggedUserComponent } from './logged-user/logged-user.component';
import { CoreModule } from '../core/core.module';

@NgModule({
  imports: [FormsModule,CommonModule,CoreModule],
  declarations: [
    UserComponent,
    RoleComponent,
    LoggedUserComponent],
  exports: [
    UserComponent,
    RoleComponent,
    LoggedUserComponent],
  bootstrap: [
    UserComponent,
    RoleComponent,
    LoggedUserComponent]
})

export class UseroleModule {}
