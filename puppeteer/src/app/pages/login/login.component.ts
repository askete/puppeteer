// src/app/pages/login/login.component.ts
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: false, // 👈 componente NO standalone (usado en un NgModule)
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  form: FormGroup;
  isLoginMode = true; // true = login, false = registro
  loading = false;
  error?: string;

  constructor(private fb: FormBuilder, private auth: AuthService) {
    this.form = this.fb.group(
      {
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: [''],
      },
      {
        validators: (group) => this.passwordMatchValidator(group),
      }
    );
  }

  // Getter rápidos para la vista
  get email(): AbstractControl | null {
    return this.form.get('email');
  }

  get password(): AbstractControl | null {
    return this.form.get('password');
  }

  get confirmPassword(): AbstractControl | null {
    return this.form.get('confirmPassword');
  }

  setMode(login: boolean): void {
    this.isLoginMode = login;
    this.error = undefined;

    if (login) {
      // En login no exigimos confirmación
      this.confirmPassword?.clearValidators();
      this.confirmPassword?.updateValueAndValidity();
    } else {
      // En registro sí
      this.confirmPassword?.setValidators([Validators.required]);
      this.confirmPassword?.updateValueAndValidity();
    }
  }

  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    if (this.isLoginMode) {
      // Si estamos en login, no comprobamos nada de confirm
      return null;
    }

    const pwd = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;

    if (!pwd || !confirm) {
      return null;
    }

    return pwd === confirm ? null : { passwordMismatch: true };
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.value;

    try {
      this.loading = true;
      this.error = undefined;

      if (this.isLoginMode) {
        // 👉 Implementa este método en tu AuthService (Firebase signInWithEmailAndPassword)
        await this.auth.signInWithEmail(email, password);
      } else {
        // 👉 Implementa este método en tu AuthService (Firebase createUserWithEmailAndPassword)
        await this.auth.signUpWithEmail(email, password);
      }
    } catch (e: any) {
      this.error =
        e?.message ??
        (this.isLoginMode
          ? 'Error iniciando sesión. Inténtalo de nuevo.'
          : 'Error creando la cuenta. Inténtalo de nuevo.');
    } finally {
      this.loading = false;
    }
  }

  async signInWithGoogle(): Promise<void> {
    try {
      this.loading = true;
      this.error = undefined;
      await this.auth.googleSignIn();
    } catch (e: any) {
      this.error = e?.message ?? 'Error iniciando sesión con Google';
    } finally {
      this.loading = false;
    }
  }
}
