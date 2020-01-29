import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { ChatClientComponent } from './chat-client/chat-client.component';
import { AppRoutingModule } from './app-routing/app-routing.module';
import { AdminClientComponent } from './admin-client/admin-client.component';

@NgModule({
  declarations: [
    AppComponent,
    ChatClientComponent,
    AdminClientComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
