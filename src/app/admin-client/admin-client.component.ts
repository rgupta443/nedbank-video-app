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
   _sskUserList = [];
   temp = [];

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
               this.temp.push({
                  caller: msg.target,
                  callee: msg.name,
                  date: new Date().toLocaleString(),
                  type: '--->',
                  status: msg.status
               });

               if (this.temp.length === 2) {
                  this.callLogs.push(this.temp[0]);
               }
               this.updatedList.forEach((val, idx) => {
                  if (val.name === msg.name) {
                     this.updatedList[idx].status = msg.status;
                  }
                  if (val.name === msg.disconnectedTarget) {
                     this.updatedList[idx].status = msg.status;
                  }
               });
               this._sskUserList.forEach((val, idx) => {
                  if (val.name === msg.name) {
                     this._sskUserList[idx].status = msg.status;
                  }
                  if (val.name === msg.disconnectedTarget) {
                     this._sskUserList[idx].status = msg.status;
                  }
               });
               this.isDisconnected = true;
               break;

            case 'hang-up':
               this.callLogs.push({
                  caller: msg.name,
                  callee: msg.disconnectedTarget,
                  date: new Date().toLocaleString(),
                  type: 'X',
                  status: 'free'
               });
               this.isDisconnected = true;
               this.updatedList.forEach((val, idx) => {
                  if (val.name === msg.name) {
                     this.updatedList[idx].status = 'free';
                  }
                  if (val.name === msg.disconnectedTarget) {
                     this.updatedList[idx].status = 'free';
                  }
               });
               this._sskUserList.forEach((val, idx) => {
                  if (val.name === msg.name) {
                     this._sskUserList[idx].status = 'free';
                  }
                  if (val.name === msg.disconnectedTarget) {
                     this._sskUserList[idx].status = 'free';
                  }
               });
               break;
         }

         if (!this.isDisconnected) {
            const _onlyOperator = new RegExp(/^Operator.*$/);
            this.updatedList = [];
            this._sskUserList = [];
            this.userList.forEach(val => {
               if (_onlyOperator.test(val)) {
                  this.updatedList.push({
                     name: val,
                     status: 'free'
                  });
               } else {
                  this._sskUserList.push({
                     name: val,
                     status: 'free'
                  });
               }
            });
         }
      };
   }

}
