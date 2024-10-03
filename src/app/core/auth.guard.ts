import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {

  const router = inject(Router)
// if (!localStorage.getItem('email')) {
//   // router.navigate(['/chat'])
// router.navigate([''])
// }
// else{
//   router.navigate(['/chat'])

// }
return true;





};
