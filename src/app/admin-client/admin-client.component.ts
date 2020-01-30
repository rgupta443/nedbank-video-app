import { Component, OnInit } from '@angular/core';
import { ConnectionService } from '../connection.service';
import { Subscription } from 'rxjs';

@Component({
   selector: 'app-admin-client',
   templateUrl: './admin-client.component.html',
   styleUrls: ['./admin-client.component.css']
})
export class AdminClientComponent implements OnInit {
   connection = null;
   subscription: Subscription;
   myPeerConnection = null;
   adminID = 0;
   connectionStatusText = '';
   callLogs = [];
   userList = [];
   updatedList = [];

   constructor(private connectionService: ConnectionService) { }

   ngOnInit() {
      this.connection = this.connectionService.connectToServer();

      this.connection.onmessage = (evt) => {
         console.log(evt);
         const msg = JSON.parse(evt.data);
         if (msg.users) {
            msg.users = msg.users.filter((el) => {
               return el !== null;
            });
         }
         switch (msg.type) {
            case 'userlist':      // Received an updated user list
               this.userList = msg.users;
               console.log(this.userList);
               break;

            case 'video-answer':
               this.callLogs.push({
                  caller: msg.target,
                  callee: msg.name,
                  date: new Date().toLocaleString(),
                  type: ' connected to',
                  status: 'busy'
               });
               break;

            case 'hang-up':
               this.callLogs.push({
                  caller: msg.name,
                  callee: msg.disconnectedTarget,
                  date: new Date().toLocaleString(),
                  type: ' disconnected with',
                  status: 'free'
               });
               break;
         }

         // this.userList.forEach((elem, idx) => {
         //    if (this.updatedList[idx].name !== idx) {
         //       this.updatedList.push({
         //          name: elem,
         //          status: ''
         //       });
         //    }
         // });

         console.log(this.updatedList);
      };
   }

}
