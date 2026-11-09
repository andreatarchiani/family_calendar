import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';
import { map } from 'rxjs';

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(Auth);
  const router = inject(Router);

  return authService.authState.pipe(
    map(user => {
      if (user?.emailVerified) {
        return true;
      }
      return router.createUrlTree(['/login'], {
        queryParams: {
          returnUrl: state.url,
          ...(user ? { verify: 'pending' } : {})
        }
      });
    })
  );
};
