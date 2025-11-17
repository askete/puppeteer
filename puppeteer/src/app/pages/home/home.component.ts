// src/app/pages/home/home.component.ts
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { PdfService, GenerateResponse } from '../../core/pdf/pdf.service';

interface TemplateMeta {
  id: string;
  title: string;
  description: string;
  showAsegurado: boolean;
  showNombre: boolean;
  showFecha: boolean;
  showGastos: boolean;
}

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  constructor(public auth: AuthService, private pdf: PdfService) { }

  // 🔹 ahora empezamos con array vacío; nada hardcodeado
  templates: TemplateMeta[] = [];

  selectedTemplate?: TemplateMeta | null = null;

  plantilla: string | null = null;
  asegurado = 'Juan_Perez_12345';
  nombreCompletoRazonSocial = 'JUAN PÉREZ S.A.';
  fecha = new Date().toISOString().slice(0, 10);

  gastos: Array<{ descripcion: string; presentado: string; elegible: string }> =
    [{ descripcion: '', presentado: '', elegible: '' }];

  loading = false;
  errorMsg = '';
  result: GenerateResponse | null = null;
  private currentUserId: string | null = null;

  ngOnInit(): void {
  this.auth.user$.subscribe(user => {
    console.log('user$ en home:', user); // 👈

    if (!user) {
      this.currentUserId = null;
      this.templates = [];
      this.selectedTemplate = null;
      this.plantilla = null;
      return;
    }

    this.currentUserId = user.uid;
    console.log('Cargando plantillas para userId:', user.uid); // 👈

    this.pdf.getTemplatesForUser(user.uid).subscribe({
      next: (templates) => {
        console.log('Respuesta getTemplatesForUser:', templates); // 👈
        this.templates = templates.map((t: any) => this.toTemplateMeta(t));

        if (this.templates.length) {
          this.selectTemplate(this.templates[0]);
        }
      },
      error: (err) => {
        console.error('Error cargando plantillas', err); // 👈
        this.errorMsg = 'Error cargando plantillas del usuario.';
      }
    });
  });
}



  // Mapea lo que devuelve la API a lo que necesita el front
  private toTemplateMeta(t: any): TemplateMeta {
  if (t.id === 'prueba' && !t.description) {
    return {
      id: t.id,
      title: t.title || 'Liquidación de gastos médicos',
      description:
        'Genera una hoja de liquidación con detalle de gastos presentados y elegibles.',
      showAsegurado: true,
      showNombre: true,
      showFecha: true,
      showGastos: true
    };
  }

  if (t.id === 'carta_simple' && !t.description) {
    return {
      id: t.id,
      title: t.title || 'Carta simple al asegurado',
      description:
        'Carta genérica sin detalle de gastos, solo datos básicos del asegurado.',
      showAsegurado: true,
      showNombre: true,
      showFecha: true,
      showGastos: false
    };
  }

  // genérico para plantillas nuevas
  return {
    id: t.id,
    title: t.title || t.id,
    description:
      t.description || 'Plantilla personalizada de este usuario.',
    showAsegurado: t.showAsegurado ?? true,
    showNombre: t.showNombre ?? true,
    showFecha: t.showFecha ?? true,
    showGastos: t.showGastos ?? false
  };
}



  selectTemplate(t: TemplateMeta): void {
    this.selectedTemplate = t;
    this.plantilla = t.id;
    this.errorMsg = '';
    this.result = null;
  }

  addGasto(): void {
    this.gastos.push({ descripcion: '', presentado: '', elegible: '' });
  }

  removeGasto(i: number): void {
    this.gastos.splice(i, 1);
  }

  generar(): void {
    if (!this.plantilla) {
      this.errorMsg = 'Debes seleccionar una plantilla.';
      return;
    }

    const user = this.auth.currentUser;
    if (!user) {
      this.errorMsg = 'No hay usuario autenticado. Vuelve a iniciar sesión.';
      return;
    }

    this.loading = true;
    this.errorMsg = '';
    this.result = null;

    this.pdf
      .generate({
        plantilla: this.plantilla,
        asegurado: this.asegurado,
        nombreCompletoRazonSocial: this.nombreCompletoRazonSocial,
        fecha: this.fecha,
        gastos: this.gastos,
        userId: user.uid
      })
      .subscribe({
        next: (res) => {
          this.result = res;
          this.loading = false;
        },
        error: (err) => {
          this.errorMsg =
            err?.message ||
            err?.error?.message ||
            'Error al generar el documento';
          this.loading = false;
        }
      });
  }
}
