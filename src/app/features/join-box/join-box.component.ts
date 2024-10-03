import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { Component, Input, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SocketService } from '../../service/socket.service';
import { CommonModule } from '@angular/common';
import { ChannelsService } from '../../service/channels.service';


@Component({
  selector: 'app-join-box',
  standalone: true,
  imports: [ReactiveFormsModule,CommonModule],
  templateUrl: './join-box.component.html',
  styleUrl: './join-box.component.scss'
})
export class JoinBoxComponent {

  fb = inject(FormBuilder)
  socketService = inject(SocketService)
  channelsService = inject(ChannelsService)
  NgbModal=inject(NgbActiveModal)
  
  form!: FormGroup

  @Input() email!: string; 

  ngOnInit(): void {
    this.form = this.fb.group({
      name:['',Validators.required],
      // roomId: ['', Validators.required]
    })
  }


  public get fc() : any {
    return this.form.controls 
  }
  

  join(): void {
    const val = this.form.value
    this.channelsService.addChannel(val.roomId,val.name).subscribe((data:any)=>{
      if (data.message) {

        this.NgbModal.close("ok")
      }
    })
    // this.socketService.joinroom(val.roomId,this.email)

  }

}
