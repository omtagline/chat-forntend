import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment.development';


@Injectable({
  providedIn: 'root'
})
export class ChannelsService {

  api=environment.API
  http=inject(HttpClient)

  getChannel(){
    return this.http.get(this.api+'/channel')
  }

  addChannel(roomId:any,name:any){
    return this.http.post(this.api+'/channel',{roomId,name})
  }

  deleteChannel(roomId:any){
    return this.http.delete(this.api+`/channel/${roomId}`)
  }

  
}
