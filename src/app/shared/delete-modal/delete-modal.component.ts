import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Component, Input, inject } from '@angular/core';
import { ChannelsService } from '../../service/channels.service';

@Component({
  selector: 'app-delete-modal',
  standalone: true,
  imports: [],
  templateUrl: './delete-modal.component.html',
  styleUrl: './delete-modal.component.scss'
})
export class DeleteModalComponent {

  private activemodal = inject(NgbActiveModal)
  private channelService = inject(ChannelsService)

  @Input() id:any

  public delete(): void {
    this.channelService.deleteChannel(this.id).subscribe(data=>{
      this.activemodal.close('delete')
    })

  }
  public cancel(): void {
    this.activemodal.close()
  }

}
