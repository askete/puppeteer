// src/app/core/auth/auth.service.ts
import { Injectable, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, GoogleAuthProvider, signInWithPopup, signOut, authState, User } from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user$: Observable<User | null>;

  constructor(
    private auth: Auth,
    private router: Router,
    private injector: EnvironmentInjector
  ) {
    // 👇 crea authState dentro de un injection context
    this.user$ = runInInjectionContext(this.injector, () => authState(this.auth));
  }

  async googleSignIn(): Promise<void> {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(this.auth, provider);
    await this.router.navigateByUrl('/');
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    await this.router.navigateByUrl('/login');
  }
}
