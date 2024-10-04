import { Component, inject } from '@angular/core';
import { SocketService } from '../../service/socket.service';
import { ChannelsService } from '../../service/channels.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { JoinBoxComponent } from '../join-box/join-box.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DeleteModalComponent } from '../../shared/delete-modal/delete-modal.component';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';



@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent {


  socketService = inject(SocketService)
  channelService = inject(ChannelsService)
  router = inject(Router)
  modal = inject(NgbModal)
  attachmentMenuVisible = false;
  localStream: MediaStream | null = null;
  remoteStream: MediaStream | null = null;
  peerConnection: RTCPeerConnection | null = null;
  callStarted!:boolean
  tempFileData: any = {}
  email: any
  messages: any = []
  channels: any = []
  roomId: any


  ngOnInit(): void {
    this.socketService.reciveMessage().subscribe((data: any) => {
      this.messages.push(data)
    })

    this.socketService.listenForUserChat().subscribe((data: any) => {
      if (data.email) {
        this.messages.push({ email: 'joined', message: data.email })
      }
    })

    this.getChannels()

    this.getFiles()

    this.socketService.listenForOffer().subscribe((data:any) => {
      console.log(data);
      this.promptJoinCall(data.offer, data.from);
    });

    this.socketService.listenForAnswer().subscribe((data:any) => {
      this.handleAnswer(data.answer, data.from);
    });

    this.socketService.listenForIceCandidate().subscribe((data:any) => {
      this.handleIceCandidate(data.candidate, data.from);
    });

  }

  promptJoinCall(offer: RTCSessionDescriptionInit, from: string) {
    Swal.fire({
      title: 'Incoming Call',
      text: 'Do you want to join the video call?',
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Join',
      cancelButtonText: 'Decline',
    }).then((result) => {
      if (result.isConfirmed) {
        this.acceptCall(offer);
      } else {
        Swal.fire('Call Declined', 'You declined the call.', 'info');
      }
    });
  }

  acceptCall(offer: RTCSessionDescriptionInit) {
    // First, request access to media (audio/video)
    navigator.mediaDevices
      .getUserMedia({audio: true })  // Adjust to { audio: true } for audio-only calls
      .then((stream) => {
        // Save the media stream
        this.localStream = stream;
  
        // Proceed to handle the peer connection
        this.peerConnection = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
  
        // Add tracks to the connection
        this.localStream.getTracks().forEach((track) => {
          this.peerConnection!.addTrack(track, this.localStream!);
        });
  
        // Handle remote stream
        this.peerConnection.ontrack = (event) => {
          this.remoteStream = event.streams[0];
          this.attachMediaStreams();
        };
  
        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            this.socketService.sendIceCandidate(event.candidate, this.roomId);
          }
        };
  
        // Set remote description and create an answer
        this.peerConnection
          .setRemoteDescription(new RTCSessionDescription(offer))
          .then(() => this.peerConnection?.createAnswer())
          .then((answer) => this.peerConnection?.setLocalDescription(answer))
          .then(() => {
            // Send the answer back to the initiator
            this.socketService.sendAnswer(this.peerConnection?.localDescription, this.roomId);
          })
          .catch((error) => {
            Swal.fire('Error', 'Error handling the call: ' + error.message, 'error');
          });
          this.callStarted=true
      })
      .catch((error) => {
        // Handle the case where the user denies media access
        Swal.fire('Media Access Denied', 'You need to allow media access to join the call', 'error');
      });
  }

  handleOffer(offer: RTCSessionDescriptionInit, from: string) {
    if (!this.peerConnection) {
      this.startCall(); // Ensure the call has started
    }

    this.peerConnection?.setRemoteDescription(new RTCSessionDescription(offer))
      .then(() => {
        // Create an answer and send it back
        return this.peerConnection?.createAnswer();
      })
      .then((answer) => {
        return this.peerConnection?.setLocalDescription(answer);
      })
      .then(() => {
        this.socketService.sendAnswer(this.peerConnection?.localDescription, this.roomId);
      })
      .catch((error) => {
        console.error('Error handling offer:', error);
      });
  }

  handleAnswer(answer: RTCSessionDescriptionInit, from: string) {
    this.peerConnection?.setRemoteDescription(new RTCSessionDescription(answer))
      .catch((error) => {
        console.error('Error setting remote description for answer:', error);
      });
  }

  handleIceCandidate(candidate: RTCIceCandidateInit, from: string) {
    this.peerConnection?.addIceCandidate(new RTCIceCandidate(candidate))
      .catch((error) => {
        console.error('Error adding received ICE candidate:', error);
      });
  }


  getFiles() {
    this.socketService.getFiles().subscribe((data: any) => {
      const { fileName, fileData, fileType, sender } = data;
      console.log(data);

      // Create the message object
      const message = {
        email: sender === this.socketService.socket.id ? 'me' : 'other', // Determine if it was sent by the current user or another
        message: fileName, // Display the file name
        fileData, // Include the Base64 data for preview
        fileType // Include the file type
      };

      // If receiving Base64 data
      if (fileData && typeof fileData === 'string' && fileData.startsWith('data:')) {
        // Use the Base64 string directly as the source for the file
        message.fileData = fileData; // This should already be a Base64 URL
      } else if (fileData && fileData._placeholder) {
        console.log('Binary data placeholder received. Expect binary message.');
       
      } else {
       
        const blob = new Blob([fileData], { type: fileType });
        const url = URL.createObjectURL(blob);
        message.fileData = url; // Assign the URL to fileData
        console.log('File URL:', url);
      }
      this.messages.push(message);
    });
  }


  public get currentRoom(): string {
    return this.roomId ? this.channels.find((e: any) => e.roomId == this.roomId).name : 'Select Chat'

  }

  toggleAttachmentMenu() {
    this.attachmentMenuVisible = !this.attachmentMenuVisible;
  }


  attachFile(fileType: string) {
    if (fileType === 'document') {
      const documentInput = document.getElementById('documentInput') as HTMLInputElement;
      documentInput.click(); // Programmatically open file input
    } else if (fileType === 'image') {
      const imageInput = document.getElementById('imageInput') as HTMLInputElement;
      imageInput.click();
    } else if (fileType === 'audio') {
      const audioInput = document.getElementById('audioInput') as HTMLInputElement;
      audioInput.click();
    }
    this.attachmentMenuVisible = false; // Close the dropdown
  }

  handleFileInput(event: Event, fileType: string) {
    const fileInput = event.target as HTMLInputElement;

    if (fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const reader = new FileReader();

      // Read the file as ArrayBuffer (binary)
      reader.readAsArrayBuffer(file);

      // When file is loaded, process the binary data
      reader.onload = () => {
        const binaryData = reader.result as ArrayBuffer;

        // console.log(`File selected for ${fileType}:`, file);
        // console.log('Binary data:', binaryData);

        // Now you can send this binary data over the socket
        this.tempFileData = {
          fileName: file.name,
          fileType: file.type,
          binaryData: binaryData,
        }

        // this.socket.emit('file-upload', { fileType, fileName: file.name, fileData: binaryData });
      };

      // Handle file reading errors
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
      };
    }
  }

  deSelectFiles() {
    this.tempFileData = {}
  }

  downloadFile(blobData: Blob, fileName: string): void {
    const fileBlob = new Blob([blobData], { type: 'image/jpeg' }); // Adjust type based on the file type
    const url = window.URL.createObjectURL(fileBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'downloaded_image.jpg';  // Use the provided file name or a default one
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  addChat(): void {
    const instance = this.modal.open(JoinBoxComponent, {
      size: 'sm',
      centered: true
    })
    instance.componentInstance.email = this.email

    instance.closed.subscribe((data: any) => {
      if (data == "ok") {
        this.getChannels()
      }
    })
  }


  getChannels(): void {
    this.channelService.getChannel().subscribe((res: any) => {
      this.channels = res.data
    })
  }

  sendMessage(data: HTMLInputElement) {
    if (!data.value) {
      return
    }
    let email = localStorage.getItem('email')
    if (email) {
      this.socketService.sendMessage(this.roomId, data.value)
      this.messages.push({ email: 'me', message: data.value })
      data.value = ""
      if (this.tempFileData.fileName) {
        const {
          fileName,
          fileType,
          binaryData
        } = this.tempFileData
        this.socketService.fileUpload(this.roomId, binaryData, fileName, fileType)
      }
    } else {
      this.router.navigate([''])
    }

  }


  joinChannel(email: any, data: any) {
    this.messages = []
    email && localStorage.setItem('email', email)
    const mail = email ? email : localStorage.getItem('email')

    if (mail) {
      this.roomId = data.roomId

      this.socketService.joinChat(mail, data.roomId)
    }
    else {
      this.router.navigate([''])
    }
  }

  delete(roomId: any) {
    const delRef = this.modal.open(DeleteModalComponent, {
      centered: true
    })


    delRef.componentInstance.id = roomId
    delRef.closed.subscribe((data: any) => {
      if (data == 'delete') {
        this.roomId = null
        this.getChannels()
      }
    })
  }

  logOut() {
    localStorage.clear()
    this.router.navigate([''])
  }


   // WebRTC Methods
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
            this.localStream = stream;
            this.startCall();
            this.callStarted=true

          })
          .catch((error) => {
            Swal.fire('Error', 'Error accessing media devices.', 'error');
            console.error('Error accessing media devices.', error);
          });
      }
    });
  }
  
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
            this.startCall();
            this.callStarted=true
          })
          .catch((error) => {
            Swal.fire('Error', 'Error accessing media devices.', 'error');
            console.error('Error accessing media devices.', error);
          });
      }
    });
  }

  startCall() {
    const configuration = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    };

    this.peerConnection = new RTCPeerConnection(configuration);

    this.localStream?.getTracks().forEach((track) => {
      if (this.localStream) {
        this.peerConnection?.addTrack(track, this.localStream);
      }
    });

    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      this.attachMediaStreams();
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socketService.sendIceCandidate(event.candidate, this.roomId);
      }
    };

    this.createOffer();
  }

  createOffer() {
    this.peerConnection
      ?.createOffer()
      .then((offer) => {
        return this.peerConnection?.setLocalDescription(offer);
      })
      .then(() => {
        this.socketService.sendOffer(this.peerConnection?.localDescription, this.roomId);
      })
      .catch((error) => {
        console.error('Error creating an offer:', error);
      });
  }

  attachMediaStreams() {
    const localVideo = document.getElementById('localVideo') as HTMLVideoElement;
    const remoteVideo = document.getElementById('remoteVideo') as HTMLVideoElement;

    if (this.localStream) {
      localVideo.srcObject = this.localStream;
    }

    if (this.remoteStream) {
      remoteVideo.srcObject = this.remoteStream;
    }
  }

  stopCall() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    const localVideo = document.getElementById('localVideo') as HTMLVideoElement;
    const remoteVideo = document.getElementById('remoteVideo') as HTMLVideoElement;
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    this.callStarted=false
  }
  
}
