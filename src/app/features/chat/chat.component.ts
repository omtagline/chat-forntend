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
  email: any
  messages: any = []
  channels: any = []
  roomId: any
  // joinRoom() {
  //   this.socketService.joinroom("om@gmail.com", 123456)
  // }

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
    this.listenTyping()

  }


  public get currentRoom(): string {
    return this.roomId ? this.channels.find((e: any) => e.roomId == this.roomId).name : 'Select Chat'

  }

  private userJoined(username: string): void {
    Swal.fire({
      title: 'User Joined!',
      text: `${username} has joined the channel.`,
      icon: 'success',
      confirmButtonText: 'Okay'
    });
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
    let email= localStorage.getItem('email')

    if (email) {
      this.socketService.sendMessage(this.roomId, data.value)
      this.messages.push({ email: 'me', message: data.value })
      data.value = ""
    }else{
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

  listenTyping(){
    this.socketService.listenTyping().subscribe((res:any)=>{
      console.log(res);
    })
  }

  startTyping(){
    let email=localStorage.getItem('email')
    this.socketService.startTyping(email,this.roomId)
  }

}
