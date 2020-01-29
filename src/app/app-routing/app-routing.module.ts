import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule, PreloadAllModules, Resolve } from '@angular/router';
import { AdminClientComponent } from '../admin-client/admin-client.component';
import { ChatClientComponent } from '../chat-client/chat-client.component';


export const appRoutes: Routes = [
   {
      path: '',
      children: [
         {
            path: '',
            component: ChatClientComponent
         },
         {
            path: 'admin',
            component: AdminClientComponent
         }
      ]
   }
];

@NgModule({
   declarations: [],
   imports: [
      CommonModule,
      RouterModule.forRoot(appRoutes)
   ],
   exports: [RouterModule]
})
export class AppRoutingModule { }
