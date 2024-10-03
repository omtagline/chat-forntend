import { Component, ElementRef, HostListener, ViewChild, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {

  private router = inject(Router)

  @ViewChild('formContainer') formContainer!: ElementRef;
  enchantedForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.enchantedForm = this.fb.group({
      mysticalName: ['', Validators.required],
      etherealEmail: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    this.createMagicParticles();
  }

  ngAfterViewInit(): void {
    this.addFloatingAnimation();
  }

  onSubmit(): void {
    if (this.enchantedForm.valid) {
      const values = this.enchantedForm.value
      localStorage.setItem("email", values.mysticalName)
      localStorage.setItem("name", values.etherealEmail)
      this.router.navigate(['/chat'])
    }
  }

  private createMagicParticles(): void {
    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (Math.random() < 0.1) {
        this.createMagicParticle(e.clientX, e.clientY);
      }
    });
  }

  private createMagicParticle(x: number, y: number): void {
    const particle = document.createElement('div');
    particle.classList.add('magic-particle');
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 2000);
  }

  private addFloatingAnimation(): void {
    if (this.formContainer && this.formContainer.nativeElement) {
      this.formContainer.nativeElement.classList.add('float-animation');
    }
  }

}
