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
        // Handle placeholder logic if needed
      } else {
        // Handle binary data
        const blob = new Blob([fileData], { type: fileType });
        const url = URL.createObjectURL(blob);
        message.fileData = url; // Assign the URL to fileData
        console.log('File URL:', url);
      }

      // Add the message to your messages array
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
    // Create a new Blob object if blobData is in base64 or raw format
    const fileBlob = new Blob([blobData], { type: 'image/jpeg' }); // Adjust type based on the file type

    // Create a download link
    const url = window.URL.createObjectURL(fileBlob);

    // Create an anchor element and trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'downloaded_image.jpg';  // Use the provided file name or a default one
    document.body.appendChild(a);
    a.click();

    // Clean up
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
    if (email ) {
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


}
