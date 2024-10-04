import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io } from 'socket.io-client';
import { environment } from '../../environments/environment.development';



@Injectable({
  providedIn: 'root'
})
export class SocketService {

  socket: any
  roomId: any

  constructor() {
    this.socket = io(environment.API)

  }

  joinroom(roomId: any, email: any): void {
    // this.leaveChat(this.roomId)
    this.roomId = roomId
    localStorage.setItem('email', email)
    this.socket.emit('join-room', { roomId, email })
  }

  listenForUserRoom(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('user-joined', (data: any) => {
        observer.next(data);
      });
    });
  }

  joinChat(email: any, roomId: any) {
    this.socket.emit('join-chat', { email, roomId })
  }

  startTyping(email: any, roomId: any): void {
    this.socket.emit('typing', { email, roomId })
  }

  leaveChat(roomId: any) {
    this.socket.emit('leave-chat', { roomId })
  }

  listenForUserChat(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('user-chat', (data: any) => {
        observer.next(data);
      });
    });
  }

  listenTyping(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('user-typing', (data: any) => {
        observer.next(data);
      });
    });
  }


  fileUpload(roomId: any, fileData: any, fileName: any,fileType:any) {
    this.socket.emit('file-upload', { roomId, fileData, fileName,fileType })
  }


  getFiles(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('file-upload', (data: any) => {
        console.log(data);
        observer.next(data);
      })
    });
  }


  sendMessage(roomId: any, data: any) {
    const email = localStorage.getItem('email')
    this.socket.emit('send-message', { roomId, message: data, email })
  }

  reciveMessage(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('receive-message', (data: any) => {
        // console.log(data);
        observer.next(data)
      })
    })
  }


  sendOffer(offer: RTCSessionDescription | null, roomId: string, to: string) {
    this.socket.emit('offer', { offer, roomId, to });
  }
  
  sendAnswer(answer: RTCSessionDescription | null, roomId: string, to: string) {
    this.socket.emit('answer', { answer, roomId, to });
  }
  
  sendIceCandidate(candidate: RTCIceCandidate, roomId: string, to: string) {
    this.socket.emit('ice-candidate', { candidate, roomId, to });
  }
  


  callJoin(data:any){
    this.socket.emit('call-joined', {roomId:data.roomId,email:data.email});
  }

  callEnd(data:any){
    this.socket.emit('call-ended', {roomId:data.roomId,email:data.email});
  }

  callStart(data:any){
    this.socket.emit('call-started', {roomId:data.roomId,email:data.email});
  }

  callListen(){
    return new Observable((observer) => {
      this.socket.on('call-listen', (data: any) => {
        observer.next(data);
        })
        })
  }


  listenForOffer(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('offer', (data: any) => {
        console.log(data);
        observer.next(data)
      })
    })
  }
  
  listenForAnswer(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('answer', (data: any) => {
        // console.log(data);
        console.log(data);
        observer.next(data)
      })
    })
  }
  
  listenForIceCandidate(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('ice-candidate', (data: any) => {
        // console.log(data);
        console.log(data);
        observer.next(data)
      })
    })
  }

}
