import { SocketService } from './../../service/socket.service';
import { Component, Input, inject } from '@angular/core';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-calling',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calling.component.html',
  styleUrls: ['./calling.component.scss']
})
export class CallingComponent {
  callStarted: boolean = false;
  localStream: MediaStream | null = null;
  peerConnections: Map<string, RTCPeerConnection> = new Map(); // Track peer connections per participant
  remoteStreams: Map<string, MediaStream> = new Map(); // Track media streams per participant
  socketService = inject(SocketService);
  anyoneJoined!:boolean;
  isAudioCall: boolean = true;

  @Input() roomId: string = '';

  ngOnInit(): void {
    // Socket listeners for signaling
    this.socketService.listenForOffer().subscribe((data: any) => {
      if (data.offer && data.from) { // Check if both offer and from are present
        this.promptJoinCall(data.offer, data.from);
      } else {
        console.error('Invalid offer data received:', data);
      }
    });

    this.socketService.listenForAnswer().subscribe((data: any) => {
      this.handleAnswer(data.answer, data.from); // Handle answer with `from`
    });

    this.socketService.listenForIceCandidate().subscribe((data: any) => {
      this.handleIceCandidate(data.candidate, data.from); // Handle ICE candidate with `from`
    });

    this.socketService.callListen().subscribe((data: any) => {
      if (data.action === 'started') {
        this.anyoneJoined = false;
      }
      if (data.action === 'joined') {
        this.anyoneJoined = true;
      }
    });
  }

  // Prompt user to join the incoming call
  promptJoinCall(offer: RTCSessionDescriptionInit, from: string) {
    const userConfirmed = confirm('Incoming Call: Do you want to join the video call?');

    if (userConfirmed) {
      this.acceptCall(offer, from);
    } else {
      this.socketService.callEnd({ roomId: this.roomId, email: localStorage.getItem('email') }); // Notify server of decline
      alert('Call Declined: You declined the call.');
    }

    // Swal.fire({
    //   title: 'Incoming Call',
    //   text: 'Do you want to join the video call?',
    //   icon: 'info',
    //   showCancelButton: true,
    //   confirmButtonText: 'Join',
    //   cancelButtonText: 'Decline',
    // }).then((result) => {
    //   console.log(result);
    //   if (result.isConfirmed) {
    //     this.acceptCall(offer, from); // Accept the call
    //   } else {
    //     this.socketService.callEnd({ roomId: this.roomId, email: localStorage.getItem('email') }); // Notify server of decline
    //     Swal.fire('Call Declined', 'You declined the call.', 'info');
    //   }
    // });
  }
  
  // Accept the incoming call and set up peer connection
  acceptCall(offer: RTCSessionDescriptionInit, from: string) {
    navigator.mediaDevices
      .getUserMedia({ audio: true }) // Adjust to { audio: true } for audio-only calls
      .then((stream) => {
        this.localStream = stream;
  
        // Handle peer connection creation with the `from` parameter
        this.createPeerConnection(from); 
  
        const peerConnection = this.peerConnections.get(from); 
        if (!peerConnection) {
          Swal.fire('Error', 'Failed to create peer connection', 'error');
          return;
        }
  
        // Add local media tracks to the connection
        this.localStream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, this.localStream!);
        });
  
        // Set the remote description and create an answer
        peerConnection
          .setRemoteDescription(new RTCSessionDescription(offer))
          .then(() => peerConnection.createAnswer())
          .then((answer) => peerConnection.setLocalDescription(answer))
          .then(() => {
            // Send the answer back to the initiator
            this.socketService.sendAnswer(peerConnection.localDescription, this.roomId, from); 
          })
          .catch((error) => {
            Swal.fire('Error', 'Error handling the call: ' + error.message, 'error');
          });
  
        const email = localStorage.getItem('email');
        this.socketService.callJoin({ roomId: this.roomId, email });
  
        this.callStarted = true;
      })
      .catch((error) => {
        Swal.fire('Media Access Denied', 'You need to allow media access to join the call', 'error');
      });
  }

  // Create peer connections for all participants before broadcasting the offer
  createPeerConnectionsForParticipants() {
    const participants = this.getParticipants(); // Get participants

    participants.forEach((participantId) => {
      if (!this.peerConnections.has(participantId)) {
        this.createPeerConnection(participantId);
      }
    });
  }

  // Broadcast offer to all participants
  broadcastOffer() {
    // Ensure peer connections are created for all participants
    if (this.peerConnections.size === 0) {
      this.createPeerConnectionsForParticipants();
    }

    this.peerConnections.forEach((peerConnection, participantId) => {
      peerConnection.createOffer().then((offer) => {
        return peerConnection.setLocalDescription(offer);
      }).then(() => {
        this.socketService.sendOffer(peerConnection.localDescription, this.roomId, participantId);
      }).catch((error) => {
        console.error("Error creating or sending offer:", error);
      });
    });
  }

  // Get participants (dummy implementation, replace with actual logic)
  getParticipants() {
    // Example participant IDs, replace this with your own logic
    return ['participant1', 'participant2'];
  }

  // Create peer connection for a participant
  createPeerConnection(participantId: string) {
    const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    const peerConnection = new RTCPeerConnection(configuration);

    this.localStream?.getTracks().forEach((track) => {
      peerConnection.addTrack(track, this.localStream!);
    });

    peerConnection.ontrack = (event) => {
      this.remoteStreams.set(participantId, event.streams[0]);
      this.attachMediaStreams(participantId);
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socketService.sendIceCandidate(event.candidate, this.roomId, participantId);
      }
    };

    this.peerConnections.set(participantId, peerConnection);
    console.log(`Peer connection created for participant: ${participantId}`);
  }

  // Handle incoming answer
  handleAnswer(answer: RTCSessionDescriptionInit, from: string) {
    const peerConnection = this.peerConnections.get(from);
    peerConnection?.setRemoteDescription(new RTCSessionDescription(answer))
      .catch((error) => console.error('Error setting remote description for answer:', error));
  }

  // Handle incoming ICE candidates
  handleIceCandidate(candidate: RTCIceCandidateInit, from: string) {
    const peerConnection = this.peerConnections.get(from);
    peerConnection?.addIceCandidate(new RTCIceCandidate(candidate))
      .catch((error) => console.error('Error adding ICE candidate:', error));
  }

  // Attach media streams to the video elements
  attachMediaStreams(participantId: string) {
    const remoteVideo = document.getElementById(`remoteVideo-${participantId}`) as HTMLVideoElement;
    const remoteStream = this.remoteStreams.get(participantId);

    if (remoteStream) {
      remoteVideo.srcObject = remoteStream;
    }
  }

  // Start a video call
  startVideoCall() {
    Swal.fire({
      title: 'Start Video Call?',
      text: 'Do you want to initiate a video call?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Start!',
      cancelButtonText: 'No',
    }).then((result) => {
      if (result.isConfirmed) {
        navigator.mediaDevices
          .getUserMedia({ video: true, audio: true })
          .then((stream) => {
            const email = localStorage.getItem('email');
            this.localStream = stream;
            this.broadcastOffer();
            this.callStarted = true;
            this.isAudioCall = false;
          })
          .catch((error) => {
            Swal.fire('Error', 'Error accessing media devices.', 'error');
          });
      }
    });
  }

  // Start an audio call
  startAudioCall() {
    Swal.fire({
      title: 'Start Audio Call?',
      text: 'Do you want to initiate an audio call?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Start!',
      cancelButtonText: 'No',
    }).then((result) => {
      if (result.isConfirmed) {
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((stream) => {
            this.localStream = stream;
            this.broadcastOffer();
            this.callStarted = true;
            this.isAudioCall = true;
          })
          .catch((error) => {
            Swal.fire('Error', 'Error accessing media devices.', 'error');
          });
      }
    });
  }

  // End the call and clean up resources
  stopCall() {
    this.peerConnections.forEach((peerConnection) => {
      peerConnection.close();
    });
    this.peerConnections.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    const email = localStorage.getItem('email');
    this.socketService.callEnd({ roomId: this.roomId, email });

    this.isAudioCall = true;
    this.callStarted = false;
    this.anyoneJoined = false;
  }
}
