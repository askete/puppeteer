// src/app/core/auth/auth.service.ts
import { Injectable, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import {
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  authState,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from '@angular/fire/auth';
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

  // ---------- GOOGLE ----------

  async googleSignIn(): Promise<void> {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(this.auth, provider);
    await this.router.navigateByUrl('/');
  }

  // ---------- EMAIL + PASSWORD ----------

  /**
   * Inicia sesión con email y contraseña
   */
  async signInWithEmail(email: string, password: string): Promise<void> {
    // Si hay error, lo lanzamos para que el componente lo capture
    await signInWithEmailAndPassword(this.auth, email, password);
    await this.router.navigateByUrl('/');
  }

  /**
   * Registra un nuevo usuario con email y contraseña
   */
  async signUpWithEmail(email: string, password: string): Promise<void> {
    await createUserWithEmailAndPassword(this.auth, email, password);
    // Aquí podrías enviar email de verificación si quieres
    // await sendEmailVerification(this.auth.currentUser!);
    await this.router.navigateByUrl('/');
  }

  // ---------- LOGOUT ----------

  async logout(): Promise<void> {
    await signOut(this.auth);
    await this.router.navigateByUrl('/login');
  }

  // ---------- UTILIDADES OPCIONALES ----------

  /**
   * Devuelve el usuario actual (puede ser null si no hay sesión)
   */
  get currentUser(): User | null {
    return this.auth.currentUser;
  }
}
