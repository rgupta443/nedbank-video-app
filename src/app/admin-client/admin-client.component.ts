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
   isDisconnected = false;

   constructor(private connectionService: ConnectionService) { }

   ngOnInit() {
      this.connection = this.connectionService.connectToServer();

      this.connection.onmessage = (evt) => {
         const msg = JSON.parse(evt.data);
         if (msg.users) {
            msg.users = msg.users.filter((el) => {
               return el !== null;
            });
         }
         switch (msg.type) {
            case 'userlist':      // Received an updated user list
               this.userList = msg.users;
               this.isDisconnected = false;
               break;

            case 'video-answer':
               this.callLogs.push({
                  caller: msg.target,
                  callee: msg.name,
                  date: new Date().toLocaleString(),
                  type: ' connected to',
                  status: 'busy'
               });
               this.isDisconnected = true;
               this.updatedList.forEach((val, idx) => {
                  if (val.name === msg.name) {
                     this.updatedList[idx].status = 'busy';
                  }
                  if (val.name === msg.disconnectedTarget) {
                     this.updatedList[idx].status = 'busy';
                  }
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
               this.isDisconnected = true;
               this.updatedList.forEach((val, idx) => {
                  console.log(val);
                  if (val.name === msg.name) {
                     console.log('ere');
                     this.updatedList[idx].status = 'free';
                  }
                  if (val.name === msg.disconnectedTarget) {
                     this.updatedList[idx].status = 'free';
                  }
               });
               break;
         }

         if (!this.isDisconnected) {
            this.updatedList = [];
            this.userList.forEach(val => {
               this.updatedList.push({
                  name: val,
                  status: 'free'
               });
            });
         }
      };
   }

}
