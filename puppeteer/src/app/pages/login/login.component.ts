// src/app/pages/login/login.component.ts
import { Component } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
    standalone: false,

  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loading = false;
  error?: string;
  constructor(private auth: AuthService) {}
  async signInWithGoogle() {
    try {
      this.loading = true;
      await this.auth.googleSignIn();
    } catch (e: any) {
      this.error = e?.message ?? 'Error iniciando sesión';
    } finally {
      this.loading = false;
    }
  }
}
