import { Component, OnInit, ViewChild, ElementRef, Renderer2, AfterViewInit } from '@angular/core';
import { ConnectionService } from '../connection.service';

@Component({
   selector: 'app-chat-client',
   templateUrl: './chat-client.component.html',
   styleUrls: ['./chat-client.component.css']
})
export class ChatClientComponent implements OnInit {

   @ViewChild('received_video') received_video: ElementRef;
   @ViewChild('local_video') local_video: ElementRef;

   disableButton: boolean;
   myHostname = window.location.hostname;
   isLoggedIn = false;
   disableCallButton = false;
   _tempTargetUser = null;

   operator_list = [];

   mediaConstraints = {
      audio: true,
      video: {
         aspectRatio: {
            ideal: 1.333333  // aspect ratio 3:2
         }
      }
   };

   myUsername = null;
   targetUsername = null;      // To store username of other peer
   myPeerConnection = null;    // RTCPeerConnection
   transceiver = null;         // RTCRtpTransceiver
   webcamStream = null;        // MediaStream from webcam


   // WebSocket chat/signaling channel  iables.

   connection = null;
   clientID = 0;

   constructor(private renderer: Renderer2, private connectionService: ConnectionService) {
      this.createPeerConnection = this.createPeerConnection.bind(this);
      this.invite = this.invite.bind(this);
      this.handleNegotiationNeededEvent = this.handleNegotiationNeededEvent.bind(this);
      this.handleVideoOfferMsg = this.handleVideoOfferMsg.bind(this);
   }

   ngOnInit() {
      if (!this.myHostname) {
         this.myHostname = 'localhost';
      }
      console.log('Hostname: ' + this.myHostname);
      this.connect();
   }

   sendToServer(msg) {
      const msgJSON = JSON.stringify(msg);

      console.log('Sending "' + msg.type + '" message: ' + msgJSON);
      this.connection.send(msgJSON);
   }

   setUsername() {
      if (!this.isLoggedIn) {
         this.myUsername = 'Operator' + Math.random().toString(10).substring(15);
      } else {
         this.myUsername = '';
      }

      this.sendToServer({
         name: this.myUsername,
         date: Date.now(),
         id: this.clientID,
         type: 'username'
      });
   }

   // Open and configure the connection to the WebSocket server.

   connect() {
      this.connection = this.connectionService.connectToServer();

      this.connection.onerror = function (evt) {
         console.log(evt);
      };

      this.connection.onmessage = (evt) => {
         console.log(evt);
         const msg = JSON.parse(evt.data);
         let text = '';
         const time = new Date(msg.date);
         const timeStr = time.toLocaleTimeString();

         if (msg.users) {
            msg.users = msg.users.filter((el) => {
               return el !== null;
            });
            this.operator_list = msg.users;
         }

         switch (msg.type) {
            case 'id':
               this.clientID = msg.id;
               this.setUsername();
               break;

            case 'username':
               text = '<b>User <em>' + msg.name + '</em> signed in at ' + timeStr + '</b><br>';
               break;

            case 'message':
               text = '(' + timeStr + ') <b>' + msg.name + '</b>: ' + msg.text + '<br>';
               break;

            case 'rejectusername':
               this.myUsername = msg.name;
               text = '<b>Your username has been set to <em>' + this.myUsername +
                  '</em> because the name you chose is in use.</b><br>';
               break;

            // Signaling messages: these messages are used to trade WebRTC
            // signaling information during negotiations leading up to a video
            // call.

            case 'video-offer':  // Invitation and offer to chat
               this.handleVideoOfferMsg(msg);
               break;

            case 'video-answer':  // Callee has answered our offer
               this.handleVideoAnswerMsg(msg);
               break;

            case 'new-ice-candidate': // A new ICE candidate has been received
               this.handleNewICECandidateMsg(msg);
               break;

            case 'hang-up': // The other peer has hung up the call
               this.handleHangUpMsg(msg);
               break;

            // Unknown message; output to console for debugging.

            default:
               console.log('Unknown message received:');
               console.log(msg);
         }
      };
   }

   // Create the RTCPeerConnection which knows how to talk to our
   // selected STUN/TURN server and then uses getUserMedia() to find
   // our camera and microphone and add that stream to the connection for
   // use in our video call. Then we configure event handlers to get
   // needed notifications on the call.

   async createPeerConnection() {
      console.log('Setting up a connection...');
      // Create an RTCPeerConnection which knows to use our chosen
      // STUN server.

      this.myPeerConnection = this.connectionService.createRTCPeerConnection();

      // Set up event handlers for the ICE negotiation process.

      this.myPeerConnection.onicecandidate = this.handleICECandidateEvent.bind(this);
      this.myPeerConnection.oniceconnectionstatechange = this.handleICEConnectionStateChangeEvent.bind(this);
      this.myPeerConnection.onicegatheringstatechange = this.handleICEGatheringStateChangeEvent.bind(this);
      this.myPeerConnection.onsignalingstatechange = this.handleSignalingStateChangeEvent.bind(this);
      this.myPeerConnection.onnegotiationneeded = this.handleNegotiationNeededEvent.bind(this);
      this.myPeerConnection.ontrack = this.handleTrackEvent.bind(this);
   }

   // Handle the |icegatheringstatechange| event. This lets us know what the
   // ICE engine is currently working on: "new" means no networking has happened
   // yet, "gathering" means the ICE engine is currently gathering candidates,
   // and "complete" means gathering is complete. Note that the engine can
   // alternate between "gathering" and "complete" repeatedly as needs and
   // circumstances change.
   //
   // We don't need to do anything when this happens, but we log it to the
   // console so you can see what's going on when playing with the sample.

   handleICEGatheringStateChangeEvent(event) {
      console.log('*** ICE gathering state changed to: ' + this.myPeerConnection.iceGatheringState);
   }

   // Set up a |signalingstatechange| event handler. This will detect when
   // the signaling connection is closed.
   //
   // NOTE: This will actually move to the new RTCPeerConnectionState enum
   // returned in the property RTCPeerConnection.connectionState when
   // browsers catch up with the latest version of the specification!

   handleSignalingStateChangeEvent(event) {
      console.log(this);
      switch (this.myPeerConnection.signalingState) {
         case 'closed':
            this.closeVideoCall();
            break;
      }
   }

   // Handle |iceconnectionstatechange| events. This will detect
   // when the ICE connection is closed, failed, or disconnected.
   //
   // This is called when the state of the ICE agent changes.

   handleICEConnectionStateChangeEvent(event) {

      switch (this.myPeerConnection.iceConnectionState) {
         case 'closed':
         case 'failed':
         case 'disconnected':
            this.closeVideoCall();
            break;
      }
   }

   // Handles |icecandidate| events by forwarding the specified
   // ICE candidate (created by our local ICE agent) to the other
   // peer through the signaling server.

   handleICECandidateEvent(event) {
      if (event.candidate) {
         this.sendToServer({
            type: 'new-ice-candidate',
            target: this.targetUsername,
            candidate: event.candidate
         });
      }
   }

   // Called by the WebRTC layer when events occur on the media tracks
   // on our WebRTC call. This includes when streams are added to and
   // removed from the call.
   //
   // track events include the following fields:
   //
   // RTCRtpReceiver       receiver
   // MediaStreamTrack     track
   // MediaStream[]        streams
   // RTCRtpTransceiver    transceiver
   //
   // In our case, we're just taking the first stream found and attaching
   // it to the <video> element for incoming media.

   handleTrackEvent(event) {
      console.log('Track event');
      this.renderer.setProperty(this.received_video.nativeElement, 'srcObject', event.streams[0]);
      // document.getElementById("hangup-button").disabled = false;
   }

   // Called by the WebRTC layer to let us know when it's time to
   // begin, resume, or restart ICE negotiation.

   async handleNegotiationNeededEvent() {
      console.log('*** Negotiation needed');

      try {
         console.log('Creating offer');
         const offer = await this.myPeerConnection.createOffer();

         // If the connection hasn't yet achieved the "stable" state,
         // return to the caller. Another negotiationneeded event
         // will be fired when the state stabilizes.

         if (this.myPeerConnection.signalingState !== 'stable') {
            console.log(`The connection isn't stable yet; postponing...`)
            return;
         }

         // Establish the offer as the local peer's current
         // description.

         console.log('Setting local description to the offer');
         await this.myPeerConnection.setLocalDescription(offer);

         // Send the offer to the remote peer.

         console.log('Sending the offer to the remote peer');
         this.sendToServer({
            name: this.myUsername,
            target: this.targetUsername,
            type: 'video-offer',
            sdp: this.myPeerConnection.localDescription
         });
      } catch (err) {
         console.log(err);
      }
   }

   callOperator() {
      let filteredArray = this.getFreeUsers(this.operator_list, this.myUsername);
      if (this.targetUsername) {
         filteredArray = this.getFreeUsers(this.operator_list, this.targetUsername);
      }
      const randomUser = this.selectRandomUser(filteredArray);
      this.invite(randomUser);
   }

   getFreeUsers(userArray, elem) {
      const _onlyOperator = new RegExp(/^Operator.*$/);
      return userArray.filter(e => e !== elem && _onlyOperator.test(e) );
   }

   selectRandomUser(userArray) {
      return userArray[Math.floor(Math.random() * this.operator_list.length)];
   }

   // Close the RTCPeerConnection and reset variables so that the user can
   // make or receive another call if they wish. This is called both
   // when the user hangs up, the other user hangs up, or if a connection
   // failure is detected.

   closeVideoCall() {
      console.log('Closing the call');

      // Close the RTCPeerConnection
      if (this.myPeerConnection) {
         console.log('--> Closing the peer connection');

         // Disconnect all our event listeners; we don't want stray events
         // to interfere with the hangup while it's ongoing.

         this.myPeerConnection.ontrack = null;
         this.myPeerConnection.onnicecandidate = null;
         this.myPeerConnection.oniceconnectionstatechange = null;
         this.myPeerConnection.onsignalingstatechange = null;
         this.myPeerConnection.onicegatheringstatechange = null;
         this.myPeerConnection.onnotificationneeded = null;

         // Stop all transceivers on the connection

         // this.myPeerConnection.getTransceivers().forEach(transceiver => {
         //    transceiver.stop();
         // });

         // Stop the webcam preview as well by pausing the <video>
         // element, then stopping each of the getUserMedia() tracks
         // on it.

         if (this.local_video.nativeElement.srcObject) {
            this.local_video.nativeElement.pause();
            this.local_video.nativeElement.srcObject.getTracks().forEach(track => {
               track.stop();
            });
         }

         // Close the peer connection

         this.myPeerConnection.close();
         this.myPeerConnection = null;
         this.webcamStream = null;
      }

      // Disable the hangup button

      // document.getElementById("hangup-button").disabled = true;
      this._tempTargetUser = this.targetUsername;
      this.targetUsername = null;
   }

   handleHangUpMsg(msg) {
      this.closeVideoCall();
   }

   hangUpCall() {
      this.closeVideoCall();
      this.disableCallButton = false;
      this.sendToServer({
         name: this.myUsername,
         target: this.targetUsername,
         disconnectedTarget: this._tempTargetUser,
         type: 'hang-up'
      });
   }

   async invite(evt) {
      console.log('Starting to prepare an invitation');
      this.disableCallButton = true;
      if (this.myPeerConnection) {
         alert(`You can't start a call because you already have one open!`);
      } else {
         const _username = evt; // evt.target.textContent;

         // Record the username being called for future reference

         this.targetUsername = _username;
         console.log('Inviting user ' + this.targetUsername);

         // Call createPeerConnection() to create the RTCPeerConnection.
         // When this returns, myPeerConnection is our RTCPeerConnection
         // and webcamStream is a stream coming from the camera. They are
         // not linked together in any way yet.

         console.log('Setting up connection to invite user: ' + this.targetUsername);
         console.log(this);
         this.createPeerConnection();

         // Get access to the webcam stream and attach it to the
         // "preview" box (id "local_video").

         try {
            this.webcamStream = await navigator.mediaDevices.getUserMedia(this.mediaConstraints);
            if (!!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
               this.renderer.setProperty(this.local_video.nativeElement, 'srcObject', this.webcamStream);
               this.local_video.nativeElement.muted = true;
            }
         } catch (err) {
            console.log(err);
            return;
         }

         // Add the tracks from the stream to the RTCPeerConnection

         try {
            this.webcamStream.getTracks().forEach(
               this.transceiver = track => this.myPeerConnection.addTransceiver(track, { streams: [this.webcamStream] })
            );
         } catch (err) {
            this.handleGetUserMediaError(err);
         }
      }
   }

   handleError(error) {
      console.log('Error: ', error);
   }

   // Accept an offer to video chat. We configure our local settings,
   // create our RTCPeerConnection, get and attach our local camera
   // stream, then create and send an answer to the caller.

   async handleVideoOfferMsg(msg) {
      this.targetUsername = msg.name;

      // If we're not already connected, create an RTCPeerConnection
      // to be linked to the caller.

      console.log('Received video chat offer from ' + this.targetUsername);
      if (!this.myPeerConnection) {
         this.createPeerConnection();
      }

      // We need to set the remote description to the received SDP offer
      // so that our local WebRTC layer knows how to talk to the caller.

      const desc = new RTCSessionDescription(msg.sdp);

      // If the connection isn't stable yet, wait for it...

      if (this.myPeerConnection && this.myPeerConnection.signalingState !== 'stable') {

         // Set the local and remove descriptions for rollback; don't proceed
         // until both return.
         console.log(this.myPeerConnection);
         await Promise.all([
            this.myPeerConnection.setLocalDescription({ type: 'rollback' }),
            this.myPeerConnection.setRemoteDescription(desc)
         ]);
         return;
      } else {
         await this.myPeerConnection.setRemoteDescription(desc);
      }

      // Get the webcam stream if we don't already have it
      if (!this.webcamStream) {
         try {
            this.webcamStream = await navigator.mediaDevices.getUserMedia(this.mediaConstraints);
         } catch (err) {
            this.handleGetUserMediaError(err);
            return;
         }

         this.renderer.setProperty(this.local_video.nativeElement, 'srcObject', this.webcamStream);

         // Add the camera stream to the RTCPeerConnection
         try {
            this.webcamStream.getTracks().forEach(
               this.transceiver = track => this.myPeerConnection.addTransceiver(track, { streams: [this.webcamStream] })
            );
         } catch (err) {
            this.handleGetUserMediaError(err);
         }
      }

      console.log('Creating and sending answer to caller');

      await this.myPeerConnection.setLocalDescription(await this.myPeerConnection.createAnswer());

      this.sendToServer({
         name: this.myUsername,
         target: this.targetUsername,
         type: 'video-answer',
         sdp: this.myPeerConnection.localDescription
      });
   }

   async handleVideoAnswerMsg(msg) {
      // Configure the remote description, which is the SDP payload
      // in our "video-answer" message.
      const desc = new RTCSessionDescription(msg.sdp);
      await this.myPeerConnection.setRemoteDescription(desc).catch((e) => {
         console.log(e);
      });
   }

   // A new ICE candidate has been received from the other peer. Call
   // RTCPeerConnection.addIceCandidate() to send it along to the
   // local ICE framework.

   async handleNewICECandidateMsg(msg) {
      const candidate = new RTCIceCandidate(msg.candidate);

      try {
         await this.myPeerConnection.addIceCandidate(candidate);
      } catch (err) {
         console.log(err);
      }
   }

   // Handle errors which occur when trying to access the local media
   // hardware; that is, exceptions thrown by getUserMedia(). The two most
   // likely scenarios are that the user has no camera and/or microphone
   // or that they declined to share their equipment when prompted. If
   // they simply opted not to share their media, that's not really an
   // error, so we won't present a message in that situation.

   handleGetUserMediaError(e) {
      console.log(e);
      switch (e.name) {
         case 'NotFoundError':
            alert(`Unable to open your call because no camera and/or microphone
             "were found.`);
            break;
         case 'SecurityError':
         case 'PermissionDeniedError':
            // Do nothing; this is the same as the user canceling the call.
            break;
         default:
            alert(`Error opening your camera and/or microphone: ` + e.message);
            break;
      }

      // Make sure we shut down our end of the RTCPeerConnection so we're
      // ready to try again.
      this.closeVideoCall();
   }

}
