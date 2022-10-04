import { APP_INITIALIZER,NgModule } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule,Routes } from '@angular/router';

/* Config service */
import { ConfigService } from '../modules/core/config.service';

/* Local module */
import { CoreModule } from '../modules/core/core.module';
import { WebgisModule } from '../modules/webgis/webgis.module';
import { GistoolsModule } from '../modules/gistools/gistools.module';

import { GrafoModule } from '../modules/grafo/grafo.module';
import { UseroleModule } from '../modules/userole/userole.module';
import { DictionaryModule } from '../modules/dictionary/dictionary.module';

/* Component */
import { AppComponent } from './app.component';
import { MainResolver } from './main/main.resolver';
import { MainComponent } from './main/main.component';
import { LoginComponent } from './login/login.component';
import { NavbarComponent } from './navbar/navbar.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { LoginErrComponent } from './login-err/login-err.component';

/*
 * App routes config
 */
const appRoutes:Routes =
[
  {
    path: "login",
    component: LoginComponent
  },
  {
    path: "login-err",
    component: LoginErrComponent
  },
  {
    path: "main",
    component: MainComponent,
    resolve: {
      all: MainResolver
    }
  }
];

/*
 * App module
 */
@NgModule({
  declarations: [
    AppComponent,
    MainComponent,
    LoginComponent,
    NavbarComponent,
    SidebarComponent,
    LoginErrComponent
  ],
  imports: [
    NgbModule,
    FormsModule,
    BrowserModule,
    RouterModule.forRoot(appRoutes,{enableTracing:false}),
    CoreModule,
    WebgisModule,
    GistoolsModule,
    GrafoModule,
    UseroleModule,
    DictionaryModule
  ],
  providers: [
    ConfigService,
    {
      provide: APP_INITIALIZER,
      useFactory: (config:ConfigService) => () => config.load(),
      deps: [ConfigService], multi: true
    }
  ],
  bootstrap: [AppComponent]
})

export class AppModule {}
