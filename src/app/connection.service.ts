import { Injectable } from '@angular/core';

@Injectable({
   providedIn: 'root'
})
export class ConnectionService {
   myHostname = window.location.hostname;
   connection = null;

   callerCallee = [{
      caller: '',
      callee: ''
   }];

   constructor() { }

   connectToServer() {
      let serverUrl;
      let scheme = 'ws';

      // If this is an HTTPS connection, we have to use a secure WebSocket
      // connection too, so add another "s" to the scheme.

      if (document.location.protocol === 'https:') {
         scheme += 's';
      }
      serverUrl = scheme + '://' + this.myHostname + ':6503';
      // serverUrl = 'wss://polar-crag-19352.herokuapp.com/' + ':6503';

      console.log(`Connecting to server: ${serverUrl}`);
      this.connection = new WebSocket(serverUrl, 'json');
      return this.connection;
   }

   createRTCPeerConnection() {
      return new RTCPeerConnection({
         iceServers: [     // Information about ICE servers - Use your own!
            {
               urls: 'turn:' + this.myHostname,  // A TURN server
               username: 'webrtc',
               credential: 'turnserver'
            }
         ]
      });
   }

   updateCallerCallee(callDetails) {
      this.callerCallee.push({
         caller: callDetails.myUsername,
         callee: callDetails.targetUsername
      });
   }

   getCallerCaller() {
      return this.callerCallee;
   }
}
