// src/app/core/guards/auth.guard.ts
import { Injectable, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { map, take, tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private auth: Auth,
    private router: Router,
    private injector: EnvironmentInjector
  ) {}

  canActivate(): Observable<boolean> {
    const user$ = runInInjectionContext(this.injector, () => authState(this.auth));
    return user$.pipe(
      take(1),
      map(user => !!user),
      tap(ok => { if (!ok) this.router.navigate(['/login']); })
    );
  }
}
